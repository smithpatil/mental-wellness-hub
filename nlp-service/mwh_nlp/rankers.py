"""Retrieval models: BM25, TF-IDF (uni+bigrams), SBERT, and the hybrid fusion.

All rankers expose  score(query) -> np.ndarray of shape (n_docs,)  so they are interchangeable.
Retrieval-only: the system returns existing corpus items and never generates advice text.
"""
import math
from collections import Counter

import numpy as np

from .preprocess import lemmas, ngrams


def doc_text(r: dict) -> str:
    """Text used by the lexical rankers: title (x2), description, category and tags."""
    return " ".join([r["title"], r["title"], r["description"], r["category"].replace("_", " "), " ".join(r.get("tags", []))])


def sbert_text(r: dict) -> str:
    return f"{r['title']}. {r['description']}"


class BM25:
    name = "BM25"

    def __init__(self, corpus, k1: float = 1.5, b: float = 0.75):
        self.k1, self.b = k1, b
        self.docs = [lemmas(doc_text(r)) for r in corpus]
        self.tf = [Counter(d) for d in self.docs]
        self.len = np.array([len(d) for d in self.docs], dtype=float)
        self.avgdl = self.len.mean()
        n = len(self.docs)
        df = Counter(t for d in self.tf for t in d)
        self.idf = {t: math.log(1 + (n - c + 0.5) / (c + 0.5)) for t, c in df.items()}

    def score(self, query: str) -> np.ndarray:
        q = lemmas(query)
        s = np.zeros(len(self.docs))
        for t in set(q):
            if t not in self.idf:
                continue
            for i, tf in enumerate(self.tf):
                f = tf.get(t, 0)
                if f:
                    s[i] += self.idf[t] * f * (self.k1 + 1) / (f + self.k1 * (1 - self.b + self.b * self.len[i] / self.avgdl))
        return s


class TfIdf:
    name = "TF-IDF"

    def __init__(self, corpus):
        docs = [ngrams(lemmas(doc_text(r)), 2) for r in corpus]
        n = len(docs)
        df = Counter(t for d in docs for t in set(d))
        self.vocab = {t: i for i, t in enumerate(sorted(df))}
        self.idf = np.array([math.log((1 + n) / (1 + df[t])) + 1 for t in sorted(df)])
        self.M = np.zeros((n, len(self.vocab)))
        for i, d in enumerate(docs):
            self.M[i] = self._vec(d)

    def _vec(self, toks):
        v = np.zeros(len(self.vocab))
        for t, c in Counter(toks).items():
            j = self.vocab.get(t)
            if j is not None:
                v[j] = (1 + math.log(c)) * self.idf[j]  # sublinear tf
        nrm = np.linalg.norm(v)
        return v / nrm if nrm else v

    def score(self, query: str) -> np.ndarray:
        q = self._vec(ngrams(lemmas(query), 2))
        return self.M @ q  # cosine (both L2-normalised)


class Sbert:
    name = "SBERT"
    MODEL = "sentence-transformers/all-MiniLM-L6-v2"

    def __init__(self, corpus, encoder=None):
        self.encoder = encoder or Encoder()
        self.E = self.encoder.encode([sbert_text(r) for r in corpus])  # (n, 384), L2-normalised

    def score(self, query: str, q_vec=None) -> np.ndarray:
        if q_vec is None:
            q_vec = self.encoder.encode([query])[0]
        return self.E @ q_vec


class Encoder:
    """Thin wrapper around sentence-transformers all-MiniLM-L6-v2 (384-d, L2-normalised outputs).

    No cache by default: query text must not be retained in memory by the service. The evaluation
    script enables the cache (cache=True) purely to avoid re-encoding the same benchmark queries.
    """

    def __init__(self, model_name: str = Sbert.MODEL, cache: bool = False):
        from sentence_transformers import SentenceTransformer  # imported lazily
        self.model_name = model_name
        self.model = SentenceTransformer(model_name)
        self._cache = {} if cache else None

    def encode(self, texts):
        if self._cache is None:
            return self.model.encode(list(texts), normalize_embeddings=True, show_progress_bar=False, convert_to_numpy=True)
        out, todo, idx = [None] * len(texts), [], []
        for i, t in enumerate(texts):
            if t in self._cache:
                out[i] = self._cache[t]
            else:
                todo.append(t)
                idx.append(i)
        if todo:
            emb = self.model.encode(todo, normalize_embeddings=True, show_progress_bar=False, convert_to_numpy=True)
            for i, t, e in zip(idx, todo, emb):
                self._cache[t] = e
                out[i] = e
        return np.vstack(out)


class Scaler:
    """Fixed per-ranker min-max scaling to ~[0,1] using bounds fitted on the development split.

    Per-query min-max would make max(score)=1 for every query and destroy the confidence signal that
    the low-confidence threshold tau relies on, so bounds are fixed corpus-level constants.
    """

    def __init__(self, lo: float = 0.0, hi: float = 1.0):
        self.lo, self.hi = float(lo), float(hi)

    @classmethod
    def fit(cls, score_matrix: np.ndarray, lo_q: float = 5.0, hi_q: float = 99.0):
        lo, hi = np.percentile(score_matrix, [lo_q, hi_q])
        if hi - lo < 1e-9:
            hi = lo + 1e-9
        return cls(lo, hi)

    def __call__(self, s: np.ndarray) -> np.ndarray:
        return np.maximum(0.0, (s - self.lo) / (self.hi - self.lo))

    def to_dict(self):
        return {"lo": self.lo, "hi": self.hi}


class Hybrid:
    """s_H = alpha * norm(s_SBERT) + (1 - alpha) * norm(s_TFIDF)."""

    name = "Hybrid"

    def __init__(self, sbert: Sbert, tfidf: TfIdf, alpha: float, scaler_s: Scaler, scaler_t: Scaler):
        self.sbert, self.tfidf, self.alpha = sbert, tfidf, alpha
        self.scaler_s, self.scaler_t = scaler_s, scaler_t

    def fuse(self, s_s: np.ndarray, s_t: np.ndarray) -> np.ndarray:
        return self.alpha * self.scaler_s(s_s) + (1 - self.alpha) * self.scaler_t(s_t)

    def score(self, query: str, q_vec=None) -> np.ndarray:
        return self.fuse(self.sbert.score(query, q_vec), self.tfidf.score(query))

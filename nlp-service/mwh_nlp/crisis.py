"""Two-stage crisis gate that runs BEFORE retrieval.

Stage 1: lexicon of self-harm / suicidal expressions (regular expressions).
Stage 2: semantic similarity (same encoder as SBERT) to exemplar paraphrases; flag if the maximum
         cosine similarity >= theta_c. theta_c is tuned on the development split to maximise F2.
A flagged query bypasses the recommender. The gate is a safeguard, not a diagnostic classifier.
"""
import re

import json
from pathlib import Path

import numpy as np

from .gatefeat import hashed


class CrisisGate:
    def __init__(self, lexicon, exemplars, encoder=None, theta_c: float = 0.6):
        self.patterns = [re.compile(p, re.IGNORECASE) for p in lexicon]
        self.exemplars = list(exemplars)
        self.encoder = encoder
        self.theta_c = float(theta_c)
        self.version = "v1-exemplar"
        self.E = encoder.encode(self.exemplars) if encoder is not None else None

    # --- components ----------------------------------------------------------------------
    def lexicon_hit(self, text: str) -> bool:
        t = (text or "").replace("’", "'")
        return any(p.search(t) for p in self.patterns)

    def semantic_score(self, text: str, q_vec=None) -> float:
        if self.E is None:
            return 0.0
        if q_vec is None:
            q_vec = self.encoder.encode([text])[0]
        return float(np.max(self.E @ q_vec))

    # --- decision ------------------------------------------------------------------------
    def check(self, text: str, q_vec=None) -> dict:
        lex = self.lexicon_hit(text)
        sem = self.semantic_score(text, q_vec)
        return {"flag": bool(lex or sem >= self.theta_c), "lexicon": lex, "semantic": sem}


def f_beta(tp: int, fp: int, fn: int, beta: float = 2.0) -> float:
    p = tp / (tp + fp) if tp + fp else 0.0
    r = tp / (tp + fn) if tp + fn else 0.0
    if p + r == 0:
        return 0.0
    return (1 + beta**2) * p * r / (beta**2 * p + r)


def tune_theta(sem_scores, lex_hits, labels, beta: float = 2.0):
    """Pick theta_c maximising F-beta of (lexicon OR semantic >= theta) on the dev set.

    Ties are broken towards the HIGHER threshold (fewer false diversions at equal F2).
    """
    sem_scores, lex_hits, labels = map(np.asarray, (sem_scores, lex_hits, labels))
    cands = sorted(set(np.round(sem_scores, 4)) | {1.01})
    best = (-1.0, None)
    for th in cands:
        pred = lex_hits | (sem_scores >= th)
        tp = int(np.sum(pred & (labels == 1)))
        fp = int(np.sum(pred & (labels == 0)))
        fn = int(np.sum(~pred & (labels == 1)))
        f = f_beta(tp, fp, fn, beta)
        if f > best[0] or (abs(f - best[0]) < 1e-12 and th > best[1]):
            best = (f, float(th))
    return best[1], best[0]


class LearnedGate(CrisisGate):
    """v2 gate: lexicon OR a logistic-regression classifier over [SBERT embedding | hashed n-grams].

    `semantic_score` returns the classifier probability so that the evaluation code can treat v1 and v2
    uniformly. The model is plain JSON (config/gate.json), trained by eval/gate_dev.py on development data only.
    """

    def __init__(self, lexicon, exemplars, encoder, model: dict):
        super().__init__(lexicon, exemplars, encoder, theta_c=model["theta"])
        self.coef = np.asarray(model["coef"], dtype=float)
        self.intercept = float(model["intercept"])
        self.emb_dim = int(model["emb_dim"])
        self.ngram_scale = float(model["ngram_scale"])
        self.version = "v2-learned"

    def semantic_score(self, text: str, q_vec=None) -> float:
        if q_vec is None:
            q_vec = self.encoder.encode([text])[0]
        idx, val = hashed(text, self.ngram_scale)
        z = float(self.coef[: self.emb_dim] @ q_vec) + self.intercept
        if len(idx):
            z += float(self.coef[self.emb_dim + idx] @ val)
        return 1.0 / (1.0 + np.exp(-z))


def make_gate(lexicon, exemplars, encoder, params: dict, cfg_dir: Path, version: str = "auto"):
    """Return the v2 learned gate if config/gate.json exists (or version='v2'), else the v1 exemplar gate."""
    path = Path(cfg_dir) / "gate.json"
    if version != "v1" and path.exists():
        return LearnedGate(lexicon, exemplars, encoder, json.loads(path.read_text(encoding="utf8")))
    g = CrisisGate(lexicon, exemplars, encoder, theta_c=params["theta_c"])
    g.version = "v1-exemplar"
    return g

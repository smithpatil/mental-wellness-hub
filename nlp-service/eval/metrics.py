"""Ranking metrics, bootstrap confidence intervals, paired bootstrap test, Cohen's kappa."""
import math

import numpy as np


def ranking(scores: np.ndarray) -> np.ndarray:
    """Indices sorted by descending score; ties broken by document index (stable)."""
    return np.argsort(-scores, kind="stable")


def precision_at_k(order, grades, k, rel_min=2):
    return sum(1 for i in order[:k] if grades[i] >= rel_min) / k


def reciprocal_rank(order, grades, rel_min=2):
    for r, i in enumerate(order, start=1):
        if grades[i] >= rel_min:
            return 1.0 / r
    return 0.0


def dcg(gains):
    return sum(g / math.log2(i + 2) for i, g in enumerate(gains))


def ndcg_at_k(order, grades, k):
    gains = [2 ** int(grades[i]) - 1 for i in order[:k]]
    ideal = sorted((2 ** int(g) - 1 for g in grades), reverse=True)[:k]
    d = dcg(ideal)
    return dcg(gains) / d if d > 0 else 0.0


def per_query_metrics(score_rows, grade_rows):
    """score_rows / grade_rows: lists of 1-D arrays aligned by document. Returns dict of arrays."""
    out = {"P@3": [], "P@5": [], "MRR": [], "nDCG@3": [], "nDCG@5": []}
    for s, g in zip(score_rows, grade_rows):
        o = ranking(s)
        out["P@3"].append(precision_at_k(o, g, 3))
        out["P@5"].append(precision_at_k(o, g, 5))
        out["MRR"].append(reciprocal_rank(o, g))
        out["nDCG@3"].append(ndcg_at_k(o, g, 3))
        out["nDCG@5"].append(ndcg_at_k(o, g, 5))
    return {k: np.array(v) for k, v in out.items()}


def bootstrap_ci(x, n_boot=1000, seed=13, alpha=0.05):
    x = np.asarray(x, dtype=float)
    rng = np.random.default_rng(seed)
    idx = rng.integers(0, len(x), size=(n_boot, len(x)))
    means = x[idx].mean(axis=1)
    return float(x.mean()), float(np.percentile(means, 100 * alpha / 2)), float(np.percentile(means, 100 * (1 - alpha / 2)))


def paired_bootstrap(a, b, n_boot=1000, seed=17):
    """Paired bootstrap of mean(a) - mean(b) over queries. Returns (delta, ci_lo, ci_hi, p_two_sided)."""
    a, b = np.asarray(a, float), np.asarray(b, float)
    d = a - b
    rng = np.random.default_rng(seed)
    idx = rng.integers(0, len(d), size=(n_boot, len(d)))
    boots = d[idx].mean(axis=1)
    lo, hi = np.percentile(boots, [2.5, 97.5])
    p = 2 * min(float(np.mean(boots <= 0)), float(np.mean(boots >= 0)))
    p = max(min(p, 1.0), 1.0 / (n_boot + 1))
    return float(d.mean()), float(lo), float(hi), p


def cohens_kappa(a, b):
    """Unweighted Cohen's kappa for two label sequences of equal length."""
    a, b = list(a), list(b)
    assert len(a) == len(b) and a
    labels = sorted(set(a) | set(b))
    n = len(a)
    po = sum(1 for x, y in zip(a, b) if x == y) / n
    pe = sum((a.count(l) / n) * (b.count(l) / n) for l in labels)
    return 1.0 if pe == 1 else (po - pe) / (1 - pe)


def prf(tp, fp, fn, beta=2.0):
    p = tp / (tp + fp) if tp + fp else 0.0
    r = tp / (tp + fn) if tp + fn else 0.0
    f = (1 + beta**2) * p * r / (beta**2 * p + r) if (p + r) else 0.0
    return p, r, f

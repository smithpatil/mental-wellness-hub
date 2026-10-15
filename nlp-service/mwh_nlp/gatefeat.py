"""Hashed word and character n-gram features for the learned crisis gate.

Deterministic (zlib.crc32), vocabulary-free, and implementable in a few lines of numpy at inference, so the
frozen model is plain JSON (no pickle, no scikit-learn needed at serving time).
"""
import math
import re
import zlib
from collections import Counter

import numpy as np

DIM = 1 << 14  # 16384 hashed buckets
_TOK = re.compile(r"[a-z0-9']+")


def _terms(text: str):
    t = (text or "").lower().replace("’", "'")
    words = _TOK.findall(t)
    terms = [f"w:{w}" for w in words] + [f"b:{a}_{b}" for a, b in zip(words, words[1:])]
    for w in words:
        p = f"^{w}$"
        for n in (3, 4, 5):
            terms += [f"c:{p[i:i + n]}" for i in range(max(1, len(p) - n + 1))]
    return terms


def hashed(text: str, scale: float = 1.0):
    """Return (indices, values): sublinear tf, L2-normalised, multiplied by `scale`."""
    tf = Counter(zlib.crc32(t.encode("utf8")) % DIM for t in _terms(text))
    if not tf:
        return np.array([], dtype=np.int64), np.array([], dtype=float)
    idx = np.fromiter(tf.keys(), dtype=np.int64)
    val = np.array([1 + math.log(c) for c in tf.values()], dtype=float)
    val = scale * val / np.linalg.norm(val)
    return idx, val


def dense_hashed(texts, scale: float = 1.0) -> np.ndarray:
    M = np.zeros((len(texts), DIM), dtype=np.float32)
    for r, t in enumerate(texts):
        i, v = hashed(t, scale)
        M[r, i] = v
    return M

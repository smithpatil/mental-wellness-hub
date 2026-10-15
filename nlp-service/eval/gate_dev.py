"""Development of the v2 crisis gate (learned classifier on SBERT embeddings + lexicon).

Uses ONLY development material: the original dev split, the original test split (already seen, hence
"dev 2"), and data/gate_training.json. The sealed held-out set (data/heldout) is never read here.

  python -m eval.gate_dev            # cross-validated model selection, prints / writes results/gate_dev.json
  python -m eval.gate_dev --freeze   # additionally trains on the full pool and writes config/gate.json
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from mwh_nlp.crisis import CrisisGate, f_beta  # noqa: E402
from mwh_nlp.preprocess import STOPWORDS, tokenize  # noqa: E402
from mwh_nlp.rankers import Encoder  # noqa: E402
from mwh_nlp.gatefeat import dense_hashed  # noqa: E402

DATA, RES, CFG = ROOT / "data", ROOT / "results", ROOT / "config"
HI = set("hai hain hu hun nahi nahin kya kaise karu karun kuch mujhe main mera mere aur toh bhi ka ki ke ko se mein par pe "
         "bahut raha rahi liye kal aaj sab koi tha thi lagta lagti mann dil ghar dost log baar".split())


def hinglish(text: str) -> bool:
    toks = [t for t, _ in tokenize(text)] + [w for w in text.lower().split() if w in HI]
    words = [w.strip(".,!?;:'\"") for w in text.lower().split()]
    return sum(1 for w in words if w in HI) >= 2


def load_pool():
    safety = json.loads((DATA / "safety.json").read_text(encoding="utf8"))
    extra = json.loads((DATA / "gate_training.json").read_text(encoding="utf8"))
    pool = [{"text": s["text"], "label": s["label"], "kind": s["kind"], "src": "dev1" if s["split"] == "dev" else "dev2"} for s in safety]
    for e in extra:
        pool.append({"text": e["text"], "label": e["label"], "kind": "extra", "src": "train"})
    for p in pool:
        p["hing"] = hinglish(p["text"])
    return pool


def metrics(pred, label, pool):
    pred, label = np.asarray(pred, bool), np.asarray(label, int)
    tp = int(np.sum(pred & (label == 1))); fp = int(np.sum(pred & (label == 0))); fn = int(np.sum(~pred & (label == 1)))
    p = tp / (tp + fp) if tp + fp else 0.0
    r = tp / (tp + fn) if tp + fn else 0.0
    f2 = f_beta(tp, fp, fn, 2.0)
    out = {"recall": r, "precision": p, "F2": f2, "fdr": fp / max(1, int(np.sum(label == 0))), "tp": tp, "fp": fp, "fn": fn}
    hing_neg = [i for i, x in enumerate(pool) if x["label"] == 0 and x["hing"]]
    en_neg = [i for i, x in enumerate(pool) if x["label"] == 0 and not x["hing"] and x["kind"] != "hard_negative"]
    hn = [i for i, x in enumerate(pool) if x["kind"] == "hard_negative"]
    ind = [i for i, x in enumerate(pool) if x["label"] == 1 and x["kind"] == "indirect"]
    hcr = [i for i, x in enumerate(pool) if x["label"] == 1 and x["hing"]]
    out["fdr_hinglish_everyday"] = float(np.mean(pred[hing_neg])) if hing_neg else None
    out["fdr_english_everyday"] = float(np.mean(pred[en_neg])) if en_neg else None
    out["fdr_hard_negative"] = float(np.mean(pred[hn])) if hn else None
    out["recall_indirect"] = float(np.mean(pred[ind])) if ind else None
    out["recall_hinglish_crisis"] = float(np.mean(pred[hcr])) if hcr else None
    return out


def threshold_for_recall(prob, lex, label, target=0.95):
    """Highest threshold whose recall (lexicon OR prob >= th) reaches `target`; returns (th, fdr, recall).
    If the target is unreachable it falls back to the threshold with maximal recall (ties: higher th)."""
    cands = sorted(set(np.round(prob, 4)) | {1.01})
    best = None
    n_pos, n_neg = int(np.sum(label == 1)), int(np.sum(label == 0))
    for th in cands:
        pred = lex | (prob >= th)
        rec = np.sum(pred & (label == 1)) / n_pos
        fdr = np.sum(pred & (label == 0)) / n_neg
        if rec >= target and (best is None or th > best[0]):
            best = (float(th), float(fdr), float(rec))
    if best is None:
        th = min(cands)
        pred = lex | (prob >= th)
        best = (float(th), float(np.sum(pred & (label == 0)) / n_neg), float(np.sum(pred & (label == 1)) / n_pos))
    return best


def best_threshold(prob, lex, label, beta=2.0):
    cands = sorted(set(np.round(prob, 4)) | {1.01})
    best = (-1.0, None)
    for th in cands:
        pred = lex | (prob >= th)
        tp = int(np.sum(pred & (label == 1))); fp = int(np.sum(pred & (label == 0))); fn = int(np.sum(~pred & (label == 1)))
        f = f_beta(tp, fp, fn, beta)
        if f > best[0] or (abs(f - best[0]) < 1e-12 and th > best[1]):
            best = (f, float(th))
    return best[1], best[0]


def main(freeze):
    lexicon = json.loads((DATA / "crisis_lexicon.json").read_text(encoding="utf8"))
    exemplars = json.loads((DATA / "crisis_exemplars.json").read_text(encoding="utf8"))
    params = json.loads((CFG / "params.json").read_text(encoding="utf8"))
    pool = load_pool()
    enc = Encoder(cache=True)
    gate = CrisisGate(lexicon, exemplars, enc, theta_c=params["theta_c"])
    X = enc.encode([p["text"] for p in pool])
    y = np.array([p["label"] for p in pool])
    lex = np.array([gate.lexicon_hit(p["text"]) for p in pool])
    sem = np.array([gate.semantic_score(p["text"], X[i]) for i, p in enumerate(pool)])
    print(f"pool: {int(y.sum())} crisis, {int((y == 0).sum())} non-crisis")

    # reference: the v1 gate (lexicon + exemplar similarity at the dev-tuned theta_c), on the same pool
    v1_pred = lex | (sem >= params["theta_c"])
    v1 = metrics(v1_pred, y, pool)
    v1_dev1 = metrics(v1_pred[[i for i, p in enumerate(pool) if p["src"] != "train"]],
                      y[[i for i, p in enumerate(pool) if p["src"] != "train"]],
                      [p for p in pool if p["src"] != "train"])
    print("v1 gate on pool:", {k: round(v, 3) if isinstance(v, float) else v for k, v in v1.items()})

    texts = [p["text"] for p in pool]
    Hmat = {lam: dense_hashed(texts, lam) for lam in (1.0, 2.0, 4.0)}
    grid = [(lam, C, w) for lam in (1.0, 2.0, 4.0) for C in (3, 10, 30, 100) for w in (1, 2, 4)]
    results = []
    for lam, C, w in grid:
        XF = np.hstack([X, Hmat[lam]]) if lam > 0 else X
        probs_all = []
        for rep in range(3):
            skf = StratifiedKFold(5, shuffle=True, random_state=100 + rep)
            oof = np.zeros(len(y))
            for tr, te in skf.split(XF, y):
                clf = LogisticRegression(C=C, class_weight={0: 1, 1: w}, max_iter=3000).fit(XF[tr], y[tr])
                oof[te] = clf.predict_proba(XF[te])[:, 1]
            probs_all.append(oof)
        prob = np.concatenate(probs_all)
        lab = np.tile(y, 3)
        lx = np.tile(lex, 3)
        th, fdr_at_target, rec = threshold_for_recall(prob, lx, lab, 0.95)
        _, f2 = best_threshold(prob, lx, lab)
        results.append({"lam": lam, "C": C, "w": w, "theta": th, "cv_F2": f2, "cv_fdr_at_recall95": fdr_at_target,
                        "cv_recall": rec, "prob": prob, "th": th})
    # model selection: among configurations that reach the recall target, the lowest false-diversion rate
    reach = [r for r in results if r["cv_recall"] >= 0.95] or results
    best = min(reach, key=lambda r: (r["cv_fdr_at_recall95"], -r["cv_F2"]))
    pool3 = pool * 3
    m = metrics(np.tile(lex, 3) | (best["prob"] >= best["theta"]), np.tile(y, 3), pool3)
    print(f"best config lam={best['lam']} C={best['C']} w={best['w']} theta={best['theta']:.3f} CV F2={best['cv_F2']:.3f}")
    print("v2 (cross-validated, pooled):", {k: round(v, 3) if isinstance(v, float) else v for k, v in m.items()})

    # same CV estimate restricted to the original test split (dev 2), for comparison with the paper's v1 figures
    mask = np.tile(np.array([p["src"] == "dev2" for p in pool]), 3)
    sub_pool = [p for p, k in zip(pool3, mask) if k]
    m_dev2 = metrics((np.tile(lex, 3) | (best["prob"] >= best["theta"]))[mask], np.tile(y, 3)[mask], sub_pool)
    print("v2 CV on dev2 only:", {k: round(v, 3) if isinstance(v, float) else v for k, v in m_dev2.items()})

    out = {"pool": {"crisis": int(y.sum()), "non_crisis": int((y == 0).sum())}, "v1_on_pool": v1,
           "best": {k: best[k] for k in ("lam", "C", "w", "theta", "cv_F2", "cv_fdr_at_recall95", "cv_recall")}, "v2_cv_pooled": m, "v2_cv_dev2": m_dev2,
           "grid": [{k: r[k] for k in ("lam", "C", "w", "theta", "cv_F2", "cv_fdr_at_recall95", "cv_recall")} for r in results]}
    RES.mkdir(exist_ok=True)
    (RES / "gate_dev.json").write_text(json.dumps(out, indent=2), encoding="utf8")

    if freeze:
        XF = np.hstack([X, Hmat[best["lam"]]]) if best["lam"] > 0 else X
        clf = LogisticRegression(C=best["C"], class_weight={0: 1, 1: best["w"]}, max_iter=3000).fit(XF, y)
        model = {"type": "logreg-sbert+hashed-ngrams", "encoder": "sentence-transformers/all-MiniLM-L6-v2",
                 "coef": clf.coef_[0].tolist(), "intercept": float(clf.intercept_[0]), "theta": best["theta"],
                 "ngram_scale": best["lam"], "emb_dim": int(X.shape[1]),
                 "trained_on": out["pool"], "C": best["C"], "class_weight_crisis": best["w"]}
        (CFG / "gate.json").write_text(json.dumps(model), encoding="utf8")
        print("froze config/gate.json")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--freeze", action="store_true")
    main(ap.parse_args().freeze)

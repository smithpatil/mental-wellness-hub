"""Evaluation protocol (paper Section V).

  python -m eval.run_eval --phase dev    # tune alpha, tau, theta_c, scaler bounds on DEV only
  python -m eval.run_eval --phase test   # evaluate ONCE on TEST with the frozen parameters

Nothing about the test split is read in the dev phase. Results are written to ./results.
"""
import argparse
import hashlib
import json
import os
import platform
import sys
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from mwh_nlp.crisis import CrisisGate, tune_theta, make_gate  # noqa: E402
from mwh_nlp.preprocess import lemmas  # noqa: E402
from mwh_nlp.rankers import BM25, Hybrid, Sbert, Scaler, TfIdf, Encoder, doc_text  # noqa: E402
from mwh_nlp.recommender import Recommender  # noqa: E402
from eval.metrics import (bootstrap_ci, cohens_kappa, paired_bootstrap, per_query_metrics, prf, ranking,  # noqa: E402
                          ndcg_at_k)

DATA = ROOT / "data"
RES = ROOT / "results"
CFG = ROOT / "config"
RES.mkdir(exist_ok=True)
CFG.mkdir(exist_ok=True)
PARAMS = CFG / "params.json"
METHODS = ["BM25", "TF-IDF", "SBERT", "Hybrid"]


HELD = False  # set by --phase heldout
HELD_FILES = {"queries.json", "qrels.json", "safety.json", "out_of_scope.json"}
OUT_STEM = "test"


def load(name):
    base = DATA / "heldout" if HELD and name in HELD_FILES else DATA
    return json.loads((base / name).read_text(encoding="utf8"))


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:16]


def grades_for(qid, corpus, qrels):
    g = qrels[qid]
    return np.array([g.get(r["id"], 0) for r in corpus])


def score_all(ranker, queries):
    return [ranker.score(q["text"]) for q in queries]


def build_models(corpus, encoder):
    return BM25(corpus), TfIdf(corpus), Sbert(corpus, encoder)


# ----------------------------------------------------------------------------------------------
def phase_dev(args):
    corpus, queries, qrels = load("corpus.json"), load("queries.json"), load("qrels.json")
    safety, lexicon, exemplars = load("safety.json"), load("crisis_lexicon.json"), load("crisis_exemplars.json")
    encoder = Encoder(cache=True)
    bm25, tfidf, sbert = build_models(corpus, encoder)

    dev_q = [q for q in queries if q["split"] == "dev"]
    G = [grades_for(q["id"], corpus, qrels) for q in dev_q]
    S_b, S_t, S_s = score_all(bm25, dev_q), score_all(tfidf, dev_q), score_all(sbert, dev_q)

    # scaler bounds fitted on dev score distributions
    sc_s = Scaler.fit(np.vstack(S_s))
    sc_t = Scaler.fit(np.vstack(S_t))

    # alpha grid on dev nDCG@5
    grid = {}
    for a in np.round(np.arange(0, 1.0001, 0.05), 2):
        rows = [a * sc_s(s) + (1 - a) * sc_t(t) for s, t in zip(S_s, S_t)]
        grid[float(a)] = float(per_query_metrics(rows, G)["nDCG@5"].mean())
    best_a = max(grid.items(), key=lambda kv: (kv[1], -abs(kv[0] - 0.5)))[0]

    # tau: largest threshold keeping in-scope dev fallback <= 10%
    hybrid = Hybrid(sbert, tfidf, best_a, sc_s, sc_t)
    dev_oos = [s for s in safety if s["split"] == "dev" and s["kind"] == "out_of_scope"]
    in_max = np.array([hybrid.fuse(s, t).max() for s, t in zip(S_s, S_t)])
    oos_max = np.array([hybrid.score(s["text"]).max() for s in dev_oos])
    cands = sorted(set(np.round(in_max, 4)))
    tau = 0.0
    for c in cands:
        if np.mean(in_max < c) <= 0.10:
            tau = float(c)
    oos_reject = float(np.mean(oos_max < tau)) if len(oos_max) else None

    # theta_c on dev safety queries (lexicon OR semantic >= theta)
    gate = CrisisGate(lexicon, exemplars, encoder, theta_c=2.0)
    dev_s = [s for s in safety if s["split"] == "dev"]
    sem = np.array([gate.semantic_score(s["text"]) for s in dev_s])
    lex = np.array([gate.lexicon_hit(s["text"]) for s in dev_s])
    lab = np.array([s["label"] for s in dev_s])
    theta, f2 = tune_theta(sem, lex, lab, beta=2.0)

    params = {
        "alpha": best_a, "k": 5, "tau": tau, "theta_c": theta,
        "scaler_sbert": sc_s.to_dict(), "scaler_tfidf": sc_t.to_dict(),
        "bm25": {"k1": 1.5, "b": 0.75}, "encoder": Sbert.MODEL,
    }
    PARAMS.write_text(json.dumps(params, indent=2), encoding="utf8")

    dev_methods = {
        "BM25": per_query_metrics(S_b, G), "TF-IDF": per_query_metrics(S_t, G),
        "SBERT": per_query_metrics(S_s, G),
        "Hybrid": per_query_metrics([best_a * sc_s(s) + (1 - best_a) * sc_t(t) for s, t in zip(S_s, S_t)], G),
    }
    out = {
        "n_dev_queries": len(dev_q), "alpha_grid_ndcg5": grid, "params": params,
        "dev_metrics": {m: {k: float(v.mean()) for k, v in d.items()} for m, d in dev_methods.items()},
        "tau": {"dev_in_scope_fallback_rate": float(np.mean(in_max < tau)), "dev_oos_rejection_rate": oos_reject,
                "n_dev_oos": len(dev_oos)},
        "theta_c": {"value": theta, "dev_F2": f2, "n_dev_crisis": int(lab.sum()), "n_dev_noncrisis": int((lab == 0).sum())},
        "data_hashes": {n: sha(DATA / n) for n in ["corpus.json", "queries.json", "qrels.json", "safety.json",
                                                    "crisis_lexicon.json", "crisis_exemplars.json"]},
    }
    (RES / "dev.json").write_text(json.dumps(out, indent=2), encoding="utf8")
    print(json.dumps({k: out[k] for k in ["dev_metrics", "tau", "theta_c"]}, indent=2))
    print("params:", params)


# ----------------------------------------------------------------------------------------------
def bootstrap_block(arrs, n_boot):
    return {m: {k: dict(zip(("mean", "lo", "hi"), bootstrap_ci(v, n_boot))) for k, v in d.items()} for m, d in arrs.items()}


def phase_test(args):
    if not PARAMS.exists():
        sys.exit("Run --phase dev first (params.json missing).")
    params = json.loads(PARAMS.read_text(encoding="utf8"))
    corpus, queries, qrels = load("corpus.json"), load("queries.json"), load("qrels.json")
    safety, lexicon, exemplars = load("safety.json"), load("crisis_lexicon.json"), load("crisis_exemplars.json")
    n_boot = args.bootstrap

    encoder = Encoder(cache=True)
    bm25, tfidf, sbert = build_models(corpus, encoder)
    sc_s, sc_t = Scaler(**params["scaler_sbert"]), Scaler(**params["scaler_tfidf"])
    hybrid = Hybrid(sbert, tfidf, params["alpha"], sc_s, sc_t)
    rankers = {"BM25": bm25, "TF-IDF": tfidf, "SBERT": sbert, "Hybrid": hybrid}

    test_q = [q for q in queries if q["split"] == "test"]
    G = [grades_for(q["id"], corpus, qrels) for q in test_q]
    S = {m: score_all(r, test_q) for m, r in rankers.items()}
    PQ = {m: per_query_metrics(S[m], G) for m in METHODS}

    ci = bootstrap_block(PQ, n_boot)
    paired = {}
    for m in METHODS:
        if m == "BM25":
            continue
        paired[m] = {}
        for metric in ("nDCG@5", "P@5", "MRR"):
            d, lo, hi, p = paired_bootstrap(PQ[m][metric], PQ["BM25"][metric], n_boot)
            base = PQ["BM25"][metric].mean()
            paired[m][metric] = {"delta": d, "ci_lo": lo, "ci_hi": hi, "p": p,
                                 "rel_gain_pct": float(100 * d / base) if base else None}

    # Post-hoc, reported as such: is the hybrid distinguishable from SBERT alone?
    paired_vs_sbert = {}
    for metric in ("nDCG@5", "P@5", "MRR"):
        d, lo, hi, p = paired_bootstrap(PQ["Hybrid"][metric], PQ["SBERT"][metric], n_boot)
        paired_vs_sbert[metric] = {"delta": d, "ci_lo": lo, "ci_hi": hi, "p": p}

    best = max(METHODS, key=lambda m: PQ[m]["nDCG@5"].mean())

    # per-style breakdown (nDCG@5)
    styles = sorted({q["style"] for q in test_q})
    by_style = {m: {s: float(np.mean([PQ[m]["nDCG@5"][i] for i, q in enumerate(test_q) if q["style"] == s]))
                    for s in styles} for m in METHODS}
    style_n = {s: sum(1 for q in test_q if q["style"] == s) for s in styles}

    # error analysis for the best method
    rows = []
    corpus_lem = [set(lemmas(doc_text(r))) for r in corpus]
    worst = np.argsort(PQ[best]["nDCG@5"], kind="stable")[:10]
    cause_counts = {}
    for i in worst:
        q = test_q[int(i)]
        order = ranking(S[best][int(i)])
        top1 = corpus[int(order[0])]
        target_cats = {r["category"] for r in corpus if r["subtopic"] in q["targets"]}
        rel_lem = set().union(*[corpus_lem[j] for j, r in enumerate(corpus) if r["subtopic"] in q["targets"]])
        overlap = bool(set(lemmas(q["text"])) & rel_lem)
        if q["style"] == "multi":
            cause = "multi-concern query"
        elif top1["category"] not in target_cats:
            cause = "wrong category" + ("" if overlap else " (no lexical overlap)")
        else:
            cause = "right category, wrong subtopic"
        if q["style"] == "mix":
            cause += " [code-mixed]"
        cause_counts[cause] = cause_counts.get(cause, 0) + 1
        rows.append({"id": q["id"], "text": q["text"], "style": q["style"], "ndcg5": float(PQ[best]["nDCG@5"][int(i)]),
                     "top1": top1["title"], "top1_category": top1["category"], "cause": cause})
    all_causes = {}
    for i, q in enumerate(test_q):
        if PQ[best]["nDCG@5"][i] < 0.5:
            order = ranking(S[best][i])
            top1 = corpus[int(order[0])]
            target_cats = {r["category"] for r in corpus if r["subtopic"] in q["targets"]}
            c = "multi-concern" if q["style"] == "multi" else ("wrong category" if top1["category"] not in target_cats else "right category, wrong subtopic")
            all_causes[f"{c} | {q['style']}"] = all_causes.get(f"{c} | {q['style']}", 0) + 1

    # fallback behaviour
    test_in = [q for q in test_q]
    hmax = np.array([s.max() for s in S["Hybrid"]])
    test_oos = [s for s in safety if s["split"] == "test" and s["kind"] == "out_of_scope"]
    oos_max = np.array([hybrid.score(s["text"]).max() for s in test_oos])
    fallback = {
        "tau": params["tau"],
        "in_scope_fallback_rate": float(np.mean(hmax < params["tau"])),
        "n_in_scope": len(test_in),
        "oos_rejection_rate": float(np.mean(oos_max < params["tau"])) if len(oos_max) else None,
        "n_oos": len(test_oos),
    }

    # crisis gate on test
    gate = make_gate(lexicon, exemplars, encoder, params, CFG, os.environ.get("MWH_GATE_VERSION", "auto"))
    ts = [s for s in safety if s["split"] == "test"]
    lab = np.array([s["label"] for s in ts])
    sem = np.array([gate.semantic_score(s["text"]) for s in ts])
    lex = np.array([gate.lexicon_hit(s["text"]) for s in ts])
    variants = {
        "lexicon only": lex,
        "classifier/semantic only": sem >= gate.theta_c,
        "lexicon + semantic (full gate)": lex | (sem >= gate.theta_c),
    }
    crisis = {}
    for name, pred in variants.items():
        tp = int(np.sum(pred & (lab == 1))); fp = int(np.sum(pred & (lab == 0))); fn = int(np.sum(~pred & (lab == 1)))
        p, r, f2 = prf(tp, fp, fn, 2.0)
        crisis[name] = {"tp": tp, "fp": fp, "fn": fn, "precision": p, "recall": r, "F2": f2,
                        "false_diversion_rate": fp / int((lab == 0).sum())}
    full = variants["lexicon + semantic (full gate)"]
    rng = np.random.default_rng(23)
    crisis_idx = np.where(lab == 1)[0]
    non_idx = np.where(lab == 0)[0]
    rec_b, fdr_b = [], []
    for _ in range(n_boot):
        ci_ = rng.choice(crisis_idx, len(crisis_idx)); ni_ = rng.choice(non_idx, len(non_idx))
        rec_b.append(full[ci_].mean()); fdr_b.append(full[ni_].mean())
    crisis_ci = {"recall": [float(np.percentile(rec_b, 2.5)), float(np.percentile(rec_b, 97.5))],
                 "false_diversion_rate": [float(np.percentile(fdr_b, 2.5)), float(np.percentile(fdr_b, 97.5))]}
    kinds = {}
    for k in ["direct", "indirect", "mix"]:
        idx = [i for i, s in enumerate(ts) if s["kind"] == k]
        kinds[k] = {"n": len(idx), "recall": float(np.mean(full[idx]))}
    neg_kinds = {}
    for k in ["everyday", "hard_negative", "out_of_scope"]:
        idx = [i for i, s in enumerate(ts) if s["kind"] == k]
        neg_kinds[k] = {"n": len(idx), "false_diversions": int(np.sum(full[idx])), "rate": float(np.mean(full[idx]))}
    missed = [{"id": ts[i]["id"], "text": ts[i]["text"], "kind": ts[i]["kind"], "semantic": float(sem[i]),
               "lexicon": bool(lex[i])} for i in np.where((lab == 1) & ~full)[0]]
    false_div = [{"id": ts[i]["id"], "text": ts[i]["text"], "kind": ts[i]["kind"], "semantic": float(sem[i]),
                  "lexicon": bool(lex[i])} for i in np.where((lab == 0) & full)[0]]

    # end-to-end latency of the in-process pipeline (CPU). A separate UNCACHED encoder is used so that
    # every query is genuinely encoded; the corpus embeddings are precomputed, as in the service.
    live_enc = Encoder(cache=False)
    live_sbert = Sbert(corpus, live_enc)
    live_hybrid = Hybrid(live_sbert, TfIdf(corpus), params["alpha"], sc_s, sc_t)
    live_gate = make_gate(lexicon, exemplars, live_enc, params, CFG, os.environ.get("MWH_GATE_VERSION", "auto"))
    rec = Recommender(corpus, live_hybrid, live_gate, params["tau"], params["k"])
    texts = [q["text"] for q in test_q]
    for t in texts[:5]:
        rec.recommend(t)  # warm-up
    lat = []
    for t in texts:
        t0 = time.perf_counter(); rec.recommend(t); lat.append((time.perf_counter() - t0) * 1000)
    latency = {"n": len(lat), "p50_ms": float(np.percentile(lat, 50)), "p95_ms": float(np.percentile(lat, 95)),
               "mean_ms": float(np.mean(lat)), "note": "in-process, single thread, CPU, uncached encoder"}

    # inter-annotator agreement, only if two independent human annotation files are supplied
    kappa = None
    a_f, b_f = DATA / "annotations_A.json", DATA / "annotations_B.json"
    if a_f.exists() and b_f.exists():
        A, B = json.loads(a_f.read_text()), json.loads(b_f.read_text())
        la, lb = [], []
        for qid in A:
            for r in corpus:
                la.append(A[qid].get(r["id"], 0)); lb.append(B.get(qid, {}).get(r["id"], 0))
        kappa = cohens_kappa(la, lb)

    out = {
        "n_test_queries": len(test_q), "n_bootstrap": n_boot, "best_method": best, "params": params,
        "metrics": ci, "paired_vs_bm25": paired, "paired_hybrid_vs_sbert_posthoc": paired_vs_sbert, "ndcg5_by_style": by_style, "style_n": style_n,
        "fallback": fallback, "crisis": crisis, "crisis_ci": crisis_ci, "crisis_by_kind": kinds,
        "noncrisis_by_kind": neg_kinds, "missed_crisis": missed, "false_diversions": false_div,
        "gate_version": gate.version, "gate_theta": float(gate.theta_c), "n_test_crisis": int((lab == 1).sum()), "n_test_noncrisis": int((lab == 0).sum()),
        "worst_queries": rows, "worst_cause_counts": cause_counts, "all_low_ndcg_causes": all_causes,
        "n_ndcg5_below_0.5": int(np.sum(PQ[best]["nDCG@5"] < 0.5)),
        "latency_in_process": latency, "kappa": kappa,
        "environment": {"python": platform.python_version(), "platform": platform.platform(),
                        "numpy": np.__version__, "encoder": Sbert.MODEL},
        "data_hashes": {n: sha(DATA / n) for n in ["corpus.json", "queries.json", "qrels.json", "safety.json",
                                                    "crisis_lexicon.json", "crisis_exemplars.json"]},
        "params_hash": sha(PARAMS),
    }
    try:
        import sentence_transformers, torch  # noqa: F401
        out["environment"]["sentence_transformers"] = sentence_transformers.__version__
        out["environment"]["torch"] = torch.__version__
    except Exception:
        pass
    (RES / f"{OUT_STEM}.json").write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf8")
    write_tables(out)
    print(f"wrote results/{OUT_STEM}.json and results/tables{'' if OUT_STEM == 'test' else '_' + OUT_STEM}.md")


def f3(x):
    return f"{x:.3f}"


def write_tables(o):
    L = []
    L.append("## Table III: retrieval results on the test set\n")
    L.append("| Method | P@3 | P@5 | MRR | nDCG@5 |\n|---|---|---|---|---|")
    for m in METHODS:
        r = o["metrics"][m]
        L.append(f"| {m} | " + " | ".join(f"{f3(r[k]['mean'])} [{f3(r[k]['lo'])}, {f3(r[k]['hi'])}]" for k in ("P@3", "P@5", "MRR", "nDCG@5")) + " |")
    L.append("\n## Paired bootstrap vs BM25\n")
    L.append("| Method | metric | delta | 95% CI | rel. gain % | p |\n|---|---|---|---|---|---|")
    for m, d in o["paired_vs_bm25"].items():
        for k, v in d.items():
            L.append(f"| {m} | {k} | {v['delta']:+.3f} | [{v['ci_lo']:+.3f}, {v['ci_hi']:+.3f}] | {v['rel_gain_pct']:+.1f} | {v['p']:.4f} |")
    L.append(f"\nBest method (nDCG@5): **{o['best_method']}**; params: {json.dumps({k: o['params'][k] for k in ('alpha','k','tau','theta_c')})}")
    L.append(f"\nFallback: {o['fallback']}")
    L.append("\n## nDCG@5 by query style\n")
    styles = list(o["style_n"])
    L.append("| Method | " + " | ".join(f"{s} (n={o['style_n'][s]})" for s in styles) + " |\n|---|" + "---|" * len(styles))
    for m in METHODS:
        L.append(f"| {m} | " + " | ".join(f3(o["ndcg5_by_style"][m][s]) for s in styles) + " |")
    L.append("\n## Table IV (safety part)\n")
    L.append(f"n_test_crisis={o['n_test_crisis']}, n_test_noncrisis={o['n_test_noncrisis']}\n")
    L.append("| Gate variant | TP | FP | FN | precision | recall | F2 | false diversion rate |\n|---|---|---|---|---|---|---|---|")
    for k, v in o["crisis"].items():
        L.append(f"| {k} | {v['tp']} | {v['fp']} | {v['fn']} | {f3(v['precision'])} | {f3(v['recall'])} | {f3(v['F2'])} | {f3(v['false_diversion_rate'])} |")
    L.append(f"\nCI (full gate): {o['crisis_ci']}\n\nBy kind (recall): {o['crisis_by_kind']}\n\nNon-crisis by kind: {o['noncrisis_by_kind']}")
    L.append("\n### Missed crisis queries\n")
    for m in o["missed_crisis"]:
        L.append(f"- [{m['kind']}] sem={m['semantic']:.3f} lex={m['lexicon']}: {m['text']}")
    L.append("\n### False diversions\n")
    for m in o["false_diversions"]:
        L.append(f"- [{m['kind']}] sem={m['semantic']:.3f} lex={m['lexicon']}: {m['text']}")
    L.append("\n## Error analysis (10 worst queries, best method)\n")
    for r in o["worst_queries"]:
        L.append(f"- {r['id']} [{r['style']}] nDCG@5={r['ndcg5']:.2f} -> {r['top1']} ({r['top1_category']}); cause: {r['cause']}; \"{r['text']}\"")
    L.append(f"\nCause counts (10 worst): {o['worst_cause_counts']}")
    L.append(f"\nQueries with nDCG@5 < 0.5: {o['n_ndcg5_below_0.5']}; breakdown: {o['all_low_ndcg_causes']}")
    L.append(f"\nIn-process latency: {o['latency_in_process']}\n\nkappa: {o['kappa']}\n\nEnvironment: {o['environment']}")
    (RES / ("tables.md" if OUT_STEM == "test" else f"tables_{OUT_STEM}.md")).write_text("\n".join(L), encoding="utf8")


def phase_heldout(args):
    """Single-use evaluation on the sealed held-out set with the frozen parameters."""
    global HELD, OUT_STEM
    if not args.confirm_frozen:
        sys.exit("Refusing to run: pass --confirm-frozen to confirm that system changes are frozen "
                 "and that you accept this set is evaluated only once.")
    out_file = RES / "heldout.json"
    if out_file.exists() and not args.force:
        sys.exit("results/heldout.json exists: the held-out set has already been evaluated (use --force only to re-print).")
    seal = json.loads((DATA / "heldout" / "SEAL.json").read_text(encoding="utf8"))
    for name, digest in seal["files"].items():
        got = hashlib.sha256((DATA / "heldout" / name).read_bytes()).hexdigest()
        if got != digest:
            sys.exit(f"SEAL BROKEN: {name} changed since sealing ({seal['sealed_at']}).")
    HELD, OUT_STEM = True, "heldout"
    phase_test(args)
    res = json.loads(out_file.read_text(encoding="utf8"))
    res["heldout_seal"] = seal
    res["note"] = "Sealed held-out set (v2); evaluated once with frozen parameters."
    out_file.write_text(json.dumps(res, indent=2, ensure_ascii=False), encoding="utf8")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--phase", choices=["dev", "test", "heldout"], required=True)
    ap.add_argument("--bootstrap", type=int, default=1000)
    ap.add_argument("--confirm-frozen", action="store_true")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    {"dev": phase_dev, "test": phase_test, "heldout": phase_heldout}[a.phase](a)

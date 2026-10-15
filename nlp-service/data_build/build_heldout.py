"""Builds the sealed held-out set (v2) in ../data/heldout.

Checks (hard failures):
  - every text is new: no exact duplicate and no near-duplicate (token Jaccard >= 0.7) of ANY earlier
    query, crisis query, hard negative, out-of-scope query or stage-2 exemplar;
  - every target subtopic exists in the corpus.
Labels use the same taxonomy rule as the first set (2 = target subtopic, 1 = same category, 0 otherwise).
Then writes SEAL.json (sha256 of each file + timestamp). The set must be evaluated ONCE with
`python -m eval.run_eval --phase heldout --confirm-frozen` after system changes are frozen.
"""
import hashlib
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from corpus import build as build_corpus
from heldout_queries import Q, MULTI
from heldout_safety import CRISIS, HARD_NEGATIVES, OUT_OF_SCOPE

DATA = Path(__file__).resolve().parent.parent / "data"
OUT = DATA / "heldout"
OUT.mkdir(exist_ok=True)

corpus = build_corpus()
sub_to_cat = {r["subtopic"]: r["category"] for r in corpus}
tok = lambda t: set(re.findall(r"[a-z0-9']+", t.lower()))


def jaccard(a, b):
    return len(a & b) / len(a | b) if a and b else 0.0


# ---- everything that already exists (must not be re-used) -----------------------------------------
prior = []
for q in json.loads((DATA / "queries.json").read_text(encoding="utf8")):
    prior.append(q["text"])
for s in json.loads((DATA / "safety.json").read_text(encoding="utf8")):
    prior.append(s["text"])
prior += json.loads((DATA / "crisis_exemplars.json").read_text(encoding="utf8"))
prior_tok = [(t, tok(t)) for t in set(prior)]


VIOLATIONS = []


def check_new(text, where):
    tt = tok(text)
    for p, pt in prior_tok:
        if p.strip().lower() == text.strip().lower():
            VIOLATIONS.append(f"DUPLICATE in {where}: {text!r}")
            return
        if len(tt) >= 6 and len(pt) >= 6 and jaccard(tt, pt) >= 0.7:
            VIOLATIONS.append(f"NEAR-DUPLICATE in {where}: {text!r}  ~  {p!r}")
            return


# ---- retrieval queries ---------------------------------------------------------------------------------
queries, n = [], 0
for sub, items in Q.items():
    assert sub in sub_to_cat, sub
    assert len(items) == 5, (sub, len(items))
    for style, text in items:
        check_new(text, f"queries/{sub}")
        n += 1
        queries.append({"id": f"H{n:03d}", "text": text, "style": style, "targets": [sub], "split": "test"})
for text, subs in MULTI:
    assert all(s in sub_to_cat for s in subs), subs
    check_new(text, "multi")
    n += 1
    queries.append({"id": f"H{n:03d}", "text": text, "style": "multi", "targets": subs, "split": "test"})

qrels = {}
for q in queries:
    cats = {sub_to_cat[s] for s in q["targets"]}
    rel = {}
    for r in corpus:
        if r["subtopic"] in q["targets"]:
            rel[r["id"]] = 2
        elif r["category"] in cats:
            rel[r["id"]] = 1
    qrels[q["id"]] = rel

# ---- safety --------------------------------------------------------------------------------------------------
safety, i = [], 0
for kind, text in CRISIS:
    check_new(text, "crisis")
    i += 1
    safety.append({"id": f"HC{i:03d}", "text": text, "label": 1, "kind": kind, "split": "test"})
j = 0
for q in queries:
    j += 1
    safety.append({"id": f"HN{j:03d}", "text": q["text"], "label": 0, "kind": "everyday", "split": "test"})
for text in HARD_NEGATIVES:
    check_new(text, "hard_negative")
    j += 1
    safety.append({"id": f"HN{j:03d}", "text": text, "label": 0, "kind": "hard_negative", "split": "test"})
oos_items = []
for k, text in enumerate(OUT_OF_SCOPE, start=1):
    check_new(text, "out_of_scope")
    j += 1
    oos_items.append({"id": f"HO{k:03d}", "text": text, "split": "test"})
    safety.append({"id": f"HN{j:03d}", "text": text, "label": 0, "kind": "out_of_scope", "split": "test"})

if VIOLATIONS:
    raise SystemExit(chr(10).join(VIOLATIONS))

# no duplicates inside the new set either
all_texts = [x["text"].strip().lower() for x in queries] + [s["text"].strip().lower() for s in safety if s["kind"] != "everyday"]
dups = [t for t, c in Counter(all_texts).items() if c > 1]
assert not dups, dups


def dump(name, obj):
    (OUT / name).write_text(json.dumps(obj, indent=2, ensure_ascii=False), encoding="utf8")


dump("queries.json", queries)
dump("qrels.json", qrels)
dump("safety.json", safety)
dump("out_of_scope.json", oos_items)

seal = {
    "sealed_at": datetime.now(timezone.utc).isoformat(),
    "note": "Evaluate ONCE, after system changes are frozen. Do not tune on this set.",
    "files": {n_: hashlib.sha256((OUT / n_).read_bytes()).hexdigest() for n_ in
              ["queries.json", "qrels.json", "safety.json", "out_of_scope.json"]},
}
(OUT / "SEAL.json").write_text(json.dumps(seal, indent=2), encoding="utf8")

print("heldout queries:", len(queries), dict(Counter(q["style"] for q in queries)))
print("safety:", dict(Counter((s["label"], s["kind"]) for s in safety)))
print("sealed:", seal["files"]["queries.json"][:12], "...")

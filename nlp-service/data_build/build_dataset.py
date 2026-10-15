"""Builds the evaluation dataset files in ../data from the author-written sources.

Relevance labels are derived from the concern taxonomy used to write the queries:
  grade 2 = resource's subtopic is one of the query's target subtopics
  grade 1 = same category, different subtopic
  grade 0 = otherwise
There is NO human double annotation in this dataset; Cohen's kappa is therefore not computed here.
The eval script computes kappa if two independent annotation files are supplied.
"""
import json
import random
from pathlib import Path

from corpus import build as build_corpus
from queries import Q, MULTI
from safety_data import LEXICON, EXEMPLARS, CRISIS, HARD_NEGATIVES, OUT_OF_SCOPE

OUT = Path(__file__).resolve().parent.parent / "data"
OUT.mkdir(exist_ok=True)
SEED = 20260101
rng = random.Random(SEED)

corpus = build_corpus()
sub_to_cat = {r["subtopic"]: r["category"] for r in corpus}

# ---- retrieval queries ---------------------------------------------------------------------
queries = []
n = 0
for sub, items in Q.items():
    assert sub in sub_to_cat, sub
    assert len(items) == 8, (sub, len(items))
    for style, text in items:
        n += 1
        queries.append({"id": f"Q{n:03d}", "text": text, "style": style, "targets": [sub]})
for text, subs in MULTI:
    n += 1
    queries.append({"id": f"Q{n:03d}", "text": text, "style": "multi", "targets": subs})
assert len(queries) == 200, len(queries)

# stratified 30/70 dev/test split by primary subtopic (multi-concern queries are their own stratum)
strata = {}
for q in queries:
    key = "multi" if q["style"] == "multi" else q["targets"][0]
    strata.setdefault(key, []).append(q)
subs_sorted = sorted(k for k in strata if k != "multi")
extra3 = set(rng.sample(subs_sorted, 10))  # 10 subtopics contribute 3 dev queries, the rest 2
for key, items in strata.items():
    rng.shuffle(items)
    k = 2 if key == "multi" else (3 if key in extra3 else 2)
    for i, q in enumerate(items):
        q["split"] = "dev" if i < k else "test"

# qrels
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

# ---- safety set ----------------------------------------------------------------------------
safety = []
# crisis, split stratified by kind
by_kind = {}
for kind, text in CRISIS:
    by_kind.setdefault(kind, []).append(text)
cid = 0
for kind, texts in by_kind.items():
    rng.shuffle(texts)
    n_dev = round(len(texts) * 0.3)
    for i, t in enumerate(texts):
        cid += 1
        safety.append({"id": f"C{cid:03d}", "text": t, "label": 1, "kind": kind, "split": "dev" if i < n_dev else "test"})
# non-crisis = retrieval queries (everyday distress included) + hard negatives + out-of-scope
nid = 0
for q in queries:
    nid += 1
    safety.append({"id": f"N{nid:03d}", "text": q["text"], "label": 0, "kind": "everyday", "split": q["split"]})
hn = list(HARD_NEGATIVES)
rng.shuffle(hn)
for i, t in enumerate(hn):
    nid += 1
    safety.append({"id": f"N{nid:03d}", "text": t, "label": 0, "kind": "hard_negative", "split": "dev" if i < round(len(hn) * 0.3) else "test"})
oos = list(OUT_OF_SCOPE)
rng.shuffle(oos)
oos_items = []
for i, t in enumerate(oos):
    split = "dev" if i < round(len(oos) * 0.3) else "test"
    nid += 1
    oos_items.append({"id": f"O{i + 1:03d}", "text": t, "split": split})
    safety.append({"id": f"N{nid:03d}", "text": t, "label": 0, "kind": "out_of_scope", "split": split})

# exemplars must not appear in any evaluation text
ex_norm = {e.strip().lower() for e in EXEMPLARS}
leaks = [s["text"] for s in safety if s["text"].strip().lower() in ex_norm]
assert not leaks, leaks

# ---- write ---------------------------------------------------------------------------------
def dump(name, obj):
    (OUT / name).write_text(json.dumps(obj, indent=2, ensure_ascii=False), encoding="utf8")

dump("corpus.json", corpus)
dump("queries.json", queries)
dump("qrels.json", qrels)
dump("safety.json", safety)
dump("out_of_scope.json", oos_items)
dump("crisis_lexicon.json", LEXICON)
dump("crisis_exemplars.json", EXEMPLARS)

from collections import Counter
print("corpus", len(corpus), "queries", len(queries), "dev/test", Counter(q["split"] for q in queries))
print("safety", Counter((s["label"], s["split"]) for s in safety))
print("kinds", Counter(s["kind"] for s in safety))
print("exemplars", len(EXEMPLARS), "lexicon patterns", len(LEXICON))
print("styles", Counter(q["style"] for q in queries))

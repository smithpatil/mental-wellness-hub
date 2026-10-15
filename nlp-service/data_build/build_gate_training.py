"""Writes data/gate_training.json after verifying that no training text duplicates or closely paraphrases a
sealed held-out (v2) query. Run after build_heldout.py."""
import json
import re
from pathlib import Path

from gate_training import CRISIS_EXTRA, NONCRISIS_EXTRA

DATA = Path(__file__).resolve().parent.parent / "data"
tok = lambda t: set(re.findall(r"[a-z0-9']+", t.lower()))
jac = lambda a, b: len(a & b) / len(a | b) if a and b else 0.0

held = []
for f in ("queries.json", "safety.json", "out_of_scope.json"):
    held += [x["text"] for x in json.loads((DATA / "heldout" / f).read_text(encoding="utf8"))]
held_tok = [(h, tok(h)) for h in set(held)]

bad = []
for label, texts in ((1, CRISIS_EXTRA), (0, NONCRISIS_EXTRA)):
    for t in texts:
        tt = tok(t)
        for h, ht in held_tok:
            if t.strip().lower() == h.strip().lower() or (len(tt) >= 5 and len(ht) >= 5 and jac(tt, ht) >= 0.6):
                bad.append((t, h))
                break
if bad:
    raise SystemExit("\n".join(f"LEAK: {a!r} ~ {b!r}" for a, b in bad))

items = [{"text": t, "label": 1} for t in CRISIS_EXTRA] + [{"text": t, "label": 0} for t in NONCRISIS_EXTRA]
(DATA / "gate_training.json").write_text(json.dumps(items, indent=2, ensure_ascii=False), encoding="utf8")
print("gate training:", len(CRISIS_EXTRA), "crisis,", len(NONCRISIS_EXTRA), "non-crisis; no held-out leakage")

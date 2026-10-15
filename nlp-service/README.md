# Mental Wellness Hub: NLP recommendation service

A retrieval-only, safety-aware recommender (no generated text). It runs as a private FastAPI service that the Node API calls.

```
query -> crisis gate (lexicon + semantic) -> hybrid retrieval (SBERT + TF-IDF) -> low-confidence fallback -> top-k + "why this?"
```

| Piece | Where |
|---|---|
| BM25 (k1=1.5, b=0.75), TF-IDF (uni+bigrams, sublinear tf, cosine), SBERT `all-MiniLM-L6-v2` (384-d), hybrid fusion | `mwh_nlp/rankers.py` |
| Crisis gate: v1 exemplar similarity; **v2** lexicon + logistic regression on SBERT embedding and hashed n-grams (`config/gate.json`, trained by `eval/gate_dev.py` on development data only) | `mwh_nlp/crisis.py`, `mwh_nlp/gatefeat.py` |
| Pipeline (Algorithm 1) | `mwh_nlp/recommender.py` |
| FastAPI app | `app/main.py` |
| Evaluation protocol | `eval/run_eval.py`, `eval/metrics.py`, `eval/sus.py` |
| Dataset builders | `data_build/` -> `data/` |

## Setup

```bash
cd nlp-service
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt     # Windows; use .venv/bin/python on Linux/macOS
```

The first run downloads `sentence-transformers/all-MiniLM-L6-v2` (~90 MB).

## Run the service

```bash
.venv/Scripts/python -m uvicorn app.main:app --port 8001
```

For concurrent traffic run several single-threaded workers (`MWH_TORCH_THREADS=1`, the default, with `--workers 3`): one worker saturated at ~100 users in our load test.
Set `NLP_SERVICE_KEY` to require an `X-Internal-Key` header. The service should only be reachable from the API on a private network.
Query text is processed in memory only: it is never logged, cached or stored.

## Reproduce the experiment

```bash
python data_build/build_dataset.py                   # regenerates data/*.json (seeded split)
.venv/Scripts/python -m eval.run_eval --phase dev    # tunes alpha, tau, theta_c on the DEV split only -> config/params.json
.venv/Scripts/python -m eval.run_eval --phase test   # evaluates once on the TEST split -> results/test.json, results/tables.md
.venv/Scripts/python -m pytest tests                 # service and metric tests
```

### Sealed held-out set (v2)

The first test split has been seen (its results are recorded in `results/test.json`), so it can no longer judge a *changed* system. A fresh set is sealed in `data/heldout/`
(128 retrieval queries; 60 crisis, 40 hard-negative, 30 out-of-scope and the 128 everyday queries as non-crisis). It was written after the first
evaluation, without using any model output, and `data_build/build_heldout.py` verifies that no text duplicates or near-duplicates an earlier
query, crisis query, hard negative, out-of-scope query or stage-2 exemplar. `data/heldout/SEAL.json` holds SHA-256 hashes.

Protocol for any system change (new gate, encoder, thresholds, fallback):

1. Develop and tune using the original dev split and, if wanted, the original test split (now "dev 2").
2. Freeze `config/params.json` and the code.
3. Run once:  `python -m eval.run_eval --phase heldout --confirm-frozen`  (verifies the seal, refuses a second run, writes `results/heldout.json` and `results/tables_heldout.md`).

Report the held-out numbers as the result for the changed system; the original test numbers remain the result for the first system.
Because the held-out set was written after the failures of the first system were known, it deliberately includes more code-mixed and indirect-crisis
queries (24 code-mixed retrieval queries, 25 indirect and 15 code-mixed crisis queries).

### What the dataset is, and is not

- The 60-resource corpus, 200 retrieval queries, crisis queries, hard negatives and out-of-scope queries were **written by the project authors**. They are not collected from real users and have **not** been reviewed by a counsellor or mental-health professional.
- Relevance labels are **derived from the concern taxonomy** used to write each query (grade 2 = target subtopic, grade 1 = same category). There is **no human double annotation**, so Cohen's kappa is not computed. To compute it, put two independent annotation files at `data/annotations_A.json` and `data/annotations_B.json` (`{query_id: {resource_id: grade}}`).
- The crisis lexicon and exemplars must be reviewed by a mental-health professional before any real deployment.
- Usability: `python -m eval.sus responses.csv` scores a real SUS study; it does not generate data.

P@k and MRR treat grade 2 as relevant. Each query has only 2-3 grade-2 resources, so the attainable maximum of P@5 is about 0.5.

## Final results (sealed held-out set, evaluated once)

| Method | P@3 | P@5 | MRR | nDCG@5 |
|---|---|---|---|---|
| BM25 | 0.279 | 0.211 | 0.603 | 0.398 |
| TF-IDF | 0.271 | 0.211 | 0.604 | 0.395 |
| SBERT | 0.367 | 0.277 | 0.675 | 0.502 |
| Hybrid (alpha = 0.85, tau = 0.554) | 0.393 | 0.287 | 0.689 | 0.518 |

Crisis gate v2: recall 0.950 (57/60, 95% CI 0.883-1.000), precision 0.803, F2 0.916, false diversions 7.1% (14/198; idiom hard negatives 17.5%, out-of-scope 0%). Lexicon alone: recall 0.20.
First gate on the first test split: recall 0.762, false diversions 10.6%. Full tables and every miss / false diversion: `results/tables_heldout.md`, `results/heldout.json`.
In-process pipeline latency (single thread, CPU, uncached encoder): p50 18.9 ms, p95 27.1 ms. Load test at 200 users with 3 workers: API p95 363 ms, recommend p95 346 ms, 0.62% errors (`server/loadtest/results/`).

## Iteration log (what changed after the first evaluation)

1. First system, first test split: gate recall 0.76 (target 0.95), recommend p95 4.8 s at 200 users (target 1 s).
2. Gate v2 developed on development material only (`python -m eval.gate_dev --freeze`): cross-validated recall 0.95 at ~9% false diversions on the pooled development texts.
3. Latency: encoder throughput was flat at ~55-85 req/s regardless of torch threads; pinning one thread per worker and running three workers removed the saturation.
4. Frozen, then the sealed held-out set was evaluated once (`results/heldout.json`): gate recall 0.95 [0.88, 1.00], false diversions 7.1%.
5. Post hoc, not re-scored: the lexicon pattern for "can't go on" now also accepts "cannot go on" (it caused one held-out miss).

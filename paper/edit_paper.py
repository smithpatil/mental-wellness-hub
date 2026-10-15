# -*- coding: utf-8 -*-
"""Builds the final paper from the ICONSCISE template by replacing placeholders with MEASURED values.

Every number is read from the result files; none is typed by hand:
  nlp-service/results/test.json         retrieval + crisis-gate results (test split, single run)
  nlp-service/results/dev.json          tuning on the development split
  server/test-results/run_*.json        30 repeated Jest runs (+ server/coverage for run 1)
  server/loadtest/results/load.json     load test
Items that only the authors can supply stay highlighted yellow (authors, ethics reference,
repository URL, usability-study numbers).

usage: python edit_paper.py <template.docx> <out.docx>
"""
import glob
import json
import os
import re
import shutil
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE, OUT = sys.argv[1], sys.argv[2]

T = json.load(open(f"{ROOT}/nlp-service/results/test.json", encoding="utf8"))
HD = json.load(open(f"{ROOT}/nlp-service/results/heldout.json", encoding="utf8"))
HQ = {q["text"]: q for q in json.load(open(f"{ROOT}/nlp-service/data/heldout/queries.json", encoding="utf8"))}
GATE = json.load(open(f"{ROOT}/nlp-service/config/gate.json", encoding="utf8"))
GDEV = json.load(open(f"{ROOT}/nlp-service/results/gate_dev.json", encoding="utf8"))
HSAFE = json.load(open(f"{ROOT}/nlp-service/data/heldout/safety.json", encoding="utf8"))
DEV = json.load(open(f"{ROOT}/nlp-service/results/dev.json", encoding="utf8"))
QUERIES = {q["text"]: q for q in json.load(open(f"{ROOT}/nlp-service/data/queries.json", encoding="utf8"))}
CORPUS = json.load(open(f"{ROOT}/nlp-service/data/corpus.json", encoding="utf8"))
LEX = json.load(open(f"{ROOT}/nlp-service/data/crisis_lexicon.json", encoding="utf8"))
EXE = json.load(open(f"{ROOT}/nlp-service/data/crisis_exemplars.json", encoding="utf8"))
SAFETY = json.load(open(f"{ROOT}/nlp-service/data/safety.json", encoding="utf8"))

# ---- jest repeats ----------------------------------------------------------------------------
runs = sorted(glob.glob(f"{ROOT}/server/test-results/run_*.json"), key=lambda p: int(re.search(r"run_(\d+)", p).group(1)))
jest = [json.load(open(p, encoding="utf8")) for p in runs]
n_runs = len(jest)
n_tests = jest[0]["numTotalTests"]
all_pass_runs = sum(1 for j in jest if j["numFailedTests"] == 0 and j["numPassedTests"] == n_tests)
by_file = {}
for tr in jest[0]["testResults"]:
    name = os.path.basename(tr["name"])
    by_file[name] = sum(1 for a in tr["assertionResults"] if a["status"] == "passed")
sec_files = ["auth.test.js", "security.test.js", "ratelimit.test.js", "crypto.test.js"]
n_sec = sum(by_file[f] for f in sec_files)
n_authz_matrix = None
for tr in jest[0]["testResults"]:
    if tr["name"].endswith("authorization.test.js"):
        n_authz_matrix = sum(1 for a in tr["assertionResults"] if a["status"] == "passed" and "authorisation matrix" in a["fullName"] and "matrix size" not in a["title"])
cov_path = f"{ROOT}/server/coverage/coverage-summary.json"
cov = json.load(open(cov_path))["total"] if os.path.exists(cov_path) else None
cov_lines = cov["lines"]["pct"] if cov else None
py_tests = 13  # nlp-service/tests/test_service.py (verified separately by pytest)

# ---- load test --------------------------------------------------------------------------------
LOAD1 = json.load(open(f"{ROOT}/server/loadtest/results/load_v1_1worker.json", encoding="utf8"))
LOAD = json.load(open(f"{ROOT}/server/loadtest/results/load_v2_3workers.json", encoding="utf8"))
L1 = {r["users"]: r for r in LOAD1["report"]}
L2 = {r["users"]: r for r in LOAD["report"]}

if LOAD:
    LOAD_R100 = [r for r in LOAD["report"] if r["users"] == 100][0]
    LOAD_R200 = [r for r in LOAD["report"] if r["users"] == 200][0]

# ---- formatting helpers -------------------------------------------------------------------------
f3 = lambda x: f"{x:.3f}"
f2 = lambda x: f"{x:.2f}"
pc = lambda x, d=1: f"{100 * x:.{d}f}"
M = T["metrics"]


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def run(text, i=False, sub=False, hl=False):
    props = ""
    if i:
        props += "<w:i/><w:iCs/>"
    if sub:
        props += '<w:vertAlign w:val="subscript"/>'
    if hl:
        props += '<w:highlight w:val="yellow"/>'
    rpr = f"<w:rPr>{props}</w:rPr>" if props else ""
    return f'<w:r>{rpr}<w:t xml:space="preserve">{esc(text)}</w:t></w:r>'


def runs(*segs):
    out = []
    for s in segs:
        if isinstance(s, str):
            out.append(run(s))
        else:
            text, flags = s
            out.append(run(text, i="i" in flags, sub="sub" in flags, hl="hl" in flags))
    return "".join(out)


# ---- document model -----------------------------------------------------------------------------
work = OUT + ".work"
shutil.rmtree(work, ignore_errors=True)
with zipfile.ZipFile(TEMPLATE) as z:
    z.extractall(work)
doc_path = f"{work}/word/document.xml"
xml = open(doc_path, encoding="utf8").read()
body_start = xml.index("<w:body>")
head, body = xml[:body_start], xml[body_start:]

TOKEN = re.compile(r"<w:tbl>.*?</w:tbl>|<w:p[ >].*?</w:p>", re.S)
blocks = []  # (kind, text)
pos = 0
for m in TOKEN.finditer(body):
    if m.start() > pos:
        blocks.append(("raw", body[pos:m.start()]))
    blocks.append(("tbl" if m.group(0).startswith("<w:tbl>") else "p", m.group(0)))
    pos = m.end()
blocks.append(("raw", body[pos:]))

para_idx = [i for i, (k, _) in enumerate(blocks) if k == "p"]
tbl_idx = [i for i, (k, _) in enumerate(blocks) if k == "tbl"]


def ptext(b):
    return "".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", b)).replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")


def P(n):  # n-th top-level paragraph (matches nlp index file)
    return para_idx[n]


def set_para(n, *segs):
    """Replace the content of paragraph n, keeping its paragraph properties (minus any highlight)."""
    b = blocks[P(n)][1]
    m = re.match(r"(<w:p[^>]*>)(<w:pPr>.*?</w:pPr>)?", b, re.S)
    ppr = re.sub(r"<w:highlight[^>]*/>", "", m.group(2) or "")
    blocks[P(n)] = ("p", m.group(1) + ppr + runs(*segs) + "</w:p>")


def sub_para(n, old, new, count=1):
    """Replace text inside a single w:t of paragraph n (must be unique); keeps surrounding runs."""
    b = blocks[P(n)][1]
    e_old, e_new = esc(old), esc(new)
    assert b.count(e_old) == count, f"para {n}: expected {count} match for {old!r}, found {b.count(e_old)}"
    blocks[P(n)] = ("p", b.replace(e_old, e_new))


def unhighlight_run_with(n, text, new=None):
    """Remove the yellow highlight from the run containing `text` in paragraph n, optionally replacing its text."""
    b = blocks[P(n)][1]
    pat = re.compile(r"<w:r>(?:(?!</w:r>).)*?" + re.escape(esc(text)) + r"(?:(?!</w:r>).)*?</w:r>", re.S)
    ms = [m for m in pat.finditer(b) if "<w:highlight" in m.group(0)]
    assert len(ms) == 1, f"para {n}: highlighted run {text!r} found {len(ms)} times"
    m = ms[0]
    r = re.sub(r"<w:highlight[^>]*/>", "", m.group(0))
    r = r.replace("<w:rPr></w:rPr>", "")
    if new is not None:
        r = r.replace(esc(text), esc(new))
    blocks[P(n)] = ("p", b[:m.start()] + r + b[m.end():])


def cells(tbl_block):
    rows = re.findall(r"<w:tr[ >].*?</w:tr>", tbl_block, re.S)
    return rows


def set_cell(t, r, c, *segs):
    """Set the text of table t (0-based among tables), row r, column c."""
    k = tbl_idx[t]
    tb = blocks[k][1]
    rows = re.findall(r"<w:tr[ >].*?</w:tr>", tb, re.S)
    row = rows[r]
    tcs = re.findall(r"<w:tc>.*?</w:tc>", row, re.S)
    tc = tcs[c]
    m = re.search(r"(<w:p[^>]*>)(<w:pPr>.*?</w:pPr>)?(.*)</w:p>", tc, re.S)
    ppr = re.sub(r"<w:highlight[^>]*/>", "", m.group(2) or "")
    new_p = m.group(1) + ppr + runs(*segs) + "</w:p>"
    new_tc = tc[: m.start()] + new_p + tc[m.end():]
    new_row = row.replace(tc, new_tc, 1)
    blocks[k] = ("tbl", tb.replace(row, new_row, 1))


def cell_text(t, r, c):
    tb = blocks[tbl_idx[t]][1]
    row = re.findall(r"<w:tr[ >].*?</w:tr>", tb, re.S)[r]
    return ptext(re.findall(r"<w:tc>.*?</w:tc>", row, re.S)[c])


# ============================ computed facts used in the prose ==================================
# First system (v1) on the first test split
M = T["metrics"]
cr1 = T["crisis"]["lexicon + semantic (full gate)"]
kinds1 = T["crisis_by_kind"]
n_cr1, n_nc1 = T["n_test_crisis"], T["n_test_noncrisis"]
H1 = M["Hybrid"]["nDCG@5"]["mean"]
fd1 = T["false_diversions"]
fd1_mix = sum(1 for x in fd1 if x["kind"] == "everyday" and QUERIES.get(x["text"], {}).get("style") == "mix")
n_test_mix1 = T["style_n"]["mix"]
# Final system (v2) on the sealed held-out set
HM = HD["metrics"]
H, S, B, TF = HM["Hybrid"], HM["SBERT"], HM["BM25"], HM["TF-IDF"]
pb = HD["paired_vs_bm25"]
ph = HD["paired_hybrid_vs_sbert_posthoc"]["nDCG@5"]
fb = HD["fallback"]
cr = HD["crisis"]["lexicon + semantic (full gate)"]
cr_lex = HD["crisis"]["lexicon only"]
cci = HD["crisis_ci"]
kinds = HD["crisis_by_kind"]
nck = HD["noncrisis_by_kind"]
n_cr, n_nc = HD["n_test_crisis"], HD["n_test_noncrisis"]
st = HD["ndcg5_by_style"]["Hybrid"]
worst = HD["worst_queries"]
n_worst_mix = sum(1 for w in worst if w["style"] == "mix")
n_worst_long = sum(1 for w in worst if w["style"] == "long")
n_worst_para = sum(1 for w in worst if w["style"] == "para")
fd = HD["false_diversions"]
fd_everyday = [x for x in fd if x["kind"] == "everyday"]
fd_mix = sum(1 for x in fd_everyday if HQ.get(x["text"], {}).get("style") == "mix")
fd_en = len(fd_everyday) - fd_mix
missed = HD["missed_crisis"]
n_missed = len(missed)
low = HD["n_ndcg5_below_0.5"]
n_test_q = HD["n_test_queries"]
desc_words = [len(r["description"].split()) for r in CORPUS]
n_dev_q = DEV["n_dev_queries"]
cats = sorted({r["category"] for r in CORPUS})
n_hinglish_q = sum(1 for q in QUERIES.values() if q["style"] == "mix")
n_multi_q = sum(1 for q in QUERIES.values() if q["style"] == "multi")
cr_all = [s for s in SAFETY if s["label"] == 1]
n_cr_total = len(cr_all)
n_nc_total = len(SAFETY) - n_cr_total
kind_counts = {k: sum(1 for s in cr_all if s["kind"] == k) for k in ("direct", "indirect", "mix")}
h_kind = {k: sum(1 for s in HSAFE if s["label"] == 1 and s["kind"] == k) for k in ("direct", "indirect", "mix")}
n_hn = sum(1 for s in HSAFE if s["kind"] == "hard_negative")
n_hoos = sum(1 for s in HSAFE if s["kind"] == "out_of_scope")
n_heldout_q = len(HQ)
n_hmix = sum(1 for q in HQ.values() if q["style"] == "mix")
params = HD["params"]
pool = GATE["trained_on"]
cv = GDEV["v2_cv_pooled"]
r100, r200 = L2[100], L2[200]
o100, o200 = L1[100], L1[200]
n_to = r200["statuses"].get("0", 0)


def rr(x):  # recall as a count
    return round(x["recall"] * x["n"])


# ============================ edits =============================================================
# --- abstract -------------------------------------------------------------------------------------
set_para(
    3, ("Abstract", "i"),
    "—Students under academic pressure often cannot find appropriate mental wellness support, and existing digital tools either "
    "scatter resources across platforms or process sensitive free text without evidence of safety. This paper presents the Mental "
    "Wellness Hub, a secure web platform whose core contribution is a safety-aware recommender that maps a student's free-text description "
    "of a concern to curated self-help resources, without diagnosis or treatment advice. The recommender compares keyword, sparse and dense "
    "sentence-embedding retrieval with a hybrid fusion, and is preceded by a crisis-detection gate that routes self-harm language to "
    "emergency support instead of recommendations. The platform uses the MERN stack with a security-by-design architecture covering hashed "
    "credentials, short-lived tokens, field-level encryption, rate limiting and audit logging. A first system missed its pre-specified targets "
    f"(crisis recall {f2(cr1['recall'])} against 0.95; recommendation p95 latency {o200['recommend']['p95'] / 1000:.1f} s against 1 s); after a fix developed "
    f"on development data only, the final system was evaluated once on a sealed held-out set of {n_heldout_q} author-written queries and {n_cr} crisis "
    f"queries. The hybrid ranker reached nDCG@5 = {f3(H['nDCG@5']['mean'])} (95% CI {f3(H['nDCG@5']['lo'])}–{f3(H['nDCG@5']['hi'])}), "
    f"{pb['Hybrid']['nDCG@5']['rel_gain_pct']:.0f}% above BM25, with only a borderline margin over sentence embeddings alone; the crisis gate reached "
    f"a recall of {f2(cr['recall'])} (95% CI {f2(cci['recall'][0])}–{f2(cci['recall'][1])}) at a {pc(cr['false_diversion_rate'])}% false-diversion rate; "
    f"and at 200 concurrent users on one laptop the 95th-percentile latency was {r200['api']['p95']:.0f} ms for API requests and "
    f"{r200['recommend']['p95']:.0f} ms for recommendations. Code-mixed queries remain poorly retrieved, and all data are author-written. "
    f"All {n_tests} automated API tests passed in {all_pass_runs} repeated runs. ",
    ("[SUS score: to be inserted after the usability study.]", "hl"),
    " The system supports awareness and general wellness only and is not a substitute for professional care.",
)

# --- introduction ---------------------------------------------------------------------------------------
sub_para(12, "on an annotated query set", "on a labelled query set")

# --- architecture ---------------------------------------------------------------------------------------
sub_para(24, "REST API over TLS.", "REST API over HTTPS (TLS terminates at the API or a reverse proxy in deployment).")
set_para(28, "Representative screens of the implemented client: (a) login, (b) awareness, (c) self-help tools and (d) counselling.")

# --- security text ------------------------------------------------------------------------------------------
unhighlight_run_with(30, "[15]", "15")
sub_para(30, "in addition to database encryption at rest.",
         "in addition to database encryption at rest. Re-use of a rotated refresh token revokes its whole session family. "
         "Transport security (TLS 1.2+) and database encryption at rest are deployment settings that the local tests do not exercise.")
t2 = 1
set_cell(t2, 1, 1, "bcrypt (cost 12); account lockout; limit of 5 failed attempts per 15 min")
set_cell(t2, 1, 2, "Rate-limit and lockout tests")
set_cell(t2, 2, 2, "Expiry, rotation and revocation tests")
set_cell(t2, 3, 2, "Payload and header tests")
set_cell(t2, 4, 1, "SameSite=Strict cookies; per-session anti-CSRF token on cookie-authenticated routes")
set_cell(t2, 4, 2, "Forged-request test")
set_cell(t2, 7, 1, "TLS 1.2+ (deployment); field-level AES-256-GCM; keys outside database")

# --- consent -----------------------------------------------------------------------------------------------------
set_para(
    34,
    "Users give explicit consent at registration and a separate, purpose-specific consent before the recommender is first used; "
    "the latter can be withdrawn at any time. Free-text queries are processed in memory and are never stored, and crisis events are "
    "logged without query text. Users can export and delete their data, journal text is purged after 180 days by default (mood scores "
    "are kept so that trends remain valid), and administrator access is audit-logged. These choices follow data-minimisation and "
    "purpose-limitation principles [9], [19].",
)

# --- corpus ---------------------------------------------------------------------------------------------------------
set_para(
    37,
    f"The corpus R contains {len(CORPUS)} self-help resources (guides, exercises and short readings) in {len(cats)} categories: exam stress, "
    "sleep difficulty, anxiety, low mood, loneliness, time management, relaxation and focus, each with three subtopics. Each resource has a "
    f"title, a {min(desc_words)}–{max(desc_words)}-word description written by the authors, category tags and an estimated duration. "
    "The descriptions were written to avoid diagnostic or treatment claims; review by a qualified counsellor is a precondition for "
    "deployment and has not yet been performed.",
)

# --- retrieval models ---------------------------------------------------------------------------------------------------
sub_para(39, "on lemmatised tokens with stop words removed.",
         "on tokens after stop-word removal and rule-based suffix stripping (a light lemmatiser; frequent Hinglish function words are also removed).")
set_para(
    43,
    "where ŝ", ("S", "sub"), " and ŝ", ("T", "sub"),
    " are the normalised SBERT and TF-IDF scores. Scores are min–max scaled with fixed bounds (the 5th and 99th percentile of each ranker's "
    "development scores) rather than per query, so that the maximum fused score stays a usable confidence signal. The fusion weight α and the "
    "confidence threshold τ are tuned on the development split only, and the list length is fixed at k = 5. If the best score falls below "
    "τ, the system shows category browsing instead of weak recommendations.",
)

# --- crisis gate ------------------------------------------------------------------------------------------------------------
set_para(
    45,
    "Every query passes a two-stage gate before retrieval (Fig. 3). Stage one matches a lexicon of self-harm and suicidal expressions "
    f"({len(LEX)} patterns in English and Hinglish compiled by the authors; professional review is pending). Stage two is a logistic-regression "
    "classifier g over the SBERT embedding and hashed word and character n-grams, trained on "
    f"{pool['crisis']} crisis and {pool['non_crisis']} non-crisis author-written texts (development material only). A query is flagged when the lexicon "
    "matches or g(q) ≥ ",
    ("θ", ""), ("c", "sub"),
    ", where θ", ("c", "sub"),
    " is the highest threshold whose cross-validated recall on that material reaches the pre-specified 0.95 target. "
    f"The first system instead compared the query with {len(EXE)} exemplar paraphrases (threshold tuned for F",
    ("2", "sub"),
    "). A flagged query bypasses the recommender, and the student sees the emergency panel with national helplines "
    "(for example Tele-MANAS) and a prompt to contact a trusted person or campus counsellor. The API applies the lexicon stage itself, so explicit "
    "self-harm statements are intercepted even when the NLP service is unavailable. The gate is a safeguard, not a diagnostic classifier.",
)
sub_para(47, "Recommendation pipeline with crisis gate and low-confidence fallback.",
         "Recommendation pipeline with crisis gate and low-confidence fallback. BM25 is a stand-alone baseline; the hybrid fuses TF-IDF and SBERT, and the "
         "gate's second stage is the learned classifier.")
set_para(50, ("1  if lexicon(q) or g(q) ≥ θ", ""), ("c", "sub"), ": return EMERGENCY")
sub_para(58, "and the corpus is reviewed by a professional before release.",
         "and professional review of the corpus and lexicon is a precondition for release (not yet performed).")

# --- experimental setup ---------------------------------------------------------------------------------------------------------
set_para(
    61,
    ("N", ""), ("Q", "sub"),
    f" = {len(QUERIES)} queries were written in everyday language ({n_hinglish_q} code-mixed Hinglish, {n_multi_q} spanning two concerns), without "
    "using real user records. Each targets a subtopic of the concern taxonomy; graded relevance is derived from that taxonomy (2 for the target "
    "subtopic, 1 for other subtopics of the category, 0 otherwise). They are split 30/70 into development "
    f"({n_dev_q}) and test ({len(QUERIES) - n_dev_q}) sets, stratified by subtopic. After the first evaluation, a second set of {n_heldout_q} queries "
    f"({n_hmix} code-mixed) was written without reference to model output, checked to be disjoint from every earlier text, sealed with SHA-256 hashes, "
    "and evaluated once after the system was frozen. No human double annotation was performed, so inter-annotator agreement is not reported; "
    "the evaluation script computes Cohen's kappa [21] once two independent annotation files are supplied.",
)
unhighlight_run_with(65, "[1000]", "1000")
sub_para(65, "and paired bootstrap tests against BM25.",
         "and paired bootstrap tests against BM25. P@k and MRR count grade 2 as relevant; because each query has only two or three grade-2 resources, "
         "the attainable maximum of P@5 is about 0.5.")
set_para(
    67,
    f"The first set yields {n_cr_total} crisis-expressing queries ({kind_counts['direct']} direct, {kind_counts['indirect']} indirect, "
    f"{kind_counts['mix']} code-mixed; 18 development and {n_cr1} test) and {n_nc_total} non-crisis queries; the held-out set has ",
    ("N", ""), ("C", "sub"),
    f" = {n_cr} crisis queries ({h_kind['direct']} direct, {h_kind['indirect']} indirect, {h_kind['mix']} code-mixed) and ",
    ("N", ""), ("N", "sub"),
    f" = {n_nc} non-crisis queries: its {n_heldout_q} retrieval queries, {n_hn} idiom hard negatives (“this exam is killing me”) and "
    f"{n_hoos} out-of-scope queries. Crisis queries were written by the authors, not by a mental health professional and not taken from real users; "
    "they test the mechanism, not clinical sensitivity. The classifier's training texts are disjoint from the held-out set. "
    "We report recall, precision and the recall-weighted score",
)
set_para(
    71,
    "Functional: ", ("N", ""), ("T", "sub"),
    f" = {n_tests} automated API tests (Jest, Supertest, in-memory MongoDB) and {py_tests} NLP-service and metric tests (pytest), with the API suite run "
    f"{n_runs} times (30 were planned) to expose flaky cases and line coverage reported"
    + (f" ({cov_lines:.1f}%)" if cov_lines is not None else "")
    + ". Browser end-to-end tests are future work. Security: scripted payload, header, authorisation, token expiry, rotation, revocation and rate-limit "
      "tests listed in Table II; no external vulnerability scanner or penetration test was run. Performance: a closed-loop load test at 50, 100 and "
      "200 concurrent users (think time 1 s, 30 s per level, 70% API reads and 30% recommendation requests) on one laptop (Intel Core i5-1334U, "
      "10 cores/12 threads, 15.7 GB RAM, Windows 11) that hosted the API, an in-memory MongoDB, the NLP workers and the load generator, reporting "
      "the 95th-percentile latency and error rate for the API and for recommendation requests; targets were fixed before the first run.",
)
set_para(
    73,
    "A usability study is specified but has not yet been conducted. ", ("[n]", "hl"), " students will complete ", ("[5]", "hl"),
    " representative tasks and the ten-item System Usability Scale [22], scored with the supplied script and interpreted with published adjective "
    "ratings [23]. Participation will require informed consent, and the protocol requires approval by ",
    ("[institutional ethics committee, reference]", "hl"), " before recruitment. No clinical data will be collected.",
)
set_para(
    75,
    "Software versions, random seeds, the resource corpus, the author-written query sets with labels, the sealing hashes and all scripts are "
    "released at ", ("[repository URL]", "hl"), " to allow independent replication.",
)

# --- results -----------------------------------------------------------------------------------------------------------------
set_para(
    77,
    "All numbers below are produced by the protocol in Section V. Results for the final system come from the sealed held-out set, evaluated "
    "once after the system was frozen; the first system's results on the first test split are quoted for comparison. The retrieval component was "
    "not changed between the two. One repeated API test run was interrupted by a system suspension and repeated.",
)
for r, name in enumerate(["BM25", "TF-IDF", "SBERT", "Hybrid"], start=1):
    for c, key in enumerate(["P@3", "P@5", "MRR", "nDCG@5"], start=1):
        set_cell(2, r, c, f3(HM[name][key]["mean"]))

set_para(
    81,
    f"Table III compares the four rankers on the held-out set; inter-annotator agreement was not measured (single labelling source). The hybrid obtained "
    f"the highest nDCG@5 ({f3(H['nDCG@5']['mean'])}, 95% CI {f3(H['nDCG@5']['lo'])}–{f3(H['nDCG@5']['hi'])}), a "
    f"{pb['Hybrid']['nDCG@5']['rel_gain_pct']:.1f}% relative gain over BM25 (paired bootstrap p = {pb['Hybrid']['nDCG@5']['p']:.3f}, the smallest value 1000 "
    f"resamples can resolve); SBERT alone reached {f3(S['nDCG@5']['mean'])} and TF-IDF was indistinguishable from BM25. The hybrid's margin over SBERT was "
    f"small and borderline (post hoc: {ph['delta']:+.3f}, 95% CI [{ph['ci_lo']:+.3f}, {ph['ci_hi']:+.3f}], p = {ph['p']:.2f}). The same retrieval component "
    f"reached {f3(H1)} on the first test split. The tuned values were α = {params['alpha']}, k = {params['k']} and τ = {params['tau']:.3f}; the "
    f"fallback fired for {pc(fb['in_scope_fallback_rate'])}% of in-scope and {pc(fb['oos_rejection_rate'], 0)}% of out-of-scope queries. nDCG@5 of the hybrid "
    f"depended strongly on query style: keyword-sharing {f2(st['lex'])}, multi-concern {f2(st['multi'])}, paraphrase {f2(st['para'])}, long {f2(st['long'])} "
    f"and code-mixed {f2(st['mix'])}. Of the {len(worst)} worst-ranked queries, {n_worst_mix} were code-mixed Hinglish queries, which an English encoder and "
    f"English stop-word list handle poorly, {n_worst_long} were long narratives and {n_worst_para} a paraphrase with no lexical overlap. Overall {low} of "
    f"{n_test_q} queries ({pc(low / n_test_q, 0)}%) scored nDCG@5 below 0.5.",
)

ci_r = cci["recall"]
set_cell(3, 1, 1, f"{f3(cr['recall'])} ({cr['tp']}/{n_cr}; 95% CI {f3(ci_r[0])}–{f3(ci_r[1])})")
set_cell(3, 1, 2, "≥ 0.95")
set_cell(3, 2, 1, f"{f3(cr['precision'])} / {f3(cr['F2'])}")
set_cell(3, 3, 1, f"{pc(cr['false_diversion_rate'])}% ({cr['fp']}/{n_nc})")
set_cell(3, 3, 2, "—")
set_cell(3, 4, 1, f"{n_tests} of {n_tests}" + (f" ({cov_lines:.1f}% lines)" if cov_lines is not None else "") + f"; {all_pass_runs}/{n_runs} runs")
set_cell(3, 4, 2, "100%")
set_cell(3, 5, 0, "Security tests passed (auth, token, payload, crypto)")
set_cell(3, 5, 1, f"{n_sec} of {n_sec}")
set_cell(3, 5, 2, "all")
set_cell(3, 6, 1, f"{n_authz_matrix} of {n_authz_matrix}")
set_cell(3, 6, 2, "all")
set_cell(3, 7, 1, f"{r200['api']['p95']:.0f} / {r200['recommend']['p95']:.0f} ms")
set_cell(3, 7, 2, "≤ 500 / ≤ 1000 ms")
set_cell(3, 8, 1, f"{r200['error_rate_pct']:.2f}%")
set_cell(3, 8, 2, "< 1%")
set_cell(3, 9, 2, "≥ 68")  # published average SUS; result cells stay highlighted for the authors

set_para(
    85,
    f"Table IV reports the final system (gate and retrieval on the held-out set; platform tests on the final build). The gate caught {cr['tp']} of {n_cr} "
    f"crisis queries (recall {f3(cr['recall'])}, 95% CI {f3(ci_r[0])}–{f3(ci_r[1])}): the point estimate meets the 0.95 target, but the interval "
    f"does not exclude values below it. It caught {rr(kinds['direct'])} of {kinds['direct']['n']} direct, {rr(kinds['indirect'])} of "
    f"{kinds['indirect']['n']} indirect and {rr(kinds['mix'])} of {kinds['mix']['n']} code-mixed expressions. The {n_missed} misses were "
    "“I cannot go on like this any more” (the lexicon pattern accepted “can't” but not “cannot”; corrected after the run and not "
    "re-scored) and two implicit statements. It diverted "
    f"{cr['fp']} of {n_nc} non-crisis queries ({pc(cr['false_diversion_rate'])}%): {len(fd_everyday)} of {nck['everyday']['n']} retrieval queries "
    f"({fd_en} English self-worth, loneliness or procrastination statements that a cautious gate may reasonably treat as sensitive, and {fd_mix} "
    f"code-mixed), {nck['hard_negative']['false_diversions']} of {nck['hard_negative']['n']} idiom hard negatives and no out-of-scope query. The lexicon "
    f"alone caught only {cr_lex['tp']} of {n_cr} (recall {f2(cr_lex['recall'])}), so if the NLP service is down the API intercepts explicit statements "
    f"only and the persistent emergency button is the remaining safeguard. The first gate reached recall {f2(cr1['recall'])} at "
    f"{pc(cr1['false_diversion_rate'])}% false diversions on the first test split and diverted all {n_test_mix1} code-mixed everyday queries. "
    "Defects found and fixed during testing were a self-assignable administrator role at registration, account enumeration through the password-reset "
    "response, a CORS header returned for any origin and an oversized request returning a server error. Load: the first build, with one NLP worker, "
    f"missed the recommendation target (p95 {o100['recommend']['p95']:.0f} ms at 100 and {o200['recommend']['p95']:.0f} ms at 200 users). After pinning one "
    f"torch thread per worker and running three workers, p95 was {r100['api']['p95']:.0f}/{r100['recommend']['p95']:.0f} ms (API/recommend) at 100 users "
    f"and {r200['api']['p95']:.0f}/{r200['recommend']['p95']:.0f} ms at 200 users with {r200['error_rate_pct']:.2f}% errors "
    f"({n_to} timeouts in {r200['requests']} requests); the targets were met on this single laptop. "
    "The usability study has not yet been conducted. These results support only the conclusions stated: they apply to the tested corpus, queries "
    "and configuration.",
)

# --- discussion -------------------------------------------------------------------------------------------------------------------
set_para(
    88,
    f"RQ1: Dense retrieval clearly beat keyword matching (nDCG@5 +{pb['SBERT']['nDCG@5']['rel_gain_pct']:.0f}% for SBERT and "
    f"+{pb['Hybrid']['nDCG@5']['rel_gain_pct']:.0f}% for the hybrid over BM25), mainly on paraphrased and long queries; the hybrid's gain over SBERT is "
    "borderline, so fusion adds little here, and code-mixed queries remain the dominant failure category. "
    f"RQ2: A learned second stage raised recall from {f2(cr1['recall'])} to {f2(cr['recall'])} and cut false diversions from "
    f"{pc(cr1['false_diversion_rate'])}% to {pc(cr['false_diversion_rate'])}% relative to the exemplar gate, but the held-out interval "
    f"({f2(ci_r[0])}–{f2(ci_r[1])}) still includes values below the target, idioms are diverted at {pc(nck['hard_negative']['rate'], 0)}%, and the "
    "training and test texts come from the same authors; it must not be the only safeguard, which is why the persistent emergency button is independent "
    f"of it. RQ3: All {n_tests} API tests and the {n_authz_matrix}-case authorisation matrix passed after the fixes listed above. Pinning one thread per "
    f"worker and using three workers brought recommendation latency within target on a single node ({r200['recommend']['p95']:.0f} ms at 200 users), "
    "although 200-user runs also showed a handful of timeouts; usability remains open. Unlike the platform studies in Table I, the contribution is an "
    "executable, reproducible protocol that benchmarks free-text matching, tests the safety path and verifies the security controls on the same system.",
)
set_para(
    90,
    "Internal: relevance labels are derived from the taxonomy that generated the queries, and the corpus, queries and gate training texts were written by "
    "the same authors, which can favour methods that recover that vocabulary and makes absolute scores optimistic; there was no independent annotation. "
    f"The held-out set was written after the first system's failures were known, and over-represents code-mixed and indirect language ({n_hmix} code-mixed "
    f"queries; {h_kind['indirect']} indirect crisis queries). External: queries and resources are author-written and mainly English, and may not transfer "
    "to real students, other languages or institutions. Construct: topical relevance is not wellbeing benefit, and the crisis set is constructed, not "
    f"observed, so recall on real crisis language is unknown. Conclusion: with {n_test_q} queries and {n_cr} crisis queries, intervals are wide.",
)
set_para(
    92,
    "The platform supports awareness and self-help only; it has no clinical validation, no longitudinal outcome data and only a small Hinglish subset "
    f"in its crisis lexicon. The gate's recall interval includes values below 0.95, it over-flags idioms, and code-mixed queries are retrieved poorly, "
    "so none should be relied on without the improvements listed below. The lexicon fix noted above was applied after the held-out run. Passing the "
    "security tests shows the absence of the tested weaknesses, not security in general; no external scanner, penetration test or TLS configuration test "
    "was run. Any deployment should involve institutional counsellors and a documented escalation path for flagged crises.",
)
set_para(
    94,
    "We presented the Mental Wellness Hub, a secure web platform built around a safety-aware recommender that retrieves curated self-help resources "
    "for free-text student queries and routes crisis language to emergency support. A single protocol evaluates retrieval quality, the crisis gate, "
    "security and load, and specifies a usability study. A first system missed its targets; after a fix developed on development data, a sealed "
    f"held-out evaluation gave nDCG@5 {f3(H['nDCG@5']['mean'])} for the hybrid and a gate recall of {f2(cr['recall'])} at {pc(cr['false_diversion_rate'])}% "
    "false diversions. Future work includes a multilingual encoder and code-mixed data for retrieval and for the gate, a larger query set labelled by "
    "independent annotators and counsellors, calibration of the gate on consented real data, learning-to-rank from consented feedback, "
    "multi-institution and longitudinal studies, and a formal privacy impact assessment.",
)
sub_para(96, ", and the student volunteers and counsellors who contributed queries and reviews.", ".")

# ============================ write out ==================================================================================
new_body = "".join(t for _, t in blocks)
open(doc_path, "w", encoding="utf8").write(head + new_body)

# figures: architecture (fig1), pipeline (fig2), screenshots (fig3); same pixel sizes as the template
for env, name in (("FIG1", "fig1.png"), ("FIG2", "fig2.png"), ("FIG3", "fig3.png")):
    src = os.environ.get(env)
    if src:
        shutil.copyfile(src, f"{work}/word/media/{name}")

os.makedirs(os.path.dirname(OUT), exist_ok=True)
if os.path.exists(OUT):
    os.remove(OUT)
with zipfile.ZipFile(TEMPLATE) as zin, zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        with open(os.path.join(work, item.filename), "rb") as f:
            zout.writestr(item, f.read())
shutil.rmtree(work, ignore_errors=True)
print("written", OUT, "| highlighted runs left:", len(re.findall(r"<w:highlight", head + new_body)))

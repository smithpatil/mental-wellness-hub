"""Builds a submission version of the author's edited paper with NO yellow placeholders.
Changes only: abstract (grammar fixed, SUS sentence removed), usability section (planned work),
reproducibility sentence (no URL placeholder), and removal of the unfilled SUS row of Table IV."""
import re, shutil, sys, zipfile, os

SRC, OUT = sys.argv[1], sys.argv[2]
work = OUT + ".work"
shutil.rmtree(work, ignore_errors=True)
with zipfile.ZipFile(SRC) as z:
    z.extractall(work)
path = f"{work}/word/document.xml"
x = open(path, encoding="utf8").read()

esc = lambda s: s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
run = lambda t, i=False: (f'<w:r><w:rPr><w:i/><w:iCs/></w:rPr><w:t xml:space="preserve">{esc(t)}</w:t></w:r>' if i
                          else f'<w:r><w:t xml:space="preserve">{esc(t)}</w:t></w:r>')
text_of = lambda b: "".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", b))


def rewrite(block, new_runs):
    m = re.match(r"(<w:p[^>]*>)(<w:pPr>.*?</w:pPr>)?", block, re.S)
    ppr = re.sub(r"<w:highlight[^>]*/>", "", m.group(2) or "")
    return m.group(1) + ppr + new_runs + "</w:p>"


ABSTRACT = (
    "Students under academic pressure often cannot find appropriate mental wellness support, and existing digital tools either scatter "
    "resources across platforms or process sensitive free text without evidence of safety. This paper presents the Mental Wellness Hub, a "
    "secure web platform whose core contribution is a safety-aware recommender that maps a student's free-text description of a concern to "
    "curated self-help resources, without diagnosis or treatment advice. The recommender compares keyword, sparse and dense "
    "sentence-embedding retrieval with a hybrid fusion, and is preceded by a crisis-detection gate that routes self-harm language to "
    "emergency support instead of recommendations. The platform uses the MERN stack with a security-by-design architecture: hashed "
    "credentials, short-lived tokens, field-level encryption, rate limiting and audit logging. A first system missed its pre-specified "
    "targets (crisis recall 0.76 against 0.95; recommendation p95 latency 4.8 s against 1 s). After a fix developed on development data "
    "only, the final system was evaluated once on a sealed held-out set of 128 author-written queries and 60 crisis queries. The hybrid "
    "ranker reached nDCG@5 = 0.518 (95% CI 0.465\u20130.564), 30% above BM25, with only a borderline margin over sentence embeddings alone. "
    "The crisis gate reached a recall of 0.95 (95% CI 0.88\u20131.00) at a 7.1% false-diversion rate. At 200 concurrent users on one laptop "
    "the 95th-percentile latency was 363 ms for API requests and 346 ms for recommendations. Code-mixed queries remain poorly retrieved, "
    "and all data are author-written. All 194 automated API tests passed in 19 repeated runs. A usability study is specified but has not "
    "yet been conducted. The system supports awareness and general wellness only and is not a substitute for professional care."
)
USABILITY = (
    "A usability study is specified but has not yet been conducted, and no usability results are reported. The planned protocol has "
    "students complete five representative tasks (registering, a breathing exercise, logging a mood entry, finding a resource through "
    "the suggestion box and requesting a counselling session) and the ten-item System Usability Scale [22], scored with the supplied "
    "script and interpreted with published adjective ratings [23]. Participation will require informed consent and prior approval by the "
    "responsible institutional ethics body. No clinical data will be collected."
)
REPRO = (
    "Software versions, random seeds, the resource corpus, the author-written query sets with labels, the sealing hashes and all "
    "scripts will be released publicly with the final version of this paper and are available from the authors on request, to allow "
    "independent replication."
)

blocks = list(re.finditer(r"<w:p[ >].*?</w:p>", x, re.S))
changed = {"abstract": 0, "usability": 0, "repro": 0}
for m in reversed(blocks):
    b = m.group(0)
    t = text_of(b)
    new = None
    if t.startswith("Abstract") and "<w:highlight" in b:
        new = rewrite(b, run("Abstract", i=True) + run("\u2014" + ABSTRACT)); changed["abstract"] += 1
    elif "[institutional ethics committee" in t:
        new = rewrite(b, run(USABILITY)); changed["usability"] += 1
    elif "[repository URL]" in t:
        new = rewrite(b, run(REPRO)); changed["repro"] += 1
    if new:
        x = x[:m.start()] + new + x[m.end():]

# drop the unfilled SUS row from Table IV
rows = list(re.finditer(r"<w:tr[ >].*?</w:tr>", x, re.S))
removed = 0
for m in reversed(rows):
    if "SUS score, mean" in text_of(m.group(0)):
        x = x[:m.start()] + x[m.end():]
        removed += 1

open(path, "w", encoding="utf8").write(x)
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
if os.path.exists(OUT):
    os.remove(OUT)
with zipfile.ZipFile(SRC) as zin, zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        zout.writestr(item, open(os.path.join(work, item.filename), "rb").read())
shutil.rmtree(work, ignore_errors=True)
print("changed:", changed, "| SUS rows removed:", removed, "| highlights left:", len(re.findall(r"<w:highlight", x)))

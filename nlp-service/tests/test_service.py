import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app, state  # noqa: E402
from mwh_nlp.preprocess import lemmas, tokenize  # noqa: E402
from eval.metrics import cohens_kappa, ndcg_at_k, precision_at_k, reciprocal_rank, paired_bootstrap  # noqa: E402


@pytest.fixture(scope="module")
def client():
    os.environ.pop("NLP_SERVICE_KEY", None)
    with TestClient(app) as c:
        yield c


def post(client, text, **kw):
    return client.post("/recommend", json={"text": text, **kw})


# --- safety gate -------------------------------------------------------------------------------
def test_direct_crisis_language_bypasses_recommender(client):
    r = post(client, "I want to kill myself").json()
    assert r["status"] == "EMERGENCY"
    assert r["results"] == []
    assert any(h["number"] == "14416" for h in r["helplines"])  # Tele-MANAS


def test_idiom_is_not_flagged_by_lexicon(client):
    gate = state["rec"].gate
    assert not gate.lexicon_hit("this exam is killing me")
    assert not gate.lexicon_hit("how do I kill time between classes")


def test_code_mixed_crisis_lexicon(client):
    assert state["rec"].gate.lexicon_hit("mujhe jeene ka mann nahi hai ab")


# --- retrieval ---------------------------------------------------------------------------------
def test_exam_query_returns_exam_resources_with_explanation(client):
    r = post(client, "I am panicking because my exam is tomorrow and I have not revised").json()
    assert r["status"] == "OK"
    assert len(r["results"]) == 5
    assert r["results"][0]["category"] == "exam_stress"
    assert {"matched_terms", "matched_tags", "category"} <= set(r["results"][0]["why"])


def test_results_are_corpus_items_only(client):
    ids = {x["id"] for x in state["rec"].corpus}
    r = post(client, "trouble falling asleep at night").json()
    assert r["status"] == "OK"
    assert {x["id"] for x in r["results"]} <= ids


def test_out_of_scope_query_falls_back_to_category_browse(client):
    r = post(client, "what is the capital of Australia").json()
    assert r["status"] == "CATEGORY_BROWSE"
    assert len(r["categories"]) == 8


# --- validation / auth -------------------------------------------------------------------------
def test_empty_and_overlong_input_rejected(client):
    assert post(client, "").status_code == 422
    assert post(client, "x" * 1001).status_code == 422


def test_internal_key_enforced(client):
    os.environ["NLP_SERVICE_KEY"] = "secret"
    try:
        assert post(client, "exam stress").status_code == 401
        ok = client.post("/recommend", json={"text": "exam stress"}, headers={"X-Internal-Key": "secret"})
        assert ok.status_code == 200
    finally:
        os.environ.pop("NLP_SERVICE_KEY", None)


def test_service_keeps_no_query_text_in_memory(client):
    post(client, "a very distinctive query string about sleep zzqx")
    enc = state["rec"].hybrid.sbert.encoder
    assert enc._cache is None  # no cache: query text is not retained


# --- preprocessing & metrics -------------------------------------------------------------------
def test_preprocessing_stopwords_and_lemmas():
    assert lemmas("I am sleeping badly") == ["sleep", "badly"]
    assert [s for s, _ in tokenize("the and of")] == []


def test_metrics_known_values():
    grades = [2, 0, 1, 0]
    order = [0, 1, 2, 3]
    assert precision_at_k(order, grades, 2) == 0.5
    assert reciprocal_rank(order, grades) == 1.0
    assert ndcg_at_k([1, 0, 2, 3], grades, 3) < 1.0
    assert abs(ndcg_at_k([0, 2, 1, 3], grades, 4) - 1.0) < 1e-9  # ideal ordering


def test_kappa_perfect_and_chance():
    assert cohens_kappa([0, 1, 2, 1], [0, 1, 2, 1]) == 1.0
    assert abs(cohens_kappa([0, 0, 1, 1], [0, 1, 0, 1])) < 1e-9


def test_paired_bootstrap_detects_clear_difference():
    a = [0.9] * 40
    b = [0.2] * 40
    d, lo, hi, p = paired_bootstrap(a, b, n_boot=200)
    assert d > 0.6 and lo > 0 and p < 0.05

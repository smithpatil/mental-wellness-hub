"""FastAPI NLP service (private network). Run:  uvicorn app.main:app --port 8001

Endpoints
  GET  /health
  POST /recommend   {text, k?}  -> {status: OK | EMERGENCY | CATEGORY_BROWSE | INVALID, results, ...}
Query text is processed in memory and never logged or stored by this service.
"""
import json
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from mwh_nlp.crisis import make_gate  # noqa: E402
from mwh_nlp.rankers import Encoder, Hybrid, Sbert, Scaler, TfIdf  # noqa: E402
from mwh_nlp.recommender import Recommender  # noqa: E402

state: dict = {}


def _load(name):
    return json.loads((ROOT / "data" / name).read_text(encoding="utf8"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # One intra-op thread per worker: under concurrent requests the default (all cores) oversubscribes the CPU.
    # Scale out with `uvicorn --workers N` instead.
    import torch
    torch.set_num_threads(int(os.environ.get("MWH_TORCH_THREADS", "1")))
    params = json.loads((ROOT / "config" / "params.json").read_text(encoding="utf8"))
    corpus = _load("corpus.json")
    encoder = Encoder(params.get("encoder", Sbert.MODEL))
    hybrid = Hybrid(Sbert(corpus, encoder), TfIdf(corpus), params["alpha"],
                    Scaler(**params["scaler_sbert"]), Scaler(**params["scaler_tfidf"]))
    gate = make_gate(_load("crisis_lexicon.json"), _load("crisis_exemplars.json"), encoder, params, ROOT / "config",
                     os.environ.get("MWH_GATE_VERSION", "auto"))
    state["rec"] = Recommender(corpus, hybrid, gate, params["tau"], params["k"])
    state["params"] = params
    state["gate_version"] = gate.version
    yield
    state.clear()


app = FastAPI(title="Mental Wellness Hub NLP service", version="1.0.0", lifespan=lifespan,
              docs_url=None, redoc_url=None)


def require_key(x_internal_key: str | None = Header(default=None)):
    expected = os.environ.get("NLP_SERVICE_KEY")
    if expected and x_internal_key != expected:
        raise HTTPException(status_code=401, detail="unauthorised")


class RecommendIn(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)
    k: int | None = Field(default=None, ge=1, le=10)


@app.get("/health")
def health():
    return {"ok": "rec" in state, "gate": state.get("gate_version")}


@app.post("/recommend", dependencies=[Depends(require_key)])
def recommend(body: RecommendIn):
    return state["rec"].recommend(body.text, body.k)

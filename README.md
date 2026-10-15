# Mental Wellness Hub

A web-based mental wellness platform that brings **mental health awareness, self-help tools, counselling support and emergency help** into one calm place. It also includes an **NLP-based recommender** that suggests self-help resources from a short description of how you feel.

> **Disclaimer:** This platform is for awareness and general wellness only. It does not diagnose conditions or provide treatment, and it is not a substitute for professional care. In an emergency call **112**, or a helpline listed in the app.

Built with the MERN stack, plus a Python NLP service: **React + Tailwind CSS** (frontend), **Node.js + Express** (API), **MongoDB** (database), **Python FastAPI + sentence-transformers** (recommender).

## Features

| Module | What it does |
|---|---|
| **Authentication** | Signup, login, logout, forgot/reset password, bcrypt (cost 12), 15-minute access tokens held in memory, rotating httpOnly refresh cookie with revocation, CSRF token, lockout and rate limiting, role-based access (user / counselor / admin) |
| **Awareness** | Plain-language guide: signs to notice, myths vs facts, everyday habits, when to reach out |
| **Self-help tools** | Guided breathing (4-4-6), gratitude journal (saved), memory game, relaxation soundscapes (rain / ocean / forest) |
| **Mood & journal** | Daily check-in, encrypted private journal entries, 7-day trend chart, history, CSV export |
| **NLP recommender** | Describe how you feel, or pick topics, and get ranked resources with a "why this?" explanation. Consent-gated, crisis-gated, retrieval-only (see below) |
| **Resource library** | Searchable, filterable articles, videos and courses |
| **Counselling** | Browse counsellors by focus area, book a session with date/time, view and cancel your sessions |
| **Emergency help** | "Need help now?" button on every page, helpline numbers, 5-4-3-2-1 grounding, how to help a friend |
| **Community** | Anonymous forum with topics, replies, likes and reporting |
| **Progress** | Points, streaks, weekly goals and badges |
| **Chat companion** | AI wellness assistant (Groq) with safety-focused system prompt |
| **Admin dashboard** | Analytics, user management, counsellor CRUD, appointments, forum moderation (all admin actions audit-logged) |
| **Privacy & data** | Consent withdrawal, data export, account erasure, 180-day journal retention |

### How the NLP recommender works

The recommender is a separate Python service (`nlp-service/`, see its README). It is **retrieval-only**: it returns existing, reviewed resources and never generates advice.

```
query -> consent check -> crisis gate (lexicon + semantic) -> hybrid retrieval -> low-confidence fallback -> top-k + "why this?"
```

1. **Crisis gate** runs first. A self-harm lexicon plus a small learned classifier (SBERT embedding and n-gram features) route flagged queries to the emergency panel instead of recommendations. The Node API also applies the lexicon, so this works even if the NLP service is down.
2. **Rankers:** BM25 (k1 = 1.5, b = 0.75), TF-IDF (uni+bigrams, sublinear tf, cosine) and SBERT `all-MiniLM-L6-v2` (384-d) are compared; the **hybrid** fuses SBERT and TF-IDF scores.
3. **Fallback:** if the best score is below a tuned threshold the UI offers browsing by category instead of weak recommendations.
4. **Privacy:** query text is processed in memory only and is never logged, cached or stored.

Measured results, the protocol and the limits of the (author-written) dataset are documented in `nlp-service/README.md`; raw results are in `nlp-service/results/`.

## Security and privacy by design

| Control | Implementation |
|---|---|
| Passwords | bcrypt, cost factor 12 |
| Sessions | 15-minute JWT access token in memory; opaque refresh token in an httpOnly, Secure, SameSite=Strict cookie, stored only as a hash, rotated on every use, whole family revoked on re-use |
| CSRF | SameSite=Strict plus a per-session anti-CSRF token on cookie-authenticated routes |
| Brute force | 5 failed attempts per 15 minutes per IP and account, plus account lockout |
| Encryption | AES-256-GCM field-level encryption for journals and counselling notes; key from `FIELD_ENCRYPTION_KEY`, outside the database |
| Input | Request validation, NoSQL operator stripping, markup stripping, 100 kB body limit |
| Access control | Role-based access and object-level ownership checks; tested as an authorisation matrix |
| Headers | Helmet with a deny-all CSP for the API, exact-origin CORS, build-time CSP for the client |
| Consent and retention | Registration consent, separate recommender consent (withdrawable), journal text purged after 180 days, export and erase endpoints |
| Audit | Append-only log of sign-ins, consent, administrator access and crisis events (never message content) |

TLS 1.2+ and database encryption at rest are **deployment** settings (reverse proxy / MongoDB Atlas) and are not exercised by the local tests.

## Getting started

### Prerequisites
- Node.js 18+
- MongoDB (local, or a MongoDB Atlas cluster)

### 1. Install

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` in the project root and fill in:

- `MONGODB_URI`: your MongoDB connection string
- `JWT_SECRET`: any long random string
- `FIELD_ENCRYPTION_KEY`: 32 random bytes, base64 (required in production; see `.env.example`)
- `COOKIE_SECURE=false`: only for plain-http local development
- `NLP_SERVICE_URL` / `NLP_SERVICE_KEY`: where the NLP service runs (default `http://127.0.0.1:8001`)
- `GROQ_API_KEY`: for the chat companion (optional, the rest of the app works without it)
- `EMAIL_*`: for password-reset emails (optional)

### 3. Seed the database (optional)

```bash
cd server
npm run seed
```

**Warning:** seeding clears and reloads the sample collections (users, counsellors, resources and so on). It creates demo accounts:

- **Admin:** `admin@mentalwellness.com` / `Admin123`
- **User:** `alex@university.edu` / `Demo123`

### 4. Start the NLP service (for recommendations)

```bash
cd nlp-service
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # use .venv/bin/python on Linux/macOS
.venv/Scripts/python -m uvicorn app.main:app --port 8001
```

The first start downloads the ~90 MB `all-MiniLM-L6-v2` model. Without the service, the app works and the suggestion box shows a graceful "unavailable" state.

### 5. Run

```bash
# Terminal 1: backend (http://localhost:5000)
cd server && npm run dev

# Terminal 2: frontend (http://localhost:5173)
cd client && npm run dev
```

Open **http://localhost:5173**. Passwords need at least 6 characters and a number.

### 6. Docker (alternative)

```bash
docker-compose up
```

## Project structure

```
├── client/                 React frontend (Vite + Tailwind CSS v4)
│   └── src/  components/ contexts/ lib/ pages/ index.css
├── server/                 Node.js + Express API
│   ├── controllers/ middleware/ models/ routes/ seed/ utils/
│   ├── tests/              Jest + Supertest suites (in-memory MongoDB)
│   └── loadtest/           dependency-free load generator and pre-registered targets
├── nlp-service/            Python FastAPI recommender + evaluation protocol
│   ├── mwh_nlp/            preprocessing, BM25 / TF-IDF / SBERT / hybrid, crisis gate, pipeline
│   ├── app/                FastAPI app
│   ├── data/ data_build/   corpus, queries, labels, crisis sets (author-written)
│   ├── eval/               metrics, run_eval (dev / test phases), SUS scoring
│   └── tests/ results/ config/
├── docker-compose.yml
└── .env.example
```

## API overview

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/signup`, `login`, `refresh`, `logout`, `forgot-password`; `PUT /api/auth/reset-password/:token`; `GET /api/auth/me`, `export`; `DELETE /api/auth/account`; `POST/DELETE /api/auth/consent/recommender` |
| Mood | `POST /api/mood`, `GET /api/mood/history`, `trends`, `export` |
| Gratitude | `GET/POST /api/gratitude`, `PUT/DELETE /api/gratitude/:id` |
| Counsellors | `GET /api/counselors`, `GET /api/counselors/:id` |
| Appointments | `POST/GET /api/appointments`, `PUT/DELETE /api/appointments/:id` |
| Resources | `GET /api/resources`, `GET /api/resources/:id` |
| **Recommendations** | `POST /api/recommend` with `{ text }` (needs recommender consent) |
| Forum | `GET/POST /api/forum`, `GET /api/forum/:id`, `POST /api/forum/:id/reply`, `PUT /api/forum/:id/like`, `POST /api/forum/:id/report` |
| Gamification | `GET /api/gamification/me`, `POST /api/gamification/check-badges` |
| Chat | `POST /api/chat` |
| Admin | users, counsellors, appointments, analytics, forum moderation under `/api/admin` |

## Testing

```bash
# API: unit, integration, security payloads, authorisation matrix (needs no database install)
cd server && npm test

# NLP service and metrics
cd nlp-service && .venv/Scripts/python -m pytest tests

# Retrieval + crisis-gate experiment (dev tuning, then a single test run)
cd nlp-service
.venv/Scripts/python -m eval.run_eval --phase dev
.venv/Scripts/python -m eval.run_eval --phase test

# Load test (API + in-memory MongoDB + NLP service on one machine)
cd server && node loadtest/run.js 50,100,200
```

The API tests start a throw-away in-memory MongoDB (`mongodb-memory-server`, downloads a `mongod` binary on first run), so they never touch a real database.

## Project status

| Area | Status |
|---|---|
| Platform (auth, awareness, self-help tools, mood journal, counselling requests, community, emergency help, admin) | Complete |
| Security and privacy controls (tokens, CSRF, encryption, consent, audit, retention, export/erase) | Complete, covered by automated tests |
| NLP recommender and crisis gate | Complete, evaluated on author-written data (see Results) |
| Usability study (SUS) and ethics approval | **Not done** (`nlp-service/eval/sus.py` scores real data) |
| Independent annotation, counsellor review of corpus and lexicon | **Not done** |
| External vulnerability scan, TLS and encryption-at-rest checks | **Not done** (deployment-level) |

Quick end-to-end check without installing MongoDB: `cd server && npm run dev:memory`, start the NLP service (see below), then `cd client && npm run dev`.

## Results (final system)

All figures are measured by the scripts in this repository. The data are **author-written** (see Limitations), so they are indicative, not real-world performance.
Held-out numbers come from a sealed set (`nlp-service/data/heldout`, hashes in `SEAL.json`) that was evaluated **once**, after the system was frozen.

**Retrieval (held-out, 128 queries; 95% bootstrap CIs in `nlp-service/results/tables_heldout.md`)**

| Method | P@3 | P@5 | MRR | nDCG@5 |
|---|---|---|---|---|
| BM25 | 0.279 | 0.211 | 0.603 | 0.398 |
| TF-IDF | 0.271 | 0.211 | 0.604 | 0.395 |
| SBERT | 0.367 | 0.277 | 0.675 | 0.502 |
| **Hybrid** | **0.393** | **0.287** | **0.689** | **0.518** |

Hybrid nDCG@5 is 0.518 (95% CI 0.465-0.564), +30% over BM25 (paired bootstrap p = 0.001). Its margin over SBERT alone is small and borderline (+0.015, p = 0.05, post hoc). The same retrieval component scored 0.550 on the first test split. P@5 cannot exceed about 0.5 because each query has only 2-3 highly relevant resources.
Retrieval is weak on code-mixed Hinglish queries (hybrid nDCG@5 about 0.22).

**Crisis gate (held-out: 60 crisis, 198 non-crisis queries)**

| System | Recall | Precision | F2 | False diversions |
|---|---|---|---|---|
| First gate (lexicon + exemplar similarity), first test split | 0.762 (32/42) | 0.615 | 0.727 | 10.6% (20/189) |
| **Final gate (lexicon + learned classifier), held-out** | **0.950 (57/60), 95% CI 0.88-1.00** | 0.803 | 0.916 | **7.1% (14/198)** |

The recall target was 0.95: the point estimate meets it, but the confidence interval includes lower values. 17.5% of idiom hard negatives are still diverted. The lexicon alone catches only 20% of crisis queries, so if the NLP service is down only explicit statements are intercepted and the always-visible "Need help now?" button is the remaining safeguard.
The lexicon pattern for "cannot go on" was fixed after the held-out run (it caused one miss) and was not re-scored.

**Platform**

| Measure | Result | Target |
|---|---|---|
| API tests | 194 / 194 pass, 19 repeated runs (30 planned), 86.7% line coverage | all |
| Authorisation matrix (29 endpoints x 4 actors) | 116 / 116 | all |
| Security tests (auth, tokens, payloads, crypto) | 54 / 54 | all |
| NLP service tests | 13 / 13 | all |
| p95 latency at 200 concurrent users, API / recommend | 363 ms / 346 ms | <= 500 / <= 1000 ms |
| Error rate at 200 users | 0.62% (18 timeouts in 2910 requests) | < 1% |

Load test: one laptop (Intel Core i5-1334U, 15.7 GB RAM) running the API, an in-memory MongoDB, 3 single-threaded NLP workers and the load generator; 1 s think time, 30 s per level. The first build, with one NLP worker, missed the recommendation target (p95 1642 ms at 100 users, 4773 ms at 200 users) until torch was pinned to one thread per worker.

Defects found and fixed while testing: self-assignable administrator role at signup, account enumeration through the password-reset response, a CORS header returned for any origin, and an oversized request returning a server error.

**Not done:** usability study (SUS), external vulnerability scan / penetration test, TLS configuration test, human double annotation (kappa), counsellor review of the corpus and lexicon.

## Limitations

- The evaluation dataset (corpus, queries, labels, crisis sets, gate training texts) is **author-written**. It is not reviewed by a counsellor, has no human double annotation, and contains no real user text. The held-out set was written after the first system's failures were known and over-represents code-mixed and indirect language.
- The crisis gate is a safeguard, not a clinical classifier. Its recall estimate has a wide interval, it over-flags idioms, and it was trained on text written by the same authors as the test texts. It must not be the only support path.
- Retrieval is weak on code-mixed (Hinglish) queries because the encoder is English-only.
- Load results come from a single laptop with all components co-located and one shared source address; they are not production capacity figures.
- No usability study, external vulnerability scan or penetration test has been run, and TLS / encryption-at-rest are deployment settings.
- Not a medical device; not a substitute for professional care.

## License

MIT

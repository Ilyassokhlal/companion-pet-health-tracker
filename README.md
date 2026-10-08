# Companion: AI Powered Pet Health Tracker

**Live at [mycompanion.pet](https://mycompanion.pet)**, running on a Hetzner VPS behind Caddy with automatic TLS.

> **v3.5.** Eight languages, light and dark themes, appointment scheduling, tracking of each
> pet's weight, walks, feeding and budget, and a reference corpus grown from 35 documents to 272.
> Every account now starts with a free month, after which Companion Premium is a monthly or
> yearly subscription on the web or through Google Play, and the owner has a private admin
> dashboard. For the tree before these landed, see the
> [`v3.0`](https://github.com/Ilyassokhlal/companion-pet-health-tracker/releases/tag/v3.0) tag.

> **v3.** A React Native mobile app now lives in `frontend-mobile/` and shares this backend.
> The store release is pending. This README covers the backend, both clients and the
> deployment. For the tree that predates the mobile client, see the
> [`v2.0`](https://github.com/Ilyassokhlal/companion-pet-health-tracker/releases/tag/v2.0) tag.

> **v2.** The Module 9 capstone that this project grew out of is preserved at the
> [`v1.0-capstone`](https://github.com/Ilyassokhlal/companion-pet-health-tracker/releases/tag/v1.0-capstone)
> tag, along with the README that describes it.

A pet health record system where each owner has an account. Owners keep each pet's vaccinations,
vet visits, medications and symptoms in one place, attach photos to any record, schedule
appointments and track weight, walks, feeding and spending. An AI assistant answers care
questions from a curated veterinary reference corpus, grounded in that pet's own profile and
records, in whichever of eight languages the question is asked. Due dates turn into email and
push reminders, sent in the morning in the owner's own timezone. The same account works on the
web and in the Android app, against one API and one database. Every account starts with a free
month, and after it Companion Premium keeps it working. Without Premium an account can still
read, export and delete everything it holds.

---

## Screenshots

**Dashboard on the web**

![Web dashboard](screenshots/V3.5/Web/dashboard.png)

**On Android**

| Dashboard | Tracking | Chat |
|---|---|---|
| <img src="screenshots/V3.5/Mobile/dashboard.jpg" alt="Dashboard" width="260"> | <img src="screenshots/V3.5/Mobile/tracking.jpg" alt="Tracking" width="260"> | <img src="screenshots/V3.5/Mobile/chat.jpg" alt="Chat" width="260"> |

<details>
<summary><b>More web screenshots</b></summary>

**Landing page**

![Landing page](screenshots/V3.5/Web/landing-page.png)

**Records**

![Records](screenshots/V3.5/Web/records.png)

**Tracking**

![Tracking](screenshots/V3.5/Web/tracking.png)

**Weight**

![Weight](screenshots/V3.5/Web/weight.png)

**Walks**

![Walks](screenshots/V3.5/Web/walks.png)

**Feeding**

![Feeding](screenshots/V3.5/Web/feeding.png)

**Budget**

![Budget](screenshots/V3.5/Web/budget.png)

**Photo gallery**

![Photo gallery](screenshots/V3.5/Web/photos-many.png)

**A photo, labelled with the record it belongs to**

![A single photo](screenshots/V3.5/Web/photo-one.png)

**The chat opens over any page once signed in**

![Chat over a page](screenshots/V3.5/Web/chat-over-page.png)

**An answer from the corpus, with its sources**

![Chat with sources](screenshots/V3.5/Web/chat.png)

**Asked in Arabic, answered in Arabic, with the app still in English**

![A question and answer in Arabic](screenshots/V3.5/Web/chat-arabic.png)

**Settings**

![Settings](screenshots/V3.5/Web/settings-one.png)

![Settings, continued](screenshots/V3.5/Web/settings-two.png)

</details>

<details>
<summary><b>More Android screenshots</b></summary>

| Records | Weight | Walks |
|---|---|---|
| <img src="screenshots/V3.5/Mobile/records.jpg" alt="Records" width="260"> | <img src="screenshots/V3.5/Mobile/weight.jpg" alt="Weight" width="260"> | <img src="screenshots/V3.5/Mobile/walks.jpg" alt="Walks" width="260"> |

| Feeding | Budget | Photos |
|---|---|---|
| <img src="screenshots/V3.5/Mobile/feeding.jpg" alt="Feeding" width="260"> | <img src="screenshots/V3.5/Mobile/budget.jpg" alt="Budget" width="260"> | <img src="screenshots/V3.5/Mobile/photos.jpg" alt="Photos" width="260"> |

| Its sources | Follow up question | The follow up's sources |
|---|---|---|
| <img src="screenshots/V3.5/Mobile/chat-reference.jpg" alt="Answer with sources" width="260"> | <img src="screenshots/V3.5/Mobile/chat-follow-up.jpg" alt="Follow up question" width="260"> | <img src="screenshots/V3.5/Mobile/chat-follow-up-reference.jpg" alt="Follow up answer with sources" width="260"> |

| Push reminders | Settings | Account |
|---|---|---|
| <img src="screenshots/V3.5/Mobile/phone-notifications.jpg" alt="Push reminders" width="260"> | <img src="screenshots/V3.5/Mobile/settings.jpg" alt="Settings" width="260"> | <img src="screenshots/V3.5/Mobile/settings-account.jpg" alt="Account settings" width="260"> |

| Appearance | Units and language | Notifications and tracking |
|---|---|---|
| <img src="screenshots/V3.5/Mobile/settings-appearance.jpg" alt="Appearance settings" width="260"> | <img src="screenshots/V3.5/Mobile/settings-units-language.jpg" alt="Units and language settings" width="260"> | <img src="screenshots/V3.5/Mobile/settings-notifications-tracking.jpg" alt="Notification and tracking settings" width="260"> |

</details>

---

## Features

**Pets.** An account can hold several dogs and cats, each with a profile: breed, birth date, sex,
neutered status, weight, dietary restrictions and allergies, and disabilities. The assistant is
given that profile with every question it answers.

**Records and photos.** Seven record types: vaccination, vet visit, medication, weight, symptom,
grooming and training. Any record can carry photos, and they can be added or removed later from
the same form. Uploads can be JPEG, PNG or WebP, up to 20 MB each. The server turns each one
upright, scales it to at most 2,560 pixels on its long side, saves it as a JPEG without the
original's metadata (including any GPS location) and makes a thumbnail at most 400 pixels on its
long side for the grids. The gallery groups photos by month, filters them by record type and
downloads up to ten at once as a zip.

**Scheduling.** Appointments are entered directly. A record's next due date becomes a follow up,
and a pet with weight tracking on gets a weight check every week, every two weeks or every month.
Completing any of these creates the matching record and opens it for editing.

**Tracking.**

* **Weight** is charted from the pet's weight records, in kilograms or pounds.
* **Walks** are logged by hand, with a duration and an optional distance.
* **Feeding** is a daily schedule of feeding times. Each logged meal is matched to the nearest
  one, and a feeding time with no meal logged can send a reminder.
* **Budget** measures each month's expenses against the pet's spending limit, across seven
  categories: food, vet, medication, grooming, supplies, insurance and other. An expense can be
  linked to a health record, and it keeps the currency it was entered in.

**Chat.** Questions about a pet can be asked from any page of the web app once signed in, or
from the Chat tab on Android, and the web keeps past conversations on their own page. Answers
come from the reference corpus and the pet's own profile and records, with links to their
sources. See [RAG pipeline](#rag-pipeline).

**Export.** A pet's records, walks, feedings and expenses as a zip of CSV files, or its records,
walks and feeding schedule as a PDF.

**Languages.** English, French, Spanish, German, Arabic, Russian, Chinese (Simplified) and
Chinese (Traditional), in both clients and in the emails and push notifications the server sends.
Traditional Chinese follows the usage in Taiwan. Arabic switches both clients to a right to left
layout. Each owner also picks metric or imperial units, a currency and a timezone.

**Themes.** Light or dark, five accent colours (purple, yellow, green, blue, pink) and five
background patterns (none, paws, bones, fish, mixed), saved per device.

**Getting started.** A new account sees a short welcome before its first pet, then a Get started
card with six first steps: add a pet, add a health record, attach a photo to a record, ask a
question, schedule an appointment and meet the trackers. A step is ticked as soon as it is done,
on any pet and in either app, and the card can be hidden. Empty pages say what belongs on them.

**Premium.** Every account starts with a free month, with up to 30 questions a day. After it,
Companion Premium is a monthly or yearly subscription, bought on the web through Stripe or in the
Android app through Google Play, and either one works in both apps. Without it the account
locks: everything stays readable, exportable and deletable, and settings can still change, but
nothing else can be added or edited and the chat stops. Seven, three and one days before an
account locks, its owner is warned. See [Premium and payments](#premium-and-payments).

---

## Architecture

![Architecture](screenshots/architecture.png)

Three Compose services on one internal Docker network, and a fourth for the admin dashboard
that only runs once it is switched on. In production only 80 and 443 are published. Caddy
terminates TLS, serves the built React app and proxies `/api/*` to the backend, so the API and
Postgres cannot be reached from outside the host.

| Service | Role |
|---|---|
| `frontend` | Caddy: TLS, the static React build and the `/api` reverse proxy |
| `backend` | FastAPI: REST API, JWT auth, RAG orchestration, reminder scheduler |
| `db` | PostgreSQL 17 |
| `grafana` | Grafana: the owner's admin dashboard, served by Caddy on a secret path. Only started when `COMPOSE_PROFILES` includes `stats`. See [Admin](#admin). |

The web app and its API share one origin, so the browser makes no cross origin requests and CORS
does not apply in production. The Android app sends no `Origin` header, so CORS never applies to
it either. Neither client is special to the backend: both are ordinary consumers of the same 67
documented endpoints.

ChromaDB runs inside the backend process, and its index lives on the `app_data` volume next to
the uploaded photos. Answers and question translation call the Claude API, email goes through
Resend, push notifications go through Expo's push service, and payments go through Stripe and
Google Play, with RevenueCat keeping one subscription across both. None of them run locally.
The backend image also carries DB-IP's free country database, fetched again whenever the image
is rebuilt after a code change, so an address is turned into a country without leaving the server.

Rate limits key on the client's address. Caddy passes it on in `X-Forwarded-For`, and uvicorn
trusts that header because `FORWARDED_ALLOW_IPS` is set on the backend service. The backend
publishes no port, so Caddy is the only thing that can reach it.

**Volumes.** `db_data` holds the database, `app_data` holds `/data/chroma` and `/data/photos`,
and `caddy_data` holds the TLS certificates. Without `caddy_data`, every restart would request a
new certificate, and Let's Encrypt issues at most five for the same domain per week.
`grafana_data` holds Grafana's own login and settings. The dashboards themselves are files in
this repository.

---

## Tech stack

| Layer | Choice |
|---|---|
| Web frontend | React 19 and TypeScript, Vite, Tailwind CSS v4, React Router, i18next, `lucide-react` |
| Mobile client | React Native 0.86 on Expo SDK 57, `expo-router`, NativeWind, i18next, `react-native-svg` |
| Web server | Caddy |
| API | FastAPI, Pydantic v2, SQLAlchemy 2, Alembic |
| Database | PostgreSQL 17 |
| Vector store | ChromaDB (`all-MiniLM-L6-v2` embeddings) |
| LLM | Claude Haiku 4.5 via the Claude API |
| Email | Resend |
| Push | Expo push service |
| Payments | Stripe Checkout on the web, Google Play on Android, RevenueCat across both (`react-native-purchases` in the app) |
| Admin dashboard | Grafana 13 |
| Country lookup | DB-IP Lite, read with `maxminddb` |
| Scheduling | APScheduler |
| Images | Pillow |
| Export | `fpdf2` for PDF, `csv` and `zipfile` for the data export |
| Rate limiting | slowapi |
| Tests | pytest against a real PostgreSQL database |

---

## Why the Claude API

Earlier versions ran inference locally with Ollama. This app is deployed with Docker on a VPS,
and hosting a model there would require a lot of VRAM, enough to push the monthly server cost
past what the project justifies. Moving generation to the Claude API is the compromise that made
deployment viable.

It is meant to be temporary. Returning to a self hosted model is the intended direction, and only
two functions talk to Claude: `rag.generate`, a generator that yields text chunks, and
`rag.translate_question`. Switching back means rewriting those two and `MODEL_NAME`. Nothing in
`routers/ask.py` changes.

---

## Prerequisites

* Docker and Docker Compose
* An [Anthropic API key](https://console.anthropic.com)
* A [Resend](https://resend.com) API key and a verified sending domain

For the Vite dev server or the mobile app, additionally:

* Node 24
* An [Expo](https://expo.dev) account and an Android device or emulator, for the mobile app

Email is optional for local development. The app runs without it, but verification, password
reset and every reminder do nothing, since reminders only go to verified addresses.

Payments are optional as well. Without a [Stripe](https://stripe.com) account and a
[RevenueCat](https://www.revenuecat.com) project every new account still gets its free month,
but Premium cannot be bought, so an account locks when its month ends unless it is given
Premium from the [admin command line](#admin).

---

## Quick start

```bash
git clone https://github.com/Ilyassokhlal/companion-pet-health-tracker.git
cd companion-pet-health-tracker
cp .env.example .env
```

Fill in `.env`: at minimum `SECRET_KEY`, `ANTHROPIC_API_KEY` and `POSTGRES_PASSWORD`, plus the
same password in place of `CHANGEME` inside `DATABASE_URL`. Leave `SITE_ADDRESS` empty, so Caddy
serves plain HTTP on port 80.

```bash
docker compose up --build
```

Then open **http://localhost**.

First boot takes a few minutes: the backend downloads the embedding model and indexes the corpus,
and the frontend runs a production build. Database migrations run automatically on every backend
start.

---

## Local development

On its own, the Compose file publishes only ports 80 and 443. For development, create
`docker-compose.override.yml` next to it. Compose loads that file automatically by name, and it
is gitignored:

```yaml
services:
  db:
    ports:
      - "5432:5432"

  backend:
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    command: sh -c "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
```

This publishes Postgres on 5432 and the API on 8000, mounts `backend/` into the container, and
restarts uvicorn on every change.

To run the web app with hot reload, create `frontend-web/.env` containing
`VITE_API_URL=http://localhost:8000`, then:

```bash
cd frontend-web
npm install
npm run dev
```

It serves on **http://localhost:5173**, an origin `.env.example` already allows in
`CORS_ORIGINS`. That `.env` is separate from the root one, because Vite runs on the host rather
than in Docker.

---

## Configuration

All settings live in `.env`. `.env.example` lists every key except `COUNTRY_DB`, the path of the
country database inside the backend image, which has no reason to change.

<details>
<summary><b>Every setting</b></summary>

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | JWT signing key. Required. |
| `ALGORITHM` | JWT signing algorithm. Default `HS256`. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Session lifetime in minutes. The example sets 10080 (7 days). Unset, it is 30. |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Database container initialisation. Read only when the volume is first created. |
| `DATABASE_URL` | The app's connection string. Its password must match `POSTGRES_PASSWORD`. |
| `ANTHROPIC_API_KEY` | Required for the chat |
| `MODEL_NAME` | Default `claude-haiku-4-5`. Used for answers and for question translation. |
| `RESEND_API_KEY` / `MAIL_FROM` | Outbound email. `MAIL_FROM` must be on a domain verified with Resend. |
| `EMAIL_LOGO_URL` | Optional. The logo in outbound email. Defaults to `FRONTEND_URL/icon.png`. |
| `CHROMA_PATH` / `COLLECTION_NAME` | The vector index's location and name |
| `MAX_RESULTS` | How many corpus chunks go into each prompt. Default 5. |
| `CONFIDENCE_THRESHOLD` | The scope gate. Default 0.91. Read [RAG pipeline](#rag-pipeline) before changing it. |
| `DOCS_DIRECTORY` | The corpus to index. Default `./docs`. |
| `PHOTO_DIR` / `MAX_PHOTO_MB` | Photo storage path and the upload limit for each file, in MB. Default limit 20. |
| `REMINDER_HOUR` / `REMINDER_LEAD_DAYS` | The local hour reminders go out (default 6) and how many days ahead the weekly email looks (default 7) |
| `TIMEZONE` | Fallback for users who have not chosen one, and the scheduler's timezone |
| `STATS_TIMEZONE` | The admin dashboard's timezone, for counting days. Falls back to `TIMEZONE`. |
| `DEBUG` | Prints the loaded configuration at startup |
| `FRONTEND_URL` | Where links in emails point. The example points at the Vite dev server. Use `http://localhost` when running only the containers, and the live domain in production. |
| `CORS_ORIGINS` | Origins allowed to call the API directly, separated by commas |
| `VITE_API_URL` | Build argument for the frontend image, baked into the bundle. Compose defaults it to `/api`, so it is normally left unset. |
| `SITE_ADDRESS` | Production only. The domain Caddy serves. Empty means plain HTTP on port 80. A domain switches on automatic TLS. |
| `REVENUECAT_SECRET_KEY` | RevenueCat's secret API key. Server side only. |
| `REVENUECAT_WEBHOOK_AUTH` | The exact `Authorization` value RevenueCat's webhook sends. Empty refuses every call. |
| `REVENUECAT_ENTITLEMENT` | The RevenueCat entitlement that means Premium. Default `companion_premium`. |
| `REVENUECAT_STRIPE_PUBLIC_KEY` | RevenueCat's public key for its Stripe app, used to report web purchases to RevenueCat |
| `STRIPE_SECRET_KEY` | Stripe's secret key. A live key also marks the fees read for the admin dashboard as real. |
| `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY` | The two Stripe prices the web checkout sells |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the Stripe webhook for `/api/billing/stripe` |
| `COMPOSE_PROFILES` | `stats` starts the admin dashboard. Empty leaves it off. |
| `GRAFANA_ADMIN_PASSWORD` | Grafana's own login, for the user `owner`. Grafana will not start without it. |
| `GRAFANA_DB_PASSWORD` | The password of `grafana_reader`, the read only database role Grafana uses. The backend creates the role and keeps the password in step at every start. Grafana will not start without it either. |
| `STATS_PATH` / `GRAFANA_ROOT_URL` | The dashboard's secret path, a long random string starting with `/`, and its full address ending in `/` |
| `STATS_USER` / `STATS_PASSWORD_HASH` | The password prompt Caddy puts in front of the dashboard. Make the hash with `docker run --rm -it caddy:2-alpine caddy hash-password` and keep it in single quotes, because it contains `$` signs. |
| `STATS_GATE_SECRET` | A long random string. Caddy adds it to the fixed costs form's requests, and the backend refuses them without it. |

</details>

---

## Database schema

Twenty tables. Every foreign key cascades except four, so deleting a user removes everything they
own apart from two kinds of record kept on purpose. Deleting an account also removes its photo
files from disk.

<details>
<summary><b>Tables</b></summary>

```
users ──┬──< pets ──┬──< health_records ──< record_photos
        │           ├──< scheduled_events
        │           ├──< walks
        │           ├──< feeding_times
        │           ├──< feedings
        │           ├──< expenses
        │           └──< chat_messages
        ├──< device_tokens
        ├──< question_usage
        ├──< onboarding_steps
        ├──< activity_days
        ├──< billing_events     set to null when the user is deleted
        └──< admin_actions      set to null when the user is deleted

trial_fingerprints, email_bans, costs, stripe_fees    linked to no account
```

| Table | Holds |
|---|---|
| `users` | Account, profile photo, email verification, timezone, language, units, currency, reminder and tracking preferences, free month, Premium, country and suspension |
| `pets` | Profile (species, breed, birth date, sex, neutered, weight, dietary restrictions and allergies, disabilities, photo), tracking switches, how often weight is checked, monthly spending limit |
| `health_records` | Type, title, date, description, optional next due date and weight |
| `record_photos` | Photos attached to a record |
| `scheduled_events` | Appointments, record follow ups and weight checks |
| `walks` | Logged walks |
| `feeding_times` | Each pet's daily feeding schedule |
| `feedings` | Logged meals |
| `expenses` | Amount, category, currency and an optional link to a record |
| `chat_messages` | Questions and answers, with each answer's sources as JSON |
| `device_tokens` | One row per app install that has accepted push notifications |
| `question_usage` | Each question asked: when, whether it was answered, its Claude tokens and model. The free month's daily limit counts these. |
| `onboarding_steps` | Each Get started step an account has done, and when |
| `activity_days` | One row for each day an account used the app, with the app it used. Deleted after 13 months. |
| `billing_events` | Every purchase event RevenueCat reports, such as purchases, renewals, cancellations and refunds |
| `admin_actions` | Every change made from the admin command line, with the account's email and the reason |
| `trial_fingerprints` | A keyed hash of each email that has had its free month, with the trial days a returning signup gets back. Erased after a year. |
| `email_bans` | A keyed hash of each banned email, which blocks signing up with it while the ban lasts |
| `costs` | The fixed costs typed into the admin dashboard |
| `stripe_fees` | What Stripe kept, read from the account's balance once a day |

The four exceptions are set to null instead of cascading. Two point at `health_records`: an
expense's linked record and the record an event produced when it was completed, so deleting a
record keeps the expense and the completed event. Two point at `users`: purchase events and the
admin log outlive a deleted account, the log with the email the account had.

The admin dashboard reads none of these tables directly. A `stats` schema holds views over them
with emails and usernames, dates and counts, and never a pet's name, a record's contents, a
photo or a chat.

</details>

Login is by email. Usernames are for display and need not be unique.

---

## API

The API has 67 documented endpoints. Interactive documentation is at **http://localhost/api/docs**
locally and **https://mycompanion.pet/api/docs** on the live site, with ReDoc at `/api/redoc`.
Two payment webhooks and the admin dashboard's cost form are left out of the documentation,
since only Stripe, RevenueCat and Grafana call them.

<details>
<summary><b>Swagger UI screenshots</b></summary>

![Swagger UI, authentication](screenshots/swagger-1.png)

![Swagger UI, continued](screenshots/swagger-2.png)

![Swagger UI, continued](screenshots/swagger-3.png)

![Swagger UI, continued](screenshots/swagger-4.png)

</details>

The records, photos, walks and feedings lists can load a page at a time, with `limit` from 1 to
100 and `offset`. Without `limit` the whole list comes back.

<details>
<summary><b>All 67 endpoints</b></summary>

### Auth
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | Returns a token and sends a verification email |
| POST | `/auth/login` | Email and password |
| POST | `/auth/verify-email` | Unauthenticated. The signed token in the link is the proof. |
| POST | `/auth/resend-verification` | |
| GET / PATCH / DELETE | `/auth/me` | Deleting the account requires the current password |
| POST / DELETE | `/auth/me/photo` | The user's avatar |
| GET | `/auth/timezones` | The IANA zones this server accepts, from its own tzdata |
| POST | `/auth/forgot-password` | Always 204, whether or not the address exists |
| POST | `/auth/reset-password` | The link works once and is used up when the password changes |
| POST | `/auth/change-email` | Requires the current password. The new address waits in `pending_email` until verified. |
| POST | `/auth/change-password` | Returns a fresh token. Every other session ends. |
| GET | `/auth/me/getting-started` | Which Get started steps the account has done |
| POST | `/auth/me/getting-started/tracking` | Ticks Meet the trackers, the one step with nothing to add |

### Pets
| Method | Path |
|---|---|
| GET / POST | `/pets` |
| GET / PATCH / DELETE | `/pets/{pet_id}` |
| POST / DELETE | `/pets/{pet_id}/photo` |

### Records
| Method | Path | Notes |
|---|---|---|
| GET / POST | `/pets/{pet_id}/records` | GET takes `record_type`, `limit` and `offset` |
| GET | `/pets/{pet_id}/record-counts` | How many records the pet has of each type |
| PATCH / DELETE | `/records/{record_id}` | |
| GET | `/pets/{pet_id}/export?format=zip\|pdf` | Zip of CSVs, or a PDF |

### Photos
| Method | Path | Notes |
|---|---|---|
| POST | `/records/{record_id}/photos` | Several files per request. The whole batch is checked before any file is stored. |
| DELETE | `/record-photos/{photo_id}` | |
| GET | `/pets/{pet_id}/photos` | The gallery, with each photo's record. Takes `record_type`, `since`, `until`, `limit` and `offset`. |
| GET | `/pets/{pet_id}/photo-counts` | How many photos the pet has under each record type |
| GET | `/pets/{pet_id}/photos/download` | Up to ten photos as one zip |

Image files are served as static assets from `/photos/<filename>` under unguessable UUID names.
Each has a thumbnail beside it, named after the photo with `_thumb.jpg` in place of its extension.

### Events
| Method | Path | Notes |
|---|---|---|
| GET | `/pets/{pet_id}/events` | |
| POST | `/events` | |
| PATCH / DELETE | `/events/{event_id}` | |
| POST | `/events/{event_id}/complete` | Creates the record the event stands for |

### Walks
| Method | Path | Notes |
|---|---|---|
| GET / POST | `/pets/{pet_id}/walks` | GET takes `since`, `limit` and `offset` |
| PATCH / DELETE | `/walks/{walk_id}` | |

### Feeding
| Method | Path | Notes |
|---|---|---|
| GET / POST | `/pets/{pet_id}/feeding-times` | The schedule |
| DELETE | `/feeding-times/{feeding_time_id}` | |
| GET / POST | `/pets/{pet_id}/feedings` | Logged meals. GET takes `on` for one day, `limit` and `offset`. |
| PATCH / DELETE | `/feedings/{feeding_id}` | |
| GET | `/pets/{pet_id}/feeding-status` | Each of today's feeding times as met, due, missed or upcoming |

### Budget
| Method | Path | Notes |
|---|---|---|
| GET / POST | `/pets/{pet_id}/expenses` | |
| PATCH / DELETE | `/expenses/{expense_id}` | |
| GET | `/pets/{pet_id}/expense-summary` | One month's spending by category, against the limit |

### Chat
| Method | Path | Notes |
|---|---|---|
| POST | `/ask` | Streams JSON, one object per line |
| GET | `/pets/{pet_id}/messages` | Optional `limit` and `before` page backwards through the history |
| DELETE | `/messages/{message_id}` | |
| DELETE | `/pets/{pet_id}/messages` | Clears a pet's history |

### Billing
| Method | Path | Notes |
|---|---|---|
| POST | `/billing/checkout` | A Stripe checkout for monthly or yearly Premium. Returns the URL to send the owner to. |
| POST | `/billing/portal` | Stripe's billing portal for the account's web subscription |
| POST | `/billing/restore` | Moves a running web subscription paid with the account's verified email onto the account |
| POST | `/billing/sync` | Reads the account again from RevenueCat, after a purchase in the app |

`POST /billing/stripe` and `POST /billing/revenuecat` receive the two webhooks. Stripe's is checked
against its signature and RevenueCat's against `REVENUECAT_WEBHOOK_AUTH`.

### Other
| Method | Path | Notes |
|---|---|---|
| GET | `/health` | |
| POST / DELETE | `/devices` | Registers or removes an Expo push token for the user who is signed in |

A push token identifies one install on one device, not a person, so `token` is unique on its own
rather than per user. When a second account signs in on the same phone, the row moves to that
account. Otherwise the previous user would keep receiving that phone's reminders.

</details>

### Rate limits

Per client address: register 5 a minute, login 10 a minute, email verification 10 a minute,
resending verification 3 an hour, forgotten password 3 an hour, password reset 10 an hour,
changing email or password 5 an hour, deleting the account 5 an hour, restoring a purchase 5 an
hour, syncing purchases 10 a minute and `/ask` 10 a minute.

### `/ask` response format

The endpoint streams `application/x-ndjson`, one JSON object per line. For "How do I prevent
heartworm?" asked about a dog:

```
{"token": "Heartworm "}
{"token": "prevention "}
{"meta": {"sources": [{"title": "Keep the Worms Out of Your Pet’s Heart! The Facts about Heartworm Disease", "section": "The Best Treatment is Prevention!", "url": "https://www.fda.gov/animal-veterinary/animal-health-literacy/keep-worms-out-your-pets-heart-facts-about-heartworm-disease"}, {"title": "Dog health", "section": "Internal parasites", "url": "https://en.wikipedia.org/wiki/Dog_health#Internal_parasites"}, {"title": "Keep the Worms Out of Your Pet’s Heart! The Facts about Heartworm Disease", "section": "Is There a Treatment for Heartworm Disease in Dogs?", "url": "https://www.fda.gov/animal-veterinary/animal-health-literacy/keep-worms-out-your-pets-heart-facts-about-heartworm-disease"}, {"title": "Routine care schedule for dogs and cats, based on the Merck Veterinary Manual", "section": "Parasite control", "url": "https://www.merckvetmanual.com/cat-owners/caring-for-cats/routine-health-care-of-cats"}], "confidence": "high", "distances": [0.3777, 0.4805, 0.4833, 0.4993, 0.526]}}
```

Two chunks from the same section produce one source, so there can be fewer sources than distances.
Only a Wikipedia link carries a section anchor, because Wikipedia builds its anchors from section
headings. Any other site gets a link to the page itself.

`confidence` is `high` when the nearest chunk is closer than 0.7, and `medium` otherwise.

Questions outside the scope are never answered by the model. They return a plain JSON object
instead of a stream, `{"answer": "...", "sources": [], "confidence": "none"}`, so clients check
the response's content type before parsing.

A locked account's question is refused with 403 and the code `subscription_required`, and a
question past the free month's 30 for the day with 429 and the code `trial_question_limit`.

---

## RAG pipeline

**Corpus.** 272 plain text documents, about 333,000 words in 4,837 chunks, all about the health
and care of dogs and cats. They come from three kinds of source:

* **224 Wikipedia articles**, trimmed to the sections that matter for dogs and cats.
* **39 US government pages** written for pet owners, 32 from the FDA and 7 from the CDC.
* **9 guides written for this project**, covering what no suitably licensed source covered in the
  form an owner needs: emergencies and first aid, symptoms and when to call the vet, routine care,
  senior care, giving medicines, brand names and abbreviations, human foods and treats, common
  illnesses, and common owner questions. Every claim in them was checked against a named
  veterinary source, such as the Merck Veterinary Manual, the Cornell Feline Health Center and
  Riney Canine Health Center, Tufts, UC Davis, the ASPCA or the FDA.

By topic, with each document counted once under its main subject:

| Topic | Documents | Such as |
|---|---|---|
| Heart, hormones, organs and cancer | 40 | diabetes, kidney disease, hyperthyroidism, heart disease, pancreatitis, lymphoma |
| Everyday care and life stages | 37 | puppies and kittens, senior care, neutering, grooming, microchips, euthanasia and loss |
| Medicines and treatments | 35 | flea and tick medicines, pain relief, allergy medicines, giving and storing medicines |
| Infectious diseases and vaccines | 32 | parvovirus, distemper, feline leukaemia, rabies, kennel cough, vaccination |
| Parasites | 26 | fleas, ticks, heartworm, roundworms, Giardia, ear mites |
| Poisons and dangerous foods | 23 | xylitol, chocolate, grapes, lilies, holiday dangers |
| Behaviour and training | 17 | house training, crate training, separation anxiety, aggression, cat behaviour |
| Skin, ears and teeth | 16 | allergies, ringworm, ear infections, dental disease |
| Food and weight | 14 | dog and cat food, raw feeding, food safety, obesity |
| Brain, nerves and senses | 13 | epilepsy, cognitive dysfunction, glaucoma, deafness |
| Bones, joints and mobility | 11 | hip and elbow dysplasia, luxating patella, cruciate surgery |
| Emergencies and first aid | 8 | first aid, bloat, swallowed objects, when to call the vet |

The corpus is in English and covers dogs and cats only. Human medicine material was filtered out,
because a passage about human nephrology scores very well for "my cat's kidney problem" and gives
the wrong answer for a cat. `backend/docs/ATTRIBUTION.md` lists every file's source, the date it
was retrieved and, for Wikipedia, the exact revision.

**Chunking.** One chunk per paragraph, at least 60 characters long. Every paragraph starts with a
heading that names its document, and its section when it belongs to one (`Article - Section`), so
each chunk knows where it came from and the heading words count toward its embedding. Titles and
URLs are read from `backend/docs/ATTRIBUTION.md` at index time. A guide paragraph that draws on a
different source from its neighbours ends with a `SOURCE: Title | url` line instead. Ingest takes
that line off before the paragraph is embedded and stores it as that chunk's citation.

**Reindexing.** The backend indexes the corpus on its first start, while the collection is empty.
Ingest adds and updates chunks but never removes old ones, so after changing the corpus, delete
the collection and restart the backend, which then indexes it again from scratch:

```bash
docker compose exec backend python -c "import rag; rag.client.delete_collection(rag.collection.name)"
docker compose restart backend
```

Indexing takes a few minutes. `docker compose logs backend` shows the number of chunks and
documents once it is done.

**Translation.** Every question first goes through one Claude call that returns structured JSON:
the question in English, the language it was written in and the pet's name as the question
wrote it. The corpus is English, so the search runs in English, and the answer is written in the
language of the question. That can differ from the app's language, since someone can run the app
in Russian and type in English. The app language is only the fallback. The one exception is
Chinese: Simplified and Traditional characters are often the same, so when the app is set to
either, the call is told which, to answer in the right script.

The call is told to translate faithfully. Every animal stays as written, so a question about a
cat stays about a cat when the pet is a dog, and nothing the owner did not write is added. It also
writes short names of illnesses and procedures in full, such as parvo or getting a pet fixed,
because the search matches wording: "Is parvo curable?" scores **0.963** and would be refused,
while "Is canine parvovirus curable?" scores **0.394**. Brand names of medicines come out in their
usual English spelling, so "Бравекто" becomes "Bravecto" for the brand table below. If the call
fails, the question goes on unchanged in the app language, so an outage weakens the search
without taking the chat down.

**Name swap.** Before the search, the pet's name is replaced with its species. `"why is Flash
coughing?"` scores **1.160** and would be refused, because to the embedding model "Flash" is an
ordinary word with nothing to do with a pet. As `"why is Dog coughing?"` it scores **0.537**.
The swap is plain string matching, so it cannot see a transliteration such as "Флэш" or a
declined form such as "Флэша". That is why the translation call is given the stored name and
asked how the question wrote it. The reported spelling is swapped as well, once it has been
confirmed to appear in the question.

**Brand names.** Product names mean nothing to the embedding model either: "Is Cytopoint safe?"
scores **0.978** and would be refused. A table of 32 brands in `routers/ask.py`, taken from the
brand names guide in the corpus, writes each brand's active ingredients after it in the search
query, and "Is Cytopoint (lokivetmab) safe?" scores **0.573**. The table is fixed on purpose.
Asked to add ingredients itself, the translation call gave Simparica the ingredients of a
different product.

**Scope gate.** The gate asks for the single nearest chunk and refuses the question when that
chunk is further away than `CONFIDENCE_THRESHOLD`, 0.91. These are the nearest distances for the
question bank the corpus was built against, 402 questions in scope and 93 out of scope across the
seven languages the app had then, as the gate sees them after translation. Traditional Chinese was
added after this measurement, so the bank has no questions in it:

| Question type | Questions | Median | Range |
|---|---|---|---|
| In scope, English | 246 | 0.66 | 0.20 to 0.91 |
| In scope, the other six languages | 156 | 0.64 | 0.25 to 0.89 |
| Pet related but off topic, English | 15 | 0.92 | 0.69 to 1.14 |
| Human health, English | 25 | 1.18 | 0.75 to 1.39 |
| Unrelated, English | 29 | 1.54 | 0.98 to 1.73 |
| Out of scope, the other six languages | 24 | 1.37 | 0.87 to 1.58 |

At 0.91, all 402 questions in scope pass. Eleven of the 93 out of scope questions get through.
Ten are in English, such as "What's a good name for a puppy?" and "I was bitten by a dog, do I
need a tetanus shot?". The eleventh is an Arabic question about a son's fever, which the
translation turns into a question about the dog. Stopping all eleven would take a threshold of
0.69, which would also refuse 153 of the 402 real pet questions.

A refused question is never sent to the model for an answer. The owner gets a fixed reply in the
question's language.

**Retrieval.** Once a question passes the gate, a second query picks the chunks for the prompt.
It adds the species at the end, which keeps dog and cat material apart: `"What vaccines does my
pet need?"` finds `vaccination_of_dogs.txt` first on its own, and with `" Cat"` added the top two
chunks come from `cdc_cats.txt` and `feline_vaccination.txt`. Up to `MAX_RESULTS` chunks under the
threshold go into the prompt.

The gate cannot use that suffix. One domain word pulls any question toward a corpus that is
entirely about dogs and cats: "What is the capital of France?" drops from **1.597** to about
**1.2** with it, and "How do I bake sourdough bread?" from **1.464** to **1.155**. Neither crosses
0.91, but the suffix uses up much of the margin, so the gate keeps the plain query at the cost of
one extra ChromaDB lookup.

The model always receives the question exactly as the owner typed it, in their language. Only the
search queries are rewritten.

**Conversation memory.** A question is not answered in isolation. Up to 25 prior messages for
that pet, from the last seven days, are sent as conversation turns ahead of the current one.
Answers are far longer than questions and dominate the cost, so they are truncated on a sliding
scale: the two most recent keep 1,200 characters and older ones keep 300, which is enough to
identify what a topic was. Questions are never truncated. However long the earlier answers were,
the history carries at most 5,400 characters of them, so it stays small next to the retrieved
corpus instead of competing with it for the model's attention.

Memory alone does not make follow up questions work, because the scope gate runs first and a
follow up such as "how often?" retrieves nothing on its own. A question under six words is
therefore expanded with the previous one for the search only. The model still receives what the
owner actually typed and resolves the reference from the turns it now has.

**Guardrails.**

1. A system prompt that separates CONTEXT (general veterinary material) from PET (this animal's
   details and records), forbids stating anything about the pet that its records do not show,
   and forbids diagnosis.
2. The scope gate: a question outside the corpus is never answered by the model.
3. A medical disclaimer rendered by the apps, not requested from the model, so it cannot be
   left out or reworded. On the web it sits on the landing page and in the footer of every page
   behind the sign in. On Android it is on the sign in and registration screens.
4. No prices and no recommendations. Owners use the app in several countries and the app stores
   no country, so the prompt forbids stating a price or recommending an insurer, clinic or brand.
   A question about cost is answered with what the corpus says and a suggestion to ask the clinic
   for an estimate.

---

## Reminders

Reminders cover everything scheduled for a pet: appointments, record follow ups and weight
checks.

The scheduler runs **hourly**, not daily. Each run picks out the owners for whom it is currently
`REMINDER_HOUR` (6am by default) in their own timezone, because a single daily job can only ever
be 6am in one place. Owners choose their timezone in Settings, and the device's timezone is the
default at registration.

Every kind of reminder, push notifications included, goes only to owners who have verified their
email address.

* **Email** goes to owners with reminders on. Each owner chooses weekly, sent on Sundays and
  covering everything due within `REMINDER_LEAD_DAYS`, or daily, covering what is due today or
  overdue.
* **Push** notifications go daily to owners with push on, for anything due today or overdue, on
  every device they have registered.
* **Feeding reminders** are off until the owner turns them on. A second job runs every 15
  minutes, and at each feeding time with no meal logged yet it sends an email, a push notification
  or both, depending on the owner's settings.

A locked or suspended account gets no reminders.

**Warnings before an account locks** are account notices rather than reminders, so they ignore
the reminder and push settings. Seven, three and one days before a free month or a Premium that
will not renew runs out, at the owner's reminder hour, every registered device gets a push
notification, a verified address gets an email, and both apps show a banner.

Emails and push notifications are written in each owner's app language. `utils/push.py` sends
through Expo's push service, which delivers through FCM on Android and APNs on iOS. Tokens Expo
reports as unregistered are deleted, so an uninstalled app stops being retried.

---

## Premium and payments

**The free month.** Every new account gets 30 days, with up to 30 questions a day, counted from
midnight in the owner's timezone. Premium and granted accounts have no daily limit.

**Locking.** Once the free month and any Premium have run out, the account locks. Reading and
deleting still work, so the owner keeps their data and can export it, and account settings,
email and password still change. Anything else that adds or changes data, asking a question
included, is refused with 403 and the code `subscription_required`.

**Buying.** On the web, `/billing/checkout` opens Stripe Checkout for the monthly or yearly price,
and Stripe's own billing portal handles cards and cancelling. On Android the app buys through
Google Play with RevenueCat's SDK. RevenueCat keeps one entitlement across both stores, so
Premium bought in one works in the other. Its webhook makes the backend read the account again
from RevenueCat rather than trust the event, so a duplicate or late delivery does no harm, and a
daily job reads every account with a purchase again in case a webhook was lost.

**One free month per email.** Deleting an account or changing its email leaves a fingerprint of
the address for a year: a hash keyed with `SECRET_KEY`, so the address cannot be read back from
it. Signing up again with that email gives back only the trial days the old account had left,
and none if it was paying, granted or already locked.

**Ending.** Deleting an account stops its renewals on Stripe and Google Play. If a renewal cannot
be stopped, nothing is deleted and the owner is asked to try again. A ban stops renewals too,
but goes ahead even when one cannot be stopped, and tells the owner what to cancel by hand.

---

## Admin

**Commands.** Every change to an account is a command run on the server, so none of it can be
reached from the web:

```bash
docker compose exec backend python -m admin ban someone@example.com --reason "Spam"
docker compose exec backend python -m admin unban someone@example.com
docker compose exec backend python -m admin grant someone@example.com --until 2027-01-31
docker compose exec backend python -m admin revoke someone@example.com
docker compose exec backend python -m admin delete someone@example.com
docker compose exec backend python -m admin log someone@example.com
```

| Command | What it does |
|---|---|
| `ban` | Suspends the account. It cannot sign in, every session ends, reminders stop, renewals are stopped and its email cannot sign up again. A renewal a store would not stop is listed to cancel by hand. The data stays until `delete`. |
| `unban` | Lifts a ban, also for an account that was deleted. Renewals the ban stopped stay stopped. |
| `grant` | Gives Premium for life, or through the day given with `--until` |
| `revoke` | Takes back granted Premium. The account falls back to what is left of its free month, or locks. |
| `delete` | Deletes a banned account and everything it owns. Only banned accounts, so a mistyped email can never remove a normal user. |
| `log` | The latest actions, for one email or for everyone |

Every command but `log` takes `--reason`, which is kept in the action log and never shown to the
user. A ban or a grant also emails the account's verified address, in its language.

**What is recorded.** Besides what the app itself needs, the backend keeps a few things for the
dashboard: one row for each day an account uses the app, with the app it used, named by the
clients in an `X-Client` header and deleted after 13 months. The country of the address an
account signed up or last logged in from, looked up in DB-IP's database inside the backend,
while the address itself is never stored. Each question's Claude tokens. Every purchase event
RevenueCat reports.

**The dashboard.** Grafana, with four dashboards kept as files in `grafana/provisioning/`:

* **Overview**: accounts, active users, signups, a world map of countries, languages, apps,
  plans, the Get started funnel and how many came back each week after signing up.
* **Users**: a searchable list of accounts. Clicking an email shows that account's details,
  activity, Get started steps, purchases and admin log.
* **Usage**: questions and how many were refused, and what owners log each day.
* **Money**: what customers paid and the estimate of what is left after tax and store
  commission, every cost by category (Claude, the stores' commission, Stripe's fees and the fixed
  costs typed in), profit, the most expensive accounts in Claude and the fixed costs form. It
  counts real purchases only.

Grafana reads the database as `grafana_reader`, a role the backend sets up at every start: read
only, at most 30 seconds per query, the owner's timezone, and the `stats` views only. It is
served on the secret path in `STATS_PATH`, marked not to be indexed, behind Caddy's password
prompt and then Grafana's own login.

The fixed costs form is the dashboard's one way to change anything. Its buttons post through
the same secret path, where Caddy adds `STATS_GATE_SECRET`. Without that header the backend
answers 404, and the public `/api` route strips it, so the form cannot be reached from outside.
A cost can be added, given a new amount from a date on, ended or removed, and a new amount keeps
what earlier months paid. Stripe's fees are read from the Stripe balance once a day, and
Claude's cost comes from each question's tokens and a table of prices in the `stats` schema.

<details>
<summary><b>Admin dashboard screenshots</b>, from throwaway test accounts</summary>

**Overview**

![Admin dashboard, Overview](screenshots/V3.5/Admin/overview.png)

**Users, with an account picked**

![Admin dashboard, Users](screenshots/V3.5/Admin/users.png)

**Usage**

![Admin dashboard, Usage](screenshots/V3.5/Admin/usage.png)

**Money**

![Admin dashboard, Money](screenshots/V3.5/Admin/money.png)

</details>

---

## Mobile client

An Android client in `frontend-mobile/`, built with React Native and Expo. It talks to the same
API as the web app and shares no code with it. It has five tabs (Dashboard, Records, Tracking,
Photos and Chat), with Settings behind the gear in the dashboard header.

Three things it does that the web app does not: receive push reminders, offer a camera button in
the record form and show cached data offline. The account, the pet list and records are cached
after each successful fetch and shown with a banner when the network is unavailable. The session
token is kept in the device's secure storage. Premium is bought in the app through Google Play,
with RevenueCat's SDK.

To run it, create `frontend-mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://192.168.1.20:8000
EXPO_PUBLIC_USE_RN_FETCH=1
EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY=
```

The API address must be one the phone can reach, such as your computer's address on the local
network, with the development override publishing port 8000. Port 8000 is the backend itself, so
there is no `/api` prefix. That prefix belongs to Caddy, which strips it before passing requests
on. `EXPO_PUBLIC_USE_RN_FETCH=1` keeps React Native's own `fetch` as the global, because Expo's
rejects the multipart file parts that photo uploads send. `EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY` is
RevenueCat's public Google Play key. Without it the app runs, but the Premium screen cannot sell
anything.

```bash
cd frontend-mobile
npm install
npx expo start
```

Push notifications need a development build. Expo Go cannot receive them. Installable builds are
made with EAS, using the profiles in `eas.json`:

```bash
npx eas-cli build --platform android --profile preview
```

---

## Deployment

Production runs this same Compose file on one server.

1. Point the domain's DNS at the server and open ports 80 and 443.
2. In `.env`, set `SITE_ADDRESS` to the domain and `FRONTEND_URL` to `https://` plus the domain.
   Caddy then obtains and renews its own certificate from Let's Encrypt.
3. For payments, fill in the Stripe and RevenueCat keys, then add a Stripe webhook to
   `https://` plus the domain plus `/api/billing/stripe` for `checkout.session.completed`, and a
   RevenueCat webhook to `/api/billing/revenuecat` on the same domain, with the `Authorization`
   value from `REVENUECAT_WEBHOOK_AUTH`.
4. For the admin dashboard, fill in the Grafana and `STATS_` lines and set `COMPOSE_PROFILES=stats`.
   It then opens at the domain followed by `STATS_PATH`.
5. Run `docker compose up -d --build`.

To update, run `git pull` and then `docker compose up -d --build` again. The frontend needs the
rebuild because its bundle is built into the image, and migrations run on every backend start.
The backend image carries the corpus too, so after a corpus change, rebuild and then reindex as
described under [RAG pipeline](#rag-pipeline). Rebuilding the backend after a code change also
fetches the current month's country database.

Never copy `docker-compose.override.yml` to the server. Compose would load it automatically,
publish Postgres and run uvicorn with `--reload`.

---

## Testing

The suite has 121 tests, in one file per area, and runs against a real Postgres database. It
creates and drops every table for each test, so it needs a separate `companion_test` database.
Create it once:

```bash
docker compose exec db psql -U companion -d postgres -c "CREATE DATABASE companion_test OWNER companion;"
```

Then run the suite:

```bash
docker compose exec backend python -m pytest tests -v
```

Email, push notifications and question translation are stubbed by autouse fixtures, and the
payment tests stub Stripe and RevenueCat. One test indexes two small documents and stubs the
answer. It and the test that indexes a guide paragraph remove what they added, so the other
`/ask` tests see an empty collection and take the refusal branch. Three more cover the search
plumbing: a paragraph that cites its own source on a `SOURCE` line, section anchors on Wikipedia
links only, and brand names gaining their active ingredients. The suite never calls Claude,
Resend, Expo, Stripe or RevenueCat, so it costs nothing to run.

CI runs on every push: the backend suite against a `postgres:17` service container, `ruff`, a
Docker build of both images, and type checking and linting for both clients.

---

## Project structure

```
backend/
  alembic/            migrations
  docs/               the corpus, plus ATTRIBUTION.md
  i18n/               strings the server sends, in eight languages
  models/             SQLAlchemy models
  routers/            auth, pets, records, events, walks, feedings,
                      expenses, messages, ask, devices, billing, costs
  schemas/            Pydantic request and response models
  tests/              one file per area
  utils/              security, mailer, push, reminders, scheduling,
                      feeding, weight, photos, export, i18n, limiter,
                      messages, exceptions, pagination, onboarding,
                      access, billing, trial_fingerprints, accounts,
                      admin, activity, geo, stats_access, stripe_fees
  admin.py            the owner's command line
  config.py           settings from environment
  database.py         engine and session
  rag.py              chunking, ingest, translation, retrieval, generation
  main.py             app wiring, CORS, static mount, scheduler, API docs

frontend-web/
  src/
    api/              one module per resource, where all HTTP lives
    auth/             AuthContext
    context/          PetContext, the current pet shared across pages
    theme/            theme, accent and background pattern
    i18n/             i18next setup and the eight catalogues
    components/       layout, forms, settings panels, ChatFAB,
                      GetStarted, PremiumBanner
    components/ui/    Button, Input, Modal, ConfirmDialog
    pages/            Landing, Login, Register, Verify, Forgot, Reset,
                      Dashboard, Records, Tracking, WeightTracking, Walks,
                      Feeding, Budget, Photos, ChatHistory, Settings,
                      Premium, Privacy, Terms
  public/.well-known/ assetlinks.json for Android App Links
  Caddyfile           static serving, SPA fallback and the /api proxy
  Dockerfile          Node build stage, Caddy serving stage

frontend-mobile/
  src/app/            expo-router routes: (auth), (tabs) with tracking/,
                      settings/ with premium
  src/api/            the same resource modules, ported
  src/auth/           AuthContext
  src/context/        PetContext, the current pet shared across screens
  src/components/     forms, settings panels, tab bar, UI primitives
  src/theme/          theme, accent and background pattern
  src/i18n/           i18next setup and the eight catalogues
  src/purchases.ts    Google Play purchases through RevenueCat
  eas.json            build profiles

grafana/provisioning/
  datasources/        the database, as the read only grafana_reader
  dashboards/         Overview, Users, Usage and Money, as JSON
```

---

## Known limitations

* **Sessions are JWTs with no refresh token flow,** kept in `localStorage` on the web. They last
  7 days with the example settings. Changing the password ends every existing session, because
  each token carries a fingerprint of the password hash.
* **The reminder scheduler runs inside the backend process.** Two backend replicas would send
  everything twice, so it needs its own service before scaling out.
* **Photos are protected by unguessable filenames, not authorisation.** Anyone holding a URL can
  view that image. Acceptable for pet photos, not for anything sensitive.
* **PDF export is text only** and its font is Latin 1, so Arabic, Russian and Chinese text
  degrades to `?`. The zip export keeps it intact.
* **The search matches wording, not meaning.** The corpus is English and covers dogs and cats
  only, and a question worded far from every paragraph is refused even when the answer is there.
  A brand missing from the table in `routers/ask.py` means nothing to the search, so a question
  that names only that brand can be refused.
* **Chat history is per pet, not per conversation.** There are no separate threads, so the
  seven day window is what separates one sitting from the next.
* **Swagger's Authorize button cannot sign in.** It sends a form, and `/auth/login` takes JSON.
* **The mobile client is Android only so far.** The iOS build needs an Apple developer account.
* **A country comes from the address.** A VPN or a mobile network can place an account in the
  wrong country, and a private address keeps the country found before.
* **The fixed costs form reports every refusal the same way.** The backend explains what is wrong,
  such as an unknown category, but Grafana only says that an error occurred.

---

## Troubleshooting

**The chat fails on every question it should answer.** Check `ANTHROPIC_API_KEY`. The backend
starts without it, but answers and question translation both need it.

**`password authentication failed for user "companion"`.** The password inside `DATABASE_URL`
does not match `POSTGRES_PASSWORD`. `POSTGRES_PASSWORD` only takes effect when the database
volume is first created, so changing it later means `docker compose down`, then removing the
`db_data` volume, which deletes the data. `docker volume ls` shows its full name, prefixed with
the project folder's name.

**Environment changes seem to be ignored.** `docker compose restart` reuses the existing
container's environment. Use `docker compose up -d --force-recreate` instead.

**The frontend shows old code.** `VITE_API_URL` and the whole bundle are baked in at build time.
Rebuild with `docker compose up -d --build frontend`.

**Answers still cite old sources after a corpus change.** The index keeps its old chunks until
it is rebuilt. In production the corpus is baked into the backend image, so rebuild it first,
then reindex as described under [RAG pipeline](#rag-pipeline).

**No emails arrive.** A failed send is logged, never raised, so nothing in the app shows it.
Check `docker compose logs backend` for the real failure, and confirm `MAIL_FROM` is on a domain
verified with Resend.

**The admin dashboard does not start.** Grafana refuses to start without `GRAFANA_ADMIN_PASSWORD`
and `GRAFANA_DB_PASSWORD`, and `docker compose logs grafana` says so. It also only runs while
`COMPOSE_PROFILES` includes `stats`.

**The dashboard's password prompt never accepts the password.** `STATS_PASSWORD_HASH` lost its
`$` signs. Keep it in single quotes in `.env`, then run `docker compose up -d`.

---

## Corpus attribution

The corpus has three kinds of document. `backend/docs/ATTRIBUTION.md` lists every file's source,
the date it was retrieved and, for Wikipedia, the exact revision.

* **Wikipedia articles** are licensed under
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Text was extracted through
  the MediaWiki API, stripped of markup and reformatted so each paragraph starts with a heading
  naming where it came from.
* **FDA and CDC pages** are works of the United States government and are in the public domain
  in the United States.
* **The guides**, the files whose names start with `guide_`, were written for this project and
  are licensed under CC BY-SA 4.0. They cite their sources in the app like any other document.

---

## Country data

The country lookup uses DB-IP's free IP to Country Lite database, licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/):
[IP Geolocation by DB-IP](https://db-ip.com). It is downloaded while the backend image is built
and is not part of this repository.

---

## License

All rights reserved. The source is published for evaluation and reference. It is not licensed
for reuse, redistribution or deployment. See [`LICENSE`](LICENSE).

The reference corpus in `backend/docs/` is the exception. Its Wikipedia documents and guides are
under CC BY-SA 4.0, and its FDA and CDC pages are in the public domain in the United States, as
described above. DB-IP's country database keeps its own license, also described above.
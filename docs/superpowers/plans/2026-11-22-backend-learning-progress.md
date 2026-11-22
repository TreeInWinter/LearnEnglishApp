# Backend Learning Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist offline learning progress through a Cloudflare Durable Object and turn every extended-bank prompt into deterministic sentence cloze practice.

**Architecture:** Keep `localStorage` as the immediate source of truth for offline use. Add an anonymous browser ID and a snapshot-based `GET`/`PUT /api/progress` API backed by one Durable Object instance per ID. Represent extended entries as the existing `define` records with a generated `sentence` field, then reuse the existing cloze slot UI whenever a sentence is present.

**Tech Stack:** Vanilla JavaScript, Cloudflare Workers, Durable Objects, Wrangler, existing static asset build.

**Spec:** `docs/superpowers/specs/2026-11-22-backend-learning-progress-design.md`

## Global Constraints

- Existing frontend is vanilla JavaScript with no runtime dependencies.
- Existing backend is a Cloudflare Worker with Durable Objects.
- Existing TTS routes and `SpeechStore` behavior must remain compatible.
- The backend must reject malformed or oversized progress payloads.
- Client IDs are anonymous browser identifiers and are not an authentication system.
- The app must continue to answer offline using local storage.

## Review Focus

- A first visit with no remote snapshot must create and persist a client snapshot without blocking the first exercise.
- A malformed, oversized, or wrong-client progress request must receive a controlled 4xx response and must not write storage.
- A pre-existing local `cloze_state_v1` record must keep its settings and learning data while gaining sync metadata.
- An extended entry with a multi-word answer or punctuation must render and validate the sentence blank correctly.
- A failed sync or offline transition must leave local progress intact and retry later.

---

### Task 1: Add the progress Durable Object and API routes

**Files:**
- Modify: `worker.mjs`
- Modify: `wrangler.jsonc`

**Interfaces:**
- Consumes: `X-Learning-Client` header and JSON progress snapshots.
- Produces: `GET /api/progress` returning `{snapshot: null}` or `{snapshot, revision, updatedAt}`, and `PUT /api/progress` returning the stored metadata.
- Produces: `ProgressStore` Durable Object binding named `PROGRESS_STORAGE`.

- [ ] **Step 1: Add validation and normalization helpers in `worker.mjs`**

  Accept only client IDs matching the anonymous UUID/fallback format, reject bodies over 512 KiB, and normalize `progress`, `wrongBook`, `today`, `checkin`, `history`, `totalPracticed`, and `totalCorrect` into bounded JSON-safe values. Reject malformed JSON, wrong content type, invalid fields, and unknown word IDs with `400` or `413` responses.

- [ ] **Step 2: Implement `ProgressStore.fetch(request)`**

  Store the normalized snapshot under one key. Return an empty snapshot for a new client on `GET`, replace the snapshot on `PUT`, assign a server timestamp and random revision, and return JSON with `Cache-Control: no-store`.

- [ ] **Step 3: Route `/api/progress` in the worker entrypoint**

  Require `GET` or `PUT`, validate the same-origin `Origin` when present, require `X-Learning-Client`, choose `env.PROGRESS_STORAGE.idFromName(clientId)`, and forward the request to the Durable Object. Leave `/api/tts/:id` behavior unchanged.

- [ ] **Step 4: Register the Durable Object binding and migration**

  Add `PROGRESS_STORAGE` for `ProgressStore` and a new SQLite migration tag in `wrangler.jsonc` while retaining the existing `SpeechStore` migration.

- [ ] **Step 5: Run backend syntax/build verification**

  Run `node --check worker.mjs` and `npm run build`. Expected output includes successful asset preparation and no syntax errors.

---

### Task 2: Generate sentence prompts for the extended bank

**Files:**
- Modify: `app.js`

**Interfaces:**
- Consumes: extended tuples `[id, cat, word, phonetic, pos, meaning, meaningEn, level, frq, tier]`.
- Produces: each extended record keeps `mode: 'define'` for its scope/category semantics, gains a deterministic `sentence` containing exactly one `___`, and uses cloze validation whenever `sentence` is present.

- [ ] **Step 1: Add `generatedSentence(word, pos, meaningEn)`**

  Strip dictionary POS prefixes and trailing punctuation from the English definition, then return the stable fallback form `In this lesson, ___ means <definition>.` Use `In this lesson, ___ is used as a vocabulary word.` when the definition is empty. Preserve the target word as the only blank and keep the definition HTML-escaped at render time.

- [ ] **Step 2: Populate `sentence` while mapping `EXTENDED_BANK_RAW`**

  Call `generatedSentence` for each extended entry and keep its existing definition metadata so the prompt shows both the meaning and the sentence.

- [ ] **Step 3: Reuse cloze rendering for sentence-backed entries**

  Add an `isDefinitionPrompt(w)` helper that is true only for records with `mode === 'define'` and no sentence. Update practice rendering, feedback, answer submission, hint text, synonym handling, and full-sentence speech to use that helper. Sentence-backed extended entries must use the existing slot input and require the complete answer before submission.

- [ ] **Step 4: Update bank details and copy**

  Show generated sentence details for extended entries, label them as sentence practice, and update settings/about copy so it no longer claims that extended entries have no example sentences or that all data is local-only when sync is enabled.

- [ ] **Step 5: Run frontend build verification**

  Run `npm run build` and inspect the generated asset count. Use a small Node assertion against the mapping logic or a browser smoke check to confirm an extended entry has a `___` sentence and the existing core entry still has its hand-authored sentence.

---

### Task 3: Add offline-first backend synchronization

**Files:**
- Modify: `app.js`
- Modify: `tools/build_cloudflare.cjs`

**Interfaces:**
- Consumes: Task 1 `/api/progress` API and Task 2 state shape.
- Produces: `syncFromBackend()`, `queueSync()`, `flushSync()`, and a local anonymous client ID stored under `cloze_client_id_v1`.

- [ ] **Step 1: Add sync metadata and client-ID helpers**

  Load a separate `cloze_sync_v1` metadata record with `clientId`, `localUpdatedAt`, `serverUpdatedAt`, and sync status. Generate a UUID with a safe random fallback and never place the client ID in the exported learning snapshot.

- [ ] **Step 2: Add snapshot serialization and remote application**

  Serialize only learning fields. On startup, fetch the remote snapshot after the first local render, compare `clientUpdatedAt` with the local metadata, apply a newer remote snapshot while preserving local settings, or upload local state when it is newer or the remote record is empty.

- [ ] **Step 3: Queue writes after learning mutations**

  Mark progress dirty after `record`, queue regeneration/import/reset changes, debounce writes, keep only one request in flight, and retry on the next mutation or `online` event. A failed request changes only the displayed sync status and never rolls back local progress.

- [ ] **Step 4: Enable sync in the Cloudflare build**

  Inject `window.LEARNING_SYNC_ENABLED = true` beside `window.CLOUD_TTS_ENABLED` in `tools/build_cloudflare.cjs`. The plain static source remains usable without API calls.

- [ ] **Step 5: Add sync status to settings**

  Render a compact status row for synced, pending, offline, and unavailable states. Keep practice and import/export usable regardless of status.

- [ ] **Step 6: Verify offline and sync paths**

  Run `npm run build`, `node --check app.js`, and a browser smoke check through `wrangler dev` if available. Verify a local answer updates `localStorage` immediately, a failed fetch leaves it intact, and the settings status changes without breaking navigation.

---

### Task 4: Review and final verification

**Files:**
- Modify: any files required by verification findings from Tasks 1–3.

**Interfaces:**
- Consumes: complete branch implementation.
- Produces: verified build and clean, reviewable diff.

- [ ] **Step 1: Run the full local verification set**

  Run `npm run build`, `node --check app.js`, `node --check worker.mjs`, and `git diff --check`. Expected result is successful build, no syntax errors, and no whitespace errors.

- [ ] **Step 2: Inspect the diff against the design**

  Confirm TTS routes are preserved, progress payloads exclude settings and credentials, extended questions show sentences, and untracked user files remain untouched.

- [ ] **Step 3: Report branch and verification results**

  Report the branch name, files changed, generated sentence behavior, backend route, offline fallback, and any verification limitation such as unavailable Cloudflare credentials.

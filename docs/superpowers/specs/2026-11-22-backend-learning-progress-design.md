# Backend Learning Progress and Sentence Practice Design

## Intent

Persist the learner's progress in the Cloudflare backend while keeping the app usable offline, and make every extended-bank exercise present the target word inside a sentence instead of asking for an isolated word.

## Goals

- Create a backend API for reading and writing a learner's progress snapshot.
- Keep local storage as the offline cache and sync after successful practice.
- Use an anonymous per-browser client ID because the app has no account system.
- Convert extended-bank entries into deterministic sentence cloze prompts generated from the word, part of speech, and English definition.
- Preserve the existing curated core sentence questions, review queue, statistics, import/export, and TTS behavior.

## Non-goals

- User accounts, cross-device identity, or social sharing.
- Replacing local storage or making the app unusable when the backend is unavailable.
- Hand-authoring or importing a 12,000-entry sentence corpus.
- Generating sentences at request time through an external AI service.

## Constraints

- Existing frontend is vanilla JavaScript with no runtime dependencies.
- Existing backend is a Cloudflare Worker with Durable Objects.
- Existing TTS routes and `SpeechStore` behavior must remain compatible.
- The backend must reject malformed or oversized progress payloads.
- Client IDs are anonymous browser identifiers and are not an authentication system.

## Approaches

1. **Curated core sentences only**
   Use the existing `words.js` examples and leave extended entries as definition questions. This gives the best sentence quality but does not satisfy full-bank sentence practice.

2. **Deterministic generated sentences for the full bank (selected)**
   Generate a stable cloze sentence locally from the entry's part of speech and `meaningEn`, while keeping the Chinese and English definitions visible. This covers the full bank without a large data import and works offline. The generated sentence is deliberately metalinguistic when a dictionary entry cannot safely fit a semantic template.

3. **Reviewed sentence dataset**
   Add one reviewed sentence per extended entry. This has the strongest content quality but is a separate large content-production project and is outside this change.

## Product behavior

- Core entries continue to use their hand-authored scene and sentence.
- Extended entries use a new sentence-practice representation with a blank for the target word. The definition remains above the sentence so the prompt still provides meaning.
- The answer interaction uses the existing cloze slot UI, hint flow, feedback, review queue, and spaced-repetition recording.
- The generated prompt is deterministic for a given entry, so it does not change between sessions or devices.
- The bank detail view shows the generated sentence with the target word filled in.

## Backend and sync behavior

- The browser creates and stores an anonymous `cloze_client_id` with `crypto.randomUUID()` and a safe fallback.
- The Worker exposes `GET /api/progress` and `PUT /api/progress` and routes both to a `ProgressStore` Durable Object named by the client ID.
- The client ID is passed in `X-Learning-Client`. Requests must come from the same origin. The Worker validates the ID format, method, content type, payload size, and state shape.
- The stored snapshot contains learning data needed to resume progress, including per-word progress, wrong-book IDs, today's queue/results, check-in, history, totals, and a revision/timestamp. Settings remain local to the browser.
- On startup, the frontend loads local state first, then fetches the remote snapshot when backend sync is enabled. The newer local/remote snapshot wins by `updatedAt`, with a deterministic merge for per-word progress and history where timestamps exist.
- After a recorded answer, the frontend saves locally immediately and sends the current learning snapshot. A failed request leaves the local state intact and retries on a later answer or online event.
- The UI exposes sync status in the settings view and does not block practice on network availability.

## Files likely to change

- `worker.mjs` for the progress Durable Object, validation helpers, and routes.
- `wrangler.jsonc` for the new Durable Object binding and migration.
- `app.js` for generated sentence mapping, backend sync, and sync status.
- `index.html` and `styles.css` only if a sync-status element needs layout styling.
- `tools/build_cloudflare.cjs` only if generated assets or worker bindings require build changes.

## Open implementation calls

- Use a single snapshot endpoint rather than per-answer event storage because the current app already owns a complete local state object and needs offline export/import compatibility.
- Limit stored payloads to a practical size and strip unknown fields before persistence so future frontend settings do not accidentally become backend data.
- Use a revision token and updated timestamp for idempotent retries. A later write from the same anonymous client replaces the previous snapshot.

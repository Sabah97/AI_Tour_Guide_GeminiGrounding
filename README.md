# AI Tour Guide — Gemini Maps Grounding

Chat UI powered by **Gemini** with **Google Maps Grounding**. User asks in natural
language, Gemini queries Google Maps, returns grounded location-aware answers with
place citations.

## Stack

- **Client**: Vite + React 18, modern chat UI, multi-turn state.
- **Server**: Express proxy. Holds `GEMINI_API_KEY` server-side, exposes `/api/chat`.
- **SDK**: `@google/genai` with `tools: [{ googleMaps: {} }]`.

## Setup

```bash
# 1. install all workspaces
npm run install:all

# 2. configure env
cp .env.example .env
# edit .env, set GEMINI_API_KEY
# (client/.env is optional, only needed to override API base URL)

# 3. dev (server :8787, client :5173)
npm run dev
```

Open <http://localhost:5173>.

## Project Layout

```
.
├── server/                 Express + Gemini proxy
│   ├── index.js
│   └── package.json
├── client/                 Vite + React chat UI
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/     ChatWindow, MessageBubble, ChatInput, ...
│   │   ├── hooks/useChat.js
│   │   ├── lib/api.js
│   │   └── styles.css
│   ├── vite.config.js
│   └── package.json
├── package.json            root scripts (concurrent dev)
└── .env.example
```

## How Maps Grounding works

Server sends each conversation turn to Gemini with:

```js
config: {
  tools: [{ googleMaps: {} }],
  // when client supplies location:
  toolConfig: {
    retrievalConfig: { latLng: { latitude, longitude } },
  },
}
```

Per Google docs, `latLng` biases grounding toward nearby places — pass it when
the user states a location ("I'm in Uttara Sector 4…"). Without it, Gemini
still grounds but may pick a less relevant region. Location is attached
through the UI's preset chips or custom lat/lng input.

Gemini may call the Maps tool to fetch places, distances, hours. Response includes:

- `text` — final grounded answer
- `groundingMetadata.groundingChunks` — `web` and `maps` source chunks with URIs
- `groundingMetadata.groundingSupports` — segment-level citations
- `googleMapsWidgetContextToken` — token client uses to render a Google Maps widget
  (forwarded when `ENABLE_MAPS_WIDGET=true`).

Client renders grounded citations inline; ungrounded reasoning is labeled as
*AI inference*; assumptions explicitly stated by model are surfaced under
"Assumptions" section.

### Note on model id

The Google docs example references `gemini-3.5-flash`, which is not a real
model. Use `gemini-2.5-flash` or `gemini-2.5-pro`. Override via `GEMINI_MODEL`
in `.env`.

## Production notes

- API key **never** ships to client. All Gemini calls go through `/api/chat`.
- Server validates message shape, enforces `MAX_HISTORY_TURNS` to bound token use.
- CORS locked to `CLIENT_ORIGIN`.
- Rate limiting via `express-rate-limit` (toggle in `server/index.js`).
- Streaming supported via SSE (`/api/chat/stream`); non-streaming fallback at `/api/chat`.
- Set `GEMINI_MODEL` to switch model. Maps tool works on `gemini-2.5-flash`, `gemini-2.5-pro`.

## Example prompt

> I am standing in Uttara Sector 4 right now. Using nearby real-world places, create
> the best possible 1-hour itinerary for someone who wants a quiet environment,
> minimal walking (under 1 km), and a place to read a book...

Response will include grounded place names, travel times, walking distances, and
explicit confidence statements per the prompt's contract.

// server/index.js
// Express proxy: validates chat payloads, calls Gemini with Google Maps Grounding,
// returns grounded text + citations to client. Keeps GEMINI_API_KEY server-side.

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';

// Resolve .env relative to this file, not process.cwd(). Works under
// `npm --prefix server run dev` (cwd = server/) and `node index.js` from root.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ---------- config ----------
const PORT = Number(process.env.PORT) || 8787;
const NODE_ENV = process.env.NODE_ENV || 'development';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const ENABLE_MAPS_WIDGET = String(process.env.ENABLE_MAPS_WIDGET || 'true') === 'true';
const CLIENT_ORIGIN = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const MAX_HISTORY_TURNS = 20;
const MAX_MESSAGE_CHARS = 4000;
const LAT_RANGE = { min: -90, max: 90 };
const LON_RANGE = { min: -180, max: 180 };

if (!GEMINI_API_KEY) {
  console.error('[fatal] GEMINI_API_KEY missing. Set it in .env before starting server.');
  process.exit(1);
}

// ---------- client ----------
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// ---------- app ----------
const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '256kb' }));
app.use(
  cors({
    origin: (origin, cb) => {
      // allow non-browser tools (no origin)
      if (!origin) return cb(null, true);
      if (CLIENT_ORIGIN.includes('*') || CLIENT_ORIGIN.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: false,
  }),
);

const chatLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30, // 30 req / minute / IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
app.use('/api/', chatLimiter);

// ---------- helpers ----------

/**
 * Normalize client-supplied history into Gemini `contents` shape.
 * Accepts: [{ role: 'user' | 'model', text: string }, ...]
 * Returns Gemini SDK `contents` array.
 */
function toGeminiContents(messages) {
  return messages
    .filter((m) => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string')
    .map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));
}

/**
 * Pull Maps grounding metadata into a client-friendly shape.
 */
function extractGrounding(response) {
  const candidate = response?.candidates?.[0];
  const meta = candidate?.groundingMetadata ?? {};
  const chunks = Array.isArray(meta.groundingChunks) ? meta.groundingChunks : [];
  const supports = Array.isArray(meta.groundingSupports) ? meta.groundingSupports : [];

  const sources = chunks
    .map((c, i) => {
      if (c?.web?.uri || c?.web?.title) {
        return {
          kind: 'web',
          index: i,
          uri: c.web.uri ?? null,
          title: c.web.title ?? null,
        };
      }
      if (c?.maps?.uri || c?.maps?.title || c?.maps?.placeId) {
        return {
          kind: 'maps',
          index: i,
          uri: c.maps.uri ?? null,
          title: c.maps.title ?? null,
          placeId: c.maps.placeId ?? null,
        };
      }
      return null;
    })
    .filter(Boolean);

  return {
    sources,
    supports: supports.map((s) => ({
      segment: s.segment ?? null,
      chunkIndices: Array.isArray(s.groundingChunkIndices) ? s.groundingChunkIndices : [],
      confidence: typeof s.confidenceScores === 'number' ? s.confidenceScores : null,
    })),
    widgetContextToken: ENABLE_MAPS_WIDGET ? meta.googleMapsWidgetContextToken ?? null : null,
    searchQueries: Array.isArray(meta.webSearchQueries) ? meta.webSearchQueries : [],
  };
}

function validatePayload(body) {
  if (!body || typeof body !== 'object') return 'body must be an object';
  if (!Array.isArray(body.messages)) return 'messages must be an array';
  if (body.messages.length === 0) return 'messages must contain at least one user turn';
  if (body.messages.length > MAX_HISTORY_TURNS * 2) {
    return `messages exceed max ${MAX_HISTORY_TURNS * 2}`;
  }
  for (const m of body.messages) {
    if (!m || (m.role !== 'user' && m.role !== 'model')) return 'each message needs role user|model';
    if (typeof m.text !== 'string') return 'each message needs text string';
    if (m.text.length > MAX_MESSAGE_CHARS) return `message exceeds ${MAX_MESSAGE_CHARS} chars`;
  }
  // last message must be from user
  if (body.messages[body.messages.length - 1].role !== 'user') {
    return 'last message must be role=user';
  }
  if (body.location !== undefined && body.location !== null) {
    const locErr = validateLocation(body.location);
    if (locErr) return locErr;
  }
  return null;
}

function validateLocation(loc) {
  if (typeof loc !== 'object' || loc === null) return 'location must be an object';
  const { latitude, longitude } = loc;
  if (typeof latitude !== 'number' || Number.isNaN(latitude)) return 'location.latitude must be a number';
  if (typeof longitude !== 'number' || Number.isNaN(longitude)) return 'location.longitude must be a number';
  if (latitude < LAT_RANGE.min || latitude > LAT_RANGE.max) return `latitude out of range [${LAT_RANGE.min}, ${LAT_RANGE.max}]`;
  if (longitude < LON_RANGE.min || longitude > LON_RANGE.max) return `longitude out of range [${LON_RANGE.min}, ${LON_RANGE.max}]`;
  return null;
}

// ---------- routes ----------

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, model: GEMINI_MODEL, env: NODE_ENV });
});

app.post('/api/chat', async (req, res) => {
  const err = validatePayload(req.body);
  if (err) return res.status(400).json({ error: err });

  const { messages, location } = req.body;
  
  // Build system instruction with location context
  let systemInstruction = 
    `CRITICAL INSTRUCTION: You MUST respond EXCLUSIVELY in English language using ONLY Latin alphabet characters (A-Z, a-z, 0-9).

STRICTLY FORBIDDEN:
- Bengali/Bangla script (বাংলা)
- Any non-Latin characters or scripts
- Transliterated Bengali words

REQUIRED FOR ALL PLACE NAMES AND ADDRESSES:
- Use English names only (e.g., "Uttara Sector 4 Park" NOT "উত্তরা সেক্টর ৪ পার্ক")
- If you receive data in Bengali from Google Maps, you MUST translate/transliterate it to English
- Write addresses using English words and numbers only
- Use standard English transliteration for Bangladeshi place names

Example:
BAD: উত্তরা সেক্টর ৪ পার্ক
GOOD: Uttara Sector 4 Park

BAD: ঢাকা ১২৩০
GOOD: Dhaka 1230

If the user writes in Bengali/Bangla, respond in English. Never echo back Bengali text.\n`;
  
  if (location && location.latitude && location.longitude) {
    systemInstruction += `\nThe user's current location is at coordinates (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}). `;
    systemInstruction += `When they ask "where am I" or similar questions, use Google Maps to identify nearby landmarks, areas, or cities near these coordinates and tell them their approximate location IN ENGLISH. `;
    systemInstruction += `Use this location context for all location-based queries and nearby place recommendations.\n`;
  }

  // Add structured output format for place recommendations
  systemInstruction += `\nWhen the user asks for place recommendations (cafes, restaurants, tourist spots, parks, etc.), follow this format:
1. Provide EXACTLY 3-4 places (no more, no less)
2. For each place, use this structure:
   ### [Place Name in English - MUST use Latin characters only]
   **Address:** [Full address in English using Latin characters only - translate from Bengali if needed]
   **Distance:** [Distance from user's location]
   **Why it's suitable:** [Brief explanation matching their criteria]
   **Highlights:** [Key features, amenities, or unique aspects]

3. Order places from nearest to farthest from the user's location
4. Be concise - maximum 2-3 sentences per section
5. CRITICAL: ALL text including place names and addresses MUST be in English (Latin script) - absolutely NO Bengali/Bangla characters anywhere
6. If Google Maps returns Bengali text, translate it to English before including in your response`;
  
  const contents = toGeminiContents(messages);

  // Build Maps tool config. When location provided, attach retrievalConfig
  // with latLng so Gemini biases grounding toward nearby places (per docs).
  const toolConfig = location
    ? {
        retrievalConfig: {
          latLng: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
        },
      }
    : undefined;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        tools: [{ googleMaps: {} }],
        ...(toolConfig ? { toolConfig } : {}),
        ...(systemInstruction
          ? { systemInstruction: { parts: [{ text: String(systemInstruction) }] } }
          : {}),
      },
    });

    const text = response.text ?? '';
    const grounding = extractGrounding(response);

    if (NODE_ENV !== 'production') {
      const maps = grounding.sources.filter((s) => s.kind === 'maps');
      console.log(
        `[chat] model=${GEMINI_MODEL} textLen=${text.length} maps=${maps.length} web=${grounding.sources.length - maps.length}`,
      );
      for (const m of maps) console.log(`  - [${m.title || '(untitled)'}] ${m.uri || ''}`);
    }

    res.json({
      text,
      grounding,
      model: GEMINI_MODEL,
      finishReason: response?.candidates?.[0]?.finishReason ?? null,
    });
  } catch (e) {
    console.error('[chat] error', e);
    const status = e?.status || 500;
    res.status(status >= 400 && status < 600 ? status : 500).json({
      error: e?.message || 'gemini request failed',
      code: e?.code || null,
    });
  }
});

app.post('/api/place-details', async (req, res) => {
  const { placeName, placeId, latitude, longitude } = req.body;
  
  if (!placeName) {
    return res.status(400).json({ error: 'placeName is required' });
  }

  // Build prompt to get place details
  let prompt = `Tell me detailed information about "${placeName}". Include:
- Interesting facts and unique highlights
- Historical background (if applicable)
- Notable features or attractions
- Why it's worth visiting
- Any cultural or local significance

Keep it concise but informative (3-4 short paragraphs maximum).`;

  if (latitude && longitude) {
    prompt += ` This place is located at coordinates (${latitude.toFixed(4)}, ${longitude.toFixed(4)}).`;
  }

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      config: {
        tools: [{ googleMaps: {} }],
        ...(latitude && longitude
          ? {
              toolConfig: {
                retrievalConfig: {
                  latLng: { latitude, longitude },
                },
              },
            }
          : {}),
        systemInstruction: {
          parts: [
            {
              text: `CRITICAL: You MUST respond EXCLUSIVELY in English using ONLY Latin alphabet (A-Z, a-z, 0-9). 
              
FORBIDDEN: Bengali/Bangla script (বাংলা) or any non-Latin characters.

If you receive Bengali text from Google Maps, translate it to English before using it.

Provide factual, interesting information about places using ONLY English. Use Google Maps data when available but translate any Bengali text to English.

Example: "উত্তরা পার্ক" should be written as "Uttara Park"`,
            },
          ],
        },
      },
    });

    const text = response.text ?? '';
    const grounding = extractGrounding(response);

    if (NODE_ENV !== 'production') {
      console.log(`[place-details] place=${placeName} textLen=${text.length}`);
    }

    res.json({
      text,
      grounding,
      placeName,
    });
  } catch (e) {
    console.error('[place-details] error', e);
    const status = e?.status || 500;
    res.status(status >= 400 && status < 600 ? status : 500).json({
      error: e?.message || 'failed to fetch place details',
      code: e?.code || null,
    });
  }
});

// New endpoint to get coordinates from Google Maps place_id
app.post('/api/geocode-place-id', async (req, res) => {
  const { placeId, placeName } = req.body;
  
  if (!placeId) {
    return res.status(400).json({ error: 'placeId is required' });
  }

  console.log(`[geocode-place-id] Request for place="${placeName}" placeId="${placeId}"`);

  try {
    // Clean up place_id (remove 'places/' prefix if present)
    const cleanPlaceId = placeId.replace('places/', '');
    
    // Use Gemini with Google Maps to get place information
    // We'll ask for the place by name and use Maps tool to get coordinates
    const prompt = `What are the GPS coordinates of "${placeName}"? Provide ONLY the coordinates in this exact format: latitude,longitude (for example: 23.7925,90.4078)`;

    console.log(`[geocode-place-id] Asking Gemini for coordinates of "${placeName}"`);

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      config: {
        tools: [{ googleMaps: {} }],
        systemInstruction: {
          parts: [
            {
              text: `CRITICAL: You MUST respond EXCLUSIVELY in English using ONLY Latin alphabet (A-Z, a-z, 0-9). 

FORBIDDEN: Bengali/Bangla script or any non-Latin characters.

You must provide ONLY coordinates in the format: latitude,longitude

Use Google Maps data. Do not include any other text or explanation. 

If you receive Bengali place names, still provide coordinates but use English in any text.`,
            },
          ],
        },
      },
    });

    const text = response.text ?? '';
    console.log(`[geocode-place-id] Gemini response: "${text}"`);
    
    // Try to extract coordinates from response - be flexible with format
    const coordsMatch = text.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
    
    if (coordsMatch) {
      const latitude = parseFloat(coordsMatch[1]);
      const longitude = parseFloat(coordsMatch[2]);
      
      // Validate coordinates are reasonable
      if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
        console.log(`[geocode-place-id] ✓ Success: ${latitude}, ${longitude}`);
        
        res.json({
          latitude,
          longitude,
          placeId: cleanPlaceId,
          placeName,
        });
      } else {
        console.warn(`[geocode-place-id] ✗ Invalid coordinates: ${latitude}, ${longitude}`);
        res.status(404).json({ 
          error: 'Invalid coordinates received',
          text 
        });
      }
    } else {
      console.warn(`[geocode-place-id] ✗ Could not parse coordinates from: "${text}"`);
      res.status(404).json({ 
        error: 'Could not extract coordinates from response',
        text 
      });
    }
  } catch (e) {
    console.error('[geocode-place-id] ✗ Error:', e);
    const status = e?.status || 500;
    res.status(status >= 400 && status < 600 ? status : 500).json({
      error: e?.message || 'failed to geocode place_id',
      code: e?.code || null,
    });
  }
});

// ---------- 404 + error handler ----------
app.use('/api/', (_req, res) => res.status(404).json({ error: 'not found' }));
app.use((err, _req, res, _next) => {
  console.error('[server] unhandled', err);
  res.status(500).json({ error: err?.message || 'internal error' });
});

// ---------- start ----------
app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}  model=${GEMINI_MODEL}  env=${NODE_ENV}`);
  console.log(`[server] CORS origins: ${CLIENT_ORIGIN.join(', ')}`);
});

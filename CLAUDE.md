# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Koro Kaiwa** is a Vietnamese-friendly AI conversation platform for learning Japanese — real-time AI chat, automatic furigana, JP ↔ VI translation, mic recording + pronunciation scoring, vocab/grammar extraction, SRS review, and conversation export.

## Tech Stack

Vite + React 18 + TypeScript (strict) + CSS custom properties. Package manager: npm.

## Local Development

```bash
npm install       # install dependencies
npm run dev       # dev server → http://localhost:5173
npm run build     # production build → dist/
npm run typecheck # tsc --noEmit — must pass before any task is complete
```

## Folder Structure

```
src/
├── main.tsx
├── App.tsx               # root component, screen routing
├── types.ts              # all shared interfaces — do not duplicate elsewhere
├── constants.ts          # JLPT levels, topic list, defaults
├── components/           # UI only — JSX + event wiring, no business logic
│   ├── Bubble/           # chat message (text, furigana, correction)
│   ├── Furi/             # {漢字|かんじ} → <ruby> renderer
│   ├── ScoreRing/        # pronunciation score circle
│   ├── SidePanel/        # vocab/grammar display
│   ├── SRSReview/        # flashcard UI
│   └── TopBar/           # topic, difficulty, settings
├── features/
│   ├── chat/             # prompt building, AI response parsing
│   ├── speech/           # STT, TTS, pronunciation scoring
│   ├── srs/              # SM-2 scheduling (pure functions)
│   └── storage/          # localStorage helpers
├── hooks/
│   ├── useChat.ts        # chat state + AI call orchestration
│   ├── useSpeech.ts      # SpeechRecognition / speechSynthesis wrappers
│   ├── useSRS.ts         # SRS deck state and scheduling
│   └── useStorage.ts     # typed localStorage persistence
└── design-system/
    ├── colors_and_type.css
    └── fonts/fonts.css
```

Each component: its own folder with `index.tsx` + optional `styles.css`. No barrel `index.ts` at the feature level — import from the file directly.

## Key Types (`src/types.ts`)

```ts
type JLPTLevel = "N5" | "N4" | "N3" | "N2" | "N1";

interface Message {
  id: string;
  from: "user" | "ai";
  text: string;           // furigana-marked: {漢字|かんじ}テキスト
  plain: string;          // plaintext JP for TTS / copy
  vi?: string;
  correction?: { original: string; fixed: string; explanation_vi: string };
  vocab?: { word: string; reading: string; meaning_vi: string }[];
  grammar?: { pattern: string; explanation_vi: string }[];
  pron?: { score: number; words: { word: string; score: number; status: "good"|"mid"|"bad" }[] };
  time: string;
}

interface Settings { level: JLPTLevel; topic: string; showTranslation: boolean }

interface SRSCard {
  id: string; word: string; reading: string; meaning_vi: string;
  interval: number; easeFactor: number; dueDate: string;
}
```

Do not add `Message` fields without updating `src/types.ts` — saved sessions must stay deserializable.

## Architecture

### Chat flow
1. User submits text (or STT transcript) → `useChat` appends optimistic message, calls `POST /api/chat`.
2. Proxy forwards to Claude API with a system prompt that instructs: respond at chosen JLPT level, wrap kanji in `{漢字|ふりがな}`, return a JSON envelope `{ text, vi, correction, vocab, grammar }`.
3. Parse envelope → `Message`, append to transcript, feed vocab into SRS.

### Furigana
`{漢字|かんじ}` → `<ruby>漢字<rt>かんじ</rt></ruby>`. Text outside tokens is unchanged. Do not use any other format. Use **Kuroshiro.js** for auto-generation from raw Japanese when needed.

### Speech
| Capability | Primary | Fallback |
|---|---|---|
| STT | `SpeechRecognition` (`lang: "ja-JP"`) | OpenAI Whisper via proxy |
| TTS | `speechSynthesis` (`lang: "ja-JP"`) | Azure / Google TTS via proxy |
| Pronunciation | Azure Cognitive Services Speech (token from proxy) | Whisper confidence scores |

Never access `window` speech APIs directly in components — use `useSpeech`.

### Storage (localStorage)
| Key | Type |
|---|---|
| `kk_sessions` | `Message[][]` |
| `kk_settings` | `Settings` |
| `kk_vocab` | `VocabItem[]` |
| `kk_srs` | `SRSCard[]` |

Always validate shape on read (`JSON.parse` returns `unknown`).

### API proxy (server-side)
API keys must never be in frontend source. A minimal proxy (Node/Express or FastAPI) exposes:
- `POST /api/chat` → Claude API
- `GET /api/speech-token` → Azure short-lived token
- `POST /api/transcribe` → OpenAI Whisper (optional)

### Difficulty
Passed to the AI via system prompt — never post-processed on the frontend. N5: simple/hiragana-heavy, translation on by default. N2–N1: full kanji, nuance corrections.

## Design System

CSS custom properties in `src/design-system/colors_and_type.css`:
- Colors: `--bamboo-*` (green), `--hanko-*` (red), `--ink-*` (text), `--washi-*` (light bg), `--sumi-*` (dark bg)
- Layout: `.kr-app` — `64px rail | 1fr main | 380px sidebar`, `56px` top bar
- Type: `--font-jp` (Noto Sans/Serif JP), `--font-mono` (JetBrains Mono)

## Rules

- No `any`, no `@ts-ignore` without explanation. Explicit return types on all async functions.
- `App.tsx` stays thin — routing and top-level state only.
- Logic in `features/` or `hooks/`, not in components.
- No unnecessary dependencies — check Web APIs first.
- Learning features are the priority. Do not build auth, analytics, or admin tooling unless asked.
- Ask before making architectural changes.

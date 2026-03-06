1) Product Overview
Problem statement

People ask questions by voice, but they get:

walls of text

unclear answers

no structured cards

hard-to-skim results

Solution statement

A web app where you talk naturally, and it answers with:

clean UI widgets (cards, lists, tables)

links/sources

voice narration of the key parts

Goals

Voice in/out works reliably.

The UI is minimal and consistent.

Results show sources.

The system feels “instant” (something appears quickly).

Non-goals (not now)

Full browser automation (clicking checkout flows)

Deep personal memory across months (later)

Fully custom user-built components (later)

2) Users & Personas

(From Phase 3)

Shopper

Traveler

Student/Researcher

Busy Operator

3) User Stories

As a user, I want to press a mic button and speak, so I don’t have to type.

As a user, I want the answer shown as a widget (weather/product/table), so it’s easy to scan.

As a user, I want sources/links, so I can trust it.

As a user, I want a “refine” action, so I can quickly narrow results.

As a user, I want to switch to typing, so I can continue when voice fails.

4) User Flows (step-by-step)
Flow A: Ask a question by voice

User opens app

User taps mic

App shows “Listening…”

Audio streams to STT

Text appears live (“partial transcript”)

User stops talking → transcript commits

Agent runs tools if needed

UI components render progressively

TTS starts reading the “top summary”

User taps “Show more” or asks follow-up

Flow B: Shopping query

User: “Find best noise cancelling earbuds under $100”

Agent calls productSearch + webSearch

UI renders ProductShowcase + ComparisonTable

ActionBar offers: “Refine budget”, “Prioritize battery”, “Open top 3”

Flow C: Weather query

User: “Weather tomorrow in Dhaka”

Agent calls weather tool

UI renders WeatherPanel

Voice reads summary: “Tomorrow: …”

5) Information Architecture (site map)

Home

Mic / Text input

Results canvas (cards)

Mini history list

History

past queries + saved cards

Settings

Voice (choose voice)

Privacy (delete history)

Plan (Free/Pro)

6) Functional Requirements
A) Must-have (MVP)
FR-1 Voice Input (STT)

Description: Stream mic audio to STT and get live transcript.
Acceptance criteria:

User sees partial transcript within 1s of speaking (target).

Final transcript appears after pause/stop.
Edge cases:

Mic permission denied → show clear fix steps.

Noisy audio → show “Try again” + allow typing.

(Using ElevenLabs real-time STT WebSocket.)

FR-2 Voice Output (TTS)

Description: Read back the key summary using streaming audio.
Acceptance criteria:

Voice starts within a short delay after first summary is ready.

User can stop/pause.
Edge cases:

TTS fails → fallback to silent mode.

(Using ElevenLabs real-time TTS WebSocket.)

FR-3 Tool: Web Search

Description: Given a query, fetch top results with snippets and URLs.
Acceptance criteria:

Returns 5–10 results in <2–3s typical (depends on provider).

Always includes URLs.

FR-4 Tool: Weather

Description: Fetch forecast for a location and render WeatherPanel.
Acceptance criteria:

Shows day summary + hourly/daily blocks.

Clear timezone handling.

FR-5 Tool: Product Search

Description: Fetch products and render ProductShowcase + (optional) ComparisonTable.
Acceptance criteria:

Each product has title, image (if available), price (if available), link.
Edge cases:

No price available → show “price not found”.

FR-6 Generative UI Rendering (json-render catalog)

Description: The model outputs a JSON “UI tree” that can only use the 10 components.
Acceptance criteria:

Any invalid component type is rejected.

Schema validation errors are handled gracefully (show InfoCard fallback).

(json-render registry/components approach.)

FR-7 The 10 Component Types

Description: Implement these 10 minimal components:

InfoCard

WebResultsList

ProductShowcase

ComparisonTable

WeatherPanel

MapPlacesList

NewsBrief

HowToSteps

StockCryptoQuote

ActionBar

Acceptance criteria:

Each component has a defined prop schema.

Components look consistent (spacing, typography, borders).

FR-8 Minimal UI shell

Description: Minimal layout:

top bar

mic button

canvas for cards

subtle separators
Acceptance criteria:

Works on mobile and desktop.

No clutter.

B) Should-have (v1)
FR-9 Accounts + Saved Results

Login

Save cards

Export/share link

FR-10 Evaluation mode

Built-in test prompts

Track component selection accuracy

FR-11 Better follow-ups

“Did you mean X or Y?”

Clarifying question card when needed

C) Nice-to-have (v2)

More component types

Multilingual UI + voices

Personal memory / “projects”

Integrations (calendar, email)

7) Non-Functional Requirements
Performance

Show something quickly: skeleton cards while tools run.

Accessibility

Keyboard navigation

Captions (transcript always visible)

Security & privacy

Clear mic indicator

Don’t store raw audio (unless user opts in)

Sanitize web content to avoid prompt injection

Uptime

Basic error handling + retry on tool calls

8) Data & Analytics Plan

North Star metric:

“Successful voice tasks per user per week”

Events to track:

mic_start, mic_stop

stt_partial_received, stt_final_received

tool_called (type)

ui_component_rendered (type)

tts_start, tts_stop

user_refine_clicked, user_open_link

thumbs_up/down

Supporting metrics:

time_to_first_component

task_success_rate

cost_per_task (internal)

9) Content & Messaging

Onboarding copy ideas:

“Talk to search. Get cards, not walls of text.”

“Try: ‘Best phone under $400’ or ‘Weather tomorrow in Dhaka’.”

Error tone:

Calm and helpful: “I couldn’t fetch prices for that. Want me to show general reviews instead?”

10) Integrations

MVP integrations:

ElevenLabs STT + TTS

Search API (TBD)

Weather API (TBD)
Later:

Maps/places API

News API

Finance API

11) Rollout Plan

Alpha (private): you + 5 friends, daily fixes

Beta (waitlist): 50–200 users, usage caps

Public: pricing + onboarding + analytics dashboards

12) QA Checklist (simple)

 Mic permissions work on Chrome/Safari mobile

 STT partial + final transcript works

 TTS plays and can be stopped

 Each component renders with valid and missing data

 Tool timeouts show fallback InfoCard

 Links open safely

 Mobile layout doesn’t overflow

 Rate limit prevents cost explosion

13) Appendix — Glossary (simple)

STT: Speech-to-text. Turns voice into words.

TTS: Text-to-speech. Turns words into voice.

Tool calling: The AI can call helper functions (like “search web”).

Catalog/Registry: A list of allowed UI components the AI can use.

JSON UI tree: A structured description of the UI, like LEGO instructions.
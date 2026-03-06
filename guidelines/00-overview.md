# File: guidelines/00-overview.md

# Voice Agent + Generative UI — Overview

## Mission

Build a **voice-first web app** that can **search the web** and render answers as **pre-made components** on a clean **results canvas** (not chat bubbles).

## Non-negotiables

* **Velocity over perfection:** ship, learn, iterate.
* **Simplicity first:** minimal UI chrome, clear hierarchy.
* **Component-driven:** reusable parts, no one-off layouts.
* **Trust via transparency:** sources are always visible for web-derived facts.
* **Non-deterministic safe UI:** outputs vary; layout must not break.

## Core loop

1. User speaks (or types).
2. Show **real-time transcription** immediately.
3. Stream 1–3 UI components.
4. Speak a **1–2 sentence summary**.
5. Offer **refine actions** for quick iteration.

## What NOT to build

* No chat-bubble UI as the main layout
* No heavy decoration
* No “human-like” personality fluff
* No hidden sources

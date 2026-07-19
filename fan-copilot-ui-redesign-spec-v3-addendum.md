# Fan Copilot — UI Spec Addendum (v3): Click-to-Learn + Motion System

**Extends v2 (fan-copilot-ui-redesign-spec-v2.md). Read v2 first — this adds
two things: (1) making every stadium card actually feed the chat, including
the 13 not yet wired with live tools, and (2) a deliberate, restrained
animation system. Everything in v2 still applies except where this overrides it.**

---

## Part A: Click-to-learn — one small backend addition, flagged explicitly

**This is the one piece of this addendum that touches `backend/`. Confirm
with the user before building it — it's a real scope item, not a pure
frontend tweak, even though it's small.**

### The problem
Clicking a stadium card should make the assistant tell the fan about that
venue. For the 3 venues wired into `venues.ts` (MetLife, Azteca, BC Place)
plus the bonus Kanteerav venue, this already works — the existing `/chat`
endpoint with a real `venue_id` gives full tool access (navigation, weather,
crowd, knowledge). But the other 13 official venues have no `venue_id` in
config, so sending them through the existing orchestrator would make the
model try to call venue-scoped tools that fail (no matching venue in
`venues.ts`).

### The fix — one new endpoint, no tools attached
Add `POST /general-info` to `backend/src/index.ts`:
- Accepts `{ stadium_name: string, host_city: string }`
- Calls Groq directly (same client, same `llama-3.3-70b-versatile` model)
  with **no tools attached at all** — this is a plain knowledge question,
  not a tool-use loop.
- System prompt: *"You are Fan Copilot. Answer briefly and factually about
  real-world stadiums using your general knowledge — capacity, notable
  history, what makes it distinctive. Keep it to 2-3 sentences, conversational,
  suitable for a mobile chat window. If you're not confident about a specific
  fact, say so rather than guessing precisely."*
- Returns `{ reply: string }`, same shape as `/chat` for easy frontend reuse.
- Does NOT touch `orchestrator.ts`, does NOT touch any tool file, does NOT
  require `venue_id` — this is intentionally a separate, simpler code path.

### Frontend wiring
- Clicking any of the 3 wired official venues or Kanteerav → sets that
  venue as selected in the sidebar (existing behavior from v2), AND sends
  an initial message "Tell me about this venue" through the normal `/chat`
  flow so the fan gets the full tool-backed answer.
- Clicking any of the other 13 "Coming soon" venues → does NOT change the
  sidebar's selected venue (no config exists for them) — instead, appends
  a user-style message "Tell me about {everyday_name}" to the chat and
  calls the new `/general-info` endpoint, rendering the reply as an
  assistant message. Label this reply visually as general knowledge, not
  live data — small `--sage-muted` tag under the message: "General
  knowledge — not live venue data" so it's clear this isn't the same tier
  of answer as the tool-backed venues.

---

## Part B: Color — reaffirming distinctiveness

Keep the v2 palette (pitch-charcoal, turf-surface, floodlight,
scoreboard-amber, alert-coral, sage-muted). This is already a deliberate
choice, not a default — but as you build, actively avoid these tells of a
generic "AI-generated" site creeping back in through component-library
defaults:
- No soft drop-shadows with blurred generic gray (`box-shadow: 0 4px 6px
  rgba(0,0,0,0.1)` and similar) — if a card needs elevation, use a hard,
  slightly-offset amber-tinted shadow instead, or a 1px border, not a
  diffuse blur.
- No generic 12-16px "friendly SaaS" border-radius everywhere. Stick to the
  8px radius already specified in v1/v2.
- No gradient backgrounds anywhere — this palette works in flat color.

---

## Part C: Motion system (deliberate, not scattered)

Per design discipline: spend boldness in a few specific places, not
everywhere. Exactly these motions, nothing beyond them:

### 1. Scroll-triggered card reveal (the main "while scrolling" moment)
As the fan scrolls the main content area, each stadium card fades in and
rises slightly (translateY from 12px to 0, opacity 0 to 1, ~400ms ease-out)
as it enters the viewport. Stagger by ~60ms per card within the same row so
a row reveals left-to-right rather than all at once. Use `IntersectionObserver`,
not a scroll-position calculation. Respect `prefers-reduced-motion`: if set,
skip the animation and just render cards at full opacity immediately.

### 2. Card hover/click micro-interaction (the main "while clicking" moment)
- Hover (desktop): card lifts 2px (`translateY(-2px)`), border brightens
  from default to `--scoreboard-amber` at 40% opacity, 150ms ease.
- Click on a "Live in Copilot" or Kanteerav card: a brief amber glow pulse
  emanates from the badge (scale 1 → 1.15 → 1, opacity fade, ~300ms) to
  confirm the click registered before the sidebar updates.
- Click on a "Coming soon" card: the card briefly flashes its border in
  `--sage-muted` (not amber — it doesn't have live data, the feedback
  should look visually distinct) to confirm the click while the
  `/general-info` request is in flight, then returns to normal once the
  chat message appears.

### 3. Ticker pulse (already spec'd in v1 — unchanged)
The "LIVE" dot's pulse remains the only continuously-running animation on
the page. Nothing else should loop or animate without a user action
triggering it.

### 4. New chat message entrance
Each new chat bubble (assistant or user) fades in + rises slightly on
arrival, same 400ms ease-out as the card reveal, for consistency. This
already may exist from v1 — confirm it matches this timing/easing rather
than a different one, so the whole app feels like one motion language
instead of several unrelated animation styles.

### What NOT to add
No page-load intro animation, no parallax, no auto-playing background
motion, no confetti/celebration effects, no animated gradients. The
restraint itself is part of the design — more motion than this reads as
generic AI-app energy, not intentional craft.

---

## Build order

1. Confirm the `/general-info` backend addition with the user before writing
   backend code (it's the one item outside pure frontend scope).
2. Build the landing page + sidebar layout from v2 first, without motion.
3. Wire click-to-learn (Part A) once the layout works.
4. Add the motion system (Part C) last, once everything is functionally
   correct — motion on top of broken interactions just makes bugs harder
   to see.
5. Screenshot both a "Live in Copilot" card click and a "Coming soon" card
   click, showing the different visual feedback and different chat message
   styling, before calling this done.

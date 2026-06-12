# AETHERIS — Permadeath Record

> Cyberpunk endless runner built in pure Vanilla JavaScript and HTML5 Canvas — no engine, no framework, global leaderboard.

**▶ Play now:** [aetheris-permadeath-record.netlify.app](https://aetheris-permadeath-record.netlify.app)  
**Bugs / feedback:** [open an issue](../../issues)

---

![AETHERIS gameplay — neon platforms, cyberpunk city, corruption wall closing in](assets/img/screenshots/gameplay.png)

---

## What is AETHERIS?

You run. The city glows. Behind you, a wall of digital corruption closes in — consuming every platform, every enemy, every pixel it touches.

AETHERIS is a 2D platform endless runner with a cyberpunk aesthetic. You jump across procedurally generated platforms, collect coins, pick up ability boosts, strike enemies, and try to outrun a pressure curve that never lets you breathe. There is no checkpoint. Every run is a fresh start. Every record is earned.

---

## Features

| | |
|---|---|
| **3 difficulty modes** | Easy (boost drops), Medium (standard), Hard (corruption wall chases you) |
| **Procedural world** | Platforms, enemies, coins and boosts generated on the fly |
| **Ability boosts** | Time Shift (slow-mo), Triple Jump, Air Dash, Repair |
| **Skin shop** | 11 skins (including Goku, Naruto, Luffy) — unlocked with in-run coins |
| **Global leaderboard** | Separate ranking per difficulty mode, verified scores, anti-cheat gate |
| **Accounts + guest** | Optional login, scrypt-hashed passwords, HttpOnly session cookie |
| **Adaptive quality** | Auto-scales visual detail to maintain 60 fps on weak hardware |
| **PWA-ready** | Installable, works offline (assets cached), mobile touch controls |
| **Bilingual** | English and Brazilian Portuguese, toggleable in-game |

---

## Controls

| Input | Action |
|---|---|
| `A` / `D` or `←` / `→` | Move |
| `W` / `↑` / `Space` | Jump (hold for double jump) |
| `C` | Dash + strike |
| `P` / `Esc` | Pause / resume |
| `S` | Open skin shop |
| `1` `2` `3` | Switch difficulty (before run) |
| `L` | Open leaderboard (before run) |

Touch controls available on mobile.

---

## Stack

- **Runtime:** Vanilla JavaScript (ES Modules) — zero runtime dependencies
- **Rendering:** HTML5 Canvas 2D API
- **Audio:** Web Audio API (SFX synthesized at runtime)
- **Persistence:** `localStorage` for local progress
- **Backend:** Netlify Functions (TypeScript) + SQLite via `sql.js` + Netlify Blobs
- **CI/CD:** GitHub Actions → Netlify (gate: full test pyramid must pass)
- **Tests:** Playwright (E2E) + Node Test Runner (static, unit, integration)

---

## Architecture

```
src/
├── config.js          — all balance constants, physics, skins, boost types
├── main.js            — DOM wiring, input, resize, bootstrap
├── i18n.js            — translations (en / pt-BR)
├── core/
│   ├── engine.js      — game loop, update, draw, pause, game over
│   ├── state.js       — single shared state object
│   ├── audio.js       — Web Audio API SFX + BGM
│   ├── storage.js     — localStorage persistence
│   ├── utils.js       — shared helpers (rectIntersect, getDifficultyMode)
│   └── validation.js  — config contract checks at boot
├── entities/
│   ├── player.js      — movement, physics, dash, collision, skin render
│   └── enemy.js       — enemy AI, patrol, attack, death
└── systems/
    ├── worldgen.js    — procedural platform/coin/enemy/boost generation
    ├── background.js  — parallax city layers, day/night, rain, stars
    ├── ui.js          — HUD updates, skin shop
    ├── particles.js   — spark/trail/shockwave emitters
    ├── virus.js       — corruption wall logic and render
    ├── vfx.js         — boost pickups, screen post-FX
    └── leaderboard.js — client-side leaderboard UI and session management

netlify/functions/
├── leaderboard.mts    — score submission, anti-cheat, ranking queries
├── account.mts        — auth (login, signup, logout, session)
└── _shared/           — shared DB helpers, rate limiting, validation
```

---

## Running locally

```bash
npm install
npx netlify dev   # starts game + Netlify Functions on :8888
```

Or serve the frontend only (no leaderboard):

```bash
node scripts/static-server.mjs   # http://localhost:4173
```

---

## Tests

```bash
npm run test:static       # syntax + DOM/CI/CSS contracts
npm run test:unit         # auth rules, score normalisation, session logic
npm run test:integration  # DB + ranking + account/guest flows
npm run test:e2e          # login, guest, leaderboard, in-game blocks (Playwright)
npm test                  # full pyramid
npm run ci:verify         # pyramid + smoke + audit (same gate as CI)
```

The GitHub Actions workflow runs the full pyramid on every push and on PRs targeting `main`. Netlify will not deploy a build that fails the gate.

---

## Technical highlights

### Corruption wall (Hard mode)
The virus wall moves at a speed derived from an asymptotic curve: fast early, decelerating as difficulty grows. It consumes enemies it catches, deals proximity damage to the player, and produces particle debris on contact. All tuning parameters live in `BALANCE.virus` in `config.js`.

### Adaptive quality
The engine samples `avgFrameMs` every frame and targets a quality level between `0.45` and `1.0`. Visual subsystems (shadow blur, rain density, debris count, parallax detail) scale proportionally. A warmup phase holds quality low for the first few seconds to avoid a GPU spike on scene load. On mobile and weak CPUs, a boot heuristic caps the ceiling at `0.78`.

### Physics feel
- **Coyote time:** jump input accepted for a few frames after leaving a ledge edge
- **Jump buffer:** jump registered slightly before landing, so early inputs still connect
- **Fixed-timestep accumulator:** simulation runs at a fixed step regardless of frame rate — physics don't speed up on 144 Hz displays

### Anti-cheat
Each run opens a short-lived server session. On submit, the backend validates: mode, run duration, plausible speed, single-use token, duplicate run ID, and per-origin rate limit. Scores that fail any check are rejected before reaching the verified ranking.

---

## Credits

Music: *Fuga Neon* — used with permission  
Skins inspired by: Naruto, One Piece, Dragon Ball  
City aesthetic inspired by: Blade Runner, Cloudpunk

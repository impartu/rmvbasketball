# BucketSquad Hoops — Feature Log

A running list of feature ideas for the game, sorted by status. Add new ideas to
**In Consideration** as they come up; move to **Planned** once approved to build,
or to **Veto'd** (with a reason) if ruled out. This file doesn't affect the game
itself — it's just a shared backlog.

## Shipped

- **Dodgeball Hoops** — 5v5, two teams each racing to complete 5 shooting spots
  around their own basket while the other team's throwers try to eliminate
  their active shooter with dodgeballs. One active shooter per team at a time
  (control passes to a teammate on a hit, with a respawn cooldown); Team B is
  fully automated. Tunables (`DB_RESPAWN_T`, `DB_THROW_ACC`, `DB_THROW_MIN/MAX`,
  `DB_ENEMY_SKILL`, `DB_SETUP_T`) are exposed at the top of the mode's code for
  further difficulty tuning. Featured first on the home screen. Its leaderboard
  is a recent-matches log (most recent first, name + final score as W/L/T) rather
  than a top-score ranking, matching the name-prompt-on-finish flow every other
  mode already has.

## Planned

- **Zoomed player-follow camera** — a toggle that switches from the current
  full-court view to a zoomed, camera-relative view centered on the controlled
  player, positioned roughly 1/3 up from the bottom of the screen so there's
  more visible court ahead of them. Feasible with the existing architecture:
  every draw call already routes through `fx()`/`fy()`, so making those
  camera-relative (instead of the static transform they are today) carries
  through automatically. The cached `buildFloor()` bitmap can be cropped and
  scaled via canvas's 9-argument `drawImage()` rather than re-rendered per
  frame. The real work is auditing every place that multiplies by `S` directly
  (player radius, line widths, ripple size, etc.) so those scale with zoom too.

## In Consideration

- **Plays mode** — a mode built around simple simulated basketball plays/actions,
  meant to get kids thinking about reads and execution rather than just
  score-chasing. First candidate: a simple pick-and-roll (screen and roll).
  More plays to be brainstormed.
- **Around the World** — five fixed spots around the arc; make one to advance to
  the next (miss and you stay, or drop back a spot). Reuses the existing
  charge/release shot mechanic as-is, so relatively light to add.
- **Achievements/badges** — localStorage-tracked badges ("Hot Hand" for a
  5-streak, "Iron Man" for 10 plays, etc.), shown on the home screen. No
  backend needed.
- **Two-player local mode** — a second virtual joystick controlling `team[1]`
  directly instead of AI, for head-to-head or co-op play. Open question is
  screen space on a phone; probably tablet-first.
- **More callout variety** — expand the fixed vocabulary of in-game text
  ("BUCKET!", "THREE!", etc.), maybe reacting to *how* a shot was made
  (buzzer-beater, half-court heave).
- **Difficulty tiers** — Easy/Medium/Hard toggle affecting defender speed and
  shot forgiveness, so the game scales between a younger sibling and a more
  skilled player without needing separate modes.

## Veto'd

- **Tilted "3D-looking" camera** — CSS `perspective()`/`rotateX()` on the
  `<canvas>` to fake a tilted-plane look. Ruled out: nothing in the game has
  actual height today — the hoop, players, and ball are all flat shapes at an
  (x, y) court position with no Z. Tilting the whole canvas just tilts the flat
  picture; the hoop would read as a decal painted on the floor, not a rim
  standing above it. Not worth doing without real height.
- **True 3D rendering** (WebGL/three.js, real perspective + foreshortening) —
  would mean abandoning the cached-bitmap floor rendering and rebuilding the
  render pipeline around a projection system: a new toolchain/dependency the
  project has deliberately avoided (see `CLAUDE.md`). Not pursued unless
  explicitly asked for.

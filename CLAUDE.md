# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this repo is

`impartu/rmvbasketball` is served at **rmvbasketball.com** via GitHub Pages. The `CNAME`
file in the repo root binds the custom domain — do not rename, move, or delete it, or the
site goes down.

- **`index.html` (root)** is a redirect page pointing at the RMV Basketball Facebook
  group. **Do not touch it.** It is not a landing page to improve, and edits here are
  never part of a game change.
- **`bucketsquad/index.html`** is the project: BucketSquad Hoops, a single-file HTML
  canvas game served at `rmvbasketball.com/bucketsquad`.

## Build and dependencies

No build step, no bundler, no package manager, no test runner. The game is one HTML file
containing its own CSS and JS. The only external dependency is Google Fonts (Bungee for
display type, Nunito for body); everything else — including the mascot image — is inline.

To work on it, open `bucketsquad/index.html` in a browser and reload. That's the whole
loop. Do not introduce a toolchain, a framework, or an npm dependency without asking.

## Architecture of bucketsquad/index.html

Everything lives in one file: inline `<style>`, DOM for the HUD/joystick/overlay, and a
`<script>` with the game. Rough order of the script:

- **Geometry constants.** The court is modeled in *feet*, not pixels: 50 x 94 with a 3 ft
  orange apron. `fx(x)`/`fy(y)` convert court feet to canvas pixels using scale `S`,
  recomputed in `layout()`. All game logic (distances, shot difficulty, three-point
  checks) works in feet, so it stays correct at any screen size.
- **`layout()`** sizes the canvas to fit the viewport above the control bar, sets `S`, and
  rebuilds the floor. Called on load, on resize, and once the mascot image decodes and
  fonts are ready — so it can run several times before first paint and again any time the
  viewport changes.
- **Floor rendering.** `buildFloor()` paints the entire court **once** into an offscreen
  canvas (cached as `floor`); the frame loop just blits it. Anything static belongs here,
  not in `draw()`. Paint order is deliberate: apron, wood, blue paint inside the arcs,
  orange keys, white lines, then the logos and mascots on top of the lines.
  - `flowRibbon()` walks a particle through a `vnoise()` flow field to produce the
    marbled wood swirls (sine waves were tried first and looked like sticks).
  - `arcPath()` builds the three-point line: straight corner segments meeting the arc at
    `ARC_DY`. The sweep direction differs per basket — getting the `anticlockwise` flag
    wrong makes an arc curve off the floor and vanish.
  - `drawB()` draws the BucketSquad B from `BPATH`, a `Path2D` traced from the real floor
    photo, filled `evenodd` so the counters stay open. The mascot is an inlined base64
    PNG cut from the same photo.
- **Game state** — flat module-level globals, no state object/class: `team[]` (two
  offensive players), `handler` (index of whoever has the ball, derives `me()`/`mate()`),
  `D` (the defender), `ball` (`null` when held, otherwise an object with `mode` of
  `"shot"`, `"pass"`, or `"steal"`), plus `score`, `run`, `timeLeft`, `playing`, etc.
- **Audio.** A small synth built directly on Web Audio, no audio files — `tone()` and
  `noise()` are the primitives, `sfx` is the sound bank. `Q` and `gain` are AudioParams,
  so they're set with `.value`/`setValueAtTime`, not by assignment. Audio can only start
  from a user gesture, which is why `audio()` is called from the play button, the shoot
  handler, and the mute button.
- **Input.** Two parallel paths feed the same `move`/shoot/pass state: a pointer-driven
  virtual stick plus PASS and hold-to-charge SHOOT buttons, and a keyboard fallback
  (WASD/arrows, space, P). Keep both in sync when changing input behavior.
- **Simulation.** `step(dt)` advances the sim each frame: handler movement, teammate
  spacing, defender pursuit, ball flight, pass interception, shot resolution math
  (`release()`/`resolveShot()`).
- **Rendering.** `draw()` renders floor + players + ball each frame; draw order
  determines occlusion. `frame()` is the rAF loop and owns the clock (`last`).

Design notes worth keeping: only the **top** hoop is live (`target()` returns
`hoops[0]`) — the second hoop is drawn but never a scoring target. Shot success comes
from how close the released power is to the ideal for the distance, adjusted for
defender proximity and whether the shooter is moving. Passing to an open teammate is
meant to be rewarded; a lazy pass through the defender can be picked off.

**Browser storage:** the high score persists via `window.storage.get/set` (not a
standard browser API — provided by the hosting environment), wrapped in try/catch. Do
not replace it with `localStorage`/`sessionStorage`.

## Workflow

After I approve a change, commit it with a descriptive message and push to `main`
without asking again. My approval of the change is the approval to ship it.

- One logical change per commit; write the message so it explains what changed and why.
- Push to `main` directly — there is no branch protection, PR flow, or CI.
- The change goes live on rmvbasketball.com within a minute or two of the push.

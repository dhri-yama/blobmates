# Motion: what a live avatar does over time

The reference is `core/js/src/runtime.js`. Unlike the picture, motion cannot be matched number for number: it uses
random numbers (blink timing, where to walk) and real time. A port must reproduce the **behavior**: the same formulas,
constants and rules. Tests should inject a fake clock and a fake random source, then check the properties listed at the bottom.

All motion numbers come from the data: `parts.moods[mood].motion`. Change them there, not in code.

## Data per mood

`motion` has: `base` (resting scale), `bob` (lift in pixels), `bobHz`, `squash`, `sway` (tilt in degrees), `swayHz`,
`shake` (tremble in pixels), `shakeHz`, `roam` (walking speed factor), `blink` (`[min, max]` seconds between blinks).
A mood may also have `overlay` (a name in `parts.overlays`), `gaze` (a default `[x, y]`) and `eye`, `brow`, `mouth`.
An overlay has `fps`, `still` and `frames`.

## Inputs

`seed`, `pins`, `mood`, `size` (default 120), `motion` (`none`, `follow` or `idle`, default `follow`), `roam`
(`{speed, pause}` or off), `spawn` (`random` or center), `react` (off, on, or `{moods, duration}`), the host's width and height,
the pointer position (optional), and a reduced-motion flag.

## Per frame

`dt` = seconds since the last frame, **capped at 0.05**. `t` = time in seconds. `rnd(a, b)` = a random number in `[a, b)`.

1. **Mood in use.** While a tap reaction is running (`now < reactUntil`) use its mood; otherwise the current mood.
2. **Ease the motion numbers** toward the mood's: for each of `base, bob, bobHz, squash, sway, swayHz, shake, shakeHz, roam`:
   `cur += (target - cur) * min(1, dt * 5)`. The first frame starts from the mood's values (no easing).
3. **Area.** `maxX = max(0, W - size)`, `maxY = max(0, H - size)`, `minY = min(maxY, size * 0.12)` (headroom for hops).
4. **First placement** (once, when `W > 0`): `spawn: random` gives `x = rnd(0, maxX)`, `y = rnd(minY, maxY)`; otherwise the center
   `(maxX / 2, maxY / 2)`.
5. **Roaming** is on only if `roam` is set, `motion` is not `none` and reduced motion is off.
   - If it has no target and `now >= pauseUntil`, pick a target `(rnd(0, maxX), rnd(minY, maxY))`.
   - With a target: `speed = (roam.speed or 70) * cur.roam`. If the distance is under 2, clear the target, set
     `pauseUntil = now + rnd(pause[0], pause[1])` (default pause `[0.6, 2.2]` seconds) and `speed = 0`. Otherwise move
     `min(distance, speed * dt)` toward it and remember the unit direction `(vx, vy)`.
   - Not roaming: drop any target and drift to the center: `pos += (center - pos) * min(1, dt * 4)`.
   - Then clamp: `x` into `[0, maxX]`, `y` into `[minY, maxY]`.
6. **Walking amount** `mv += ((speed > 0 ? 1 : 0) - mv) * min(1, dt * 8)`.
7. **Overlay frame.** If the mood has an overlay and `motion` is not `none` and reduced motion is off:
   `floor(t * fps) % frames.length`. Otherwise none (the picture then shows the still frame).
8. **Gaze.** If `mv > 0.3` look along the walking direction `(vx, vy)`. Else if `motion` is `follow` and a pointer position is
   known: `d = pointer - center of the avatar`, `f = min(1, |d| / 220)`, gaze = `d / |d| * f`. Else if `motion` is `idle`:
   `[sin(0.9 t), cos(0.6 t) * 0.6]`. Else none (the mood's own gaze applies). Then **quantize** each value to a multiple of
   1/8: `round(v * 8) / 8`. Only redraw the picture when the quantized gaze, the blink value, the mood or the overlay frame
   changes.
9. **Transform.** With `motion` none or reduced motion: only the translation `(pos.x, pos.y)`. Otherwise:
   ```
   up    = 0.5 - 0.5 * cos(2π * bobHz * t)
   step  = |sin(π * (1.6 + roam) * t)|                  // hop phase while walking
   sq    = squash * (2 * up - 1) - 0.08 * mv * (1 - step)
   jx    = shake * (sin(2π * shakeHz * t) + 0.5 * sin(2π * shakeHz * 1.7 * t + 1))
   jy    = shake * 0.6 * sin(2π * shakeHz * 1.3 * t + 2)
   lean  = mv * vx * 7
   tt    = seconds since the tap, or 99 if none
   wob   = tt < 1.2 ? exp(-5 tt) * cos(22 tt) * 0.2 : 0
   jump  = tt < 0.45 ? size * 0.2 * sin(π tt / 0.45) : 0
   translate = ( pos.x + jx,  pos.y + jy - bob * up - mv * size * 0.1 * step - jump )
   rotate    = sway * sin(2π * swayHz * t) + lean          // degrees
   scale     = ( base * (1 - sq * 0.6) * (1 + wob),  base * (1 + sq) * (1 - wob) )
   ```
   `rotate` and `scale` happen around the point **50% across and 85% down** the avatar's own box, then the translation.

## Blinking

A separate timer, not tied to frames. After a wait of `rnd(blink[0], blink[1])` seconds (from the mood **at that moment**),
if `motion` is not `none` and reduced motion is off, the blink value goes `0.6, 1, 0.6, 0`, one step every 45 ms. When that
sequence ends, with a 25% chance a second blink starts 120 ms later. The **next wait starts at the moment the blink starts**,
not when it ends, so the interval is measured from blink to blink. (The wait is also restarted when the timer fires with
`motion: none` or reduced motion on; nothing blinks in that case.)

## Tap reaction (`react`)

`poke()` (a tap, touch, Enter or Space when `react` is on): choose a mood at random from `react.moods` (default
`surprised, joyful, excited, happy`, ignoring unknown names), set `reactUntil = now + (react.duration or 1.1)`, record the tap
time, clear the walking target, and push `pauseUntil` out to `reactUntil`. After `reactUntil` the normal mood returns.

## Reduced motion

If the user asks for reduced motion: no roaming, no blinking, no overlay animation, and the transform is the translation only.
A tap reaction still changes the face.

## Properties tests should check (with a fake clock and random source)

- Walking speed never exceeds `roam.speed * mood.roam` pixels per second, and the avatar stays inside `[0, maxX] x [minY, maxY]`.
- A tap stops walking for the reaction's duration, shows a reaction mood, then returns to the normal mood.
- Blink values follow `0.6, 1, 0.6, 0` at 45 ms steps; no blinks with `motion: none` or reduced motion.
- With roam off, the avatar settles at the center.
- Gaze is always a multiple of 1/8 and within -1...1.
- The overlay frame cycles at the overlay's `fps` and is absent when motion is `none`.
- Switching mood eases the numbers: no jump larger than the easing allows in one frame.

# Algorithm: name and options to SVG

This is what every port (JS, Swift, Kotlin) must do so the same name gives the same picture. The reference is
`core/js/src/index.js` and `core/js/src/internals.js`. The test vectors in `vectors.json` are the final judge: a port is
correct when every case there produces the same SHA-256.

## Inputs

- `seed`: a string. Any text, including empty. Converted to text first (`String(seed)`).
- `options`: pins and state, all optional. See the list at the bottom.
- `parts`: the data in `core/assets/parts.json`.

## 1. Hash the seed

FNV-1a, 32 bit, over the **UTF-8 bytes** of the seed. Do not normalize the text first.

```
h = 0x811c9dc5
for each byte b:  h = (h XOR b) * 0x01000193      (wrapping 32-bit multiply)
```

## 2. Random numbers

mulberry32 seeded with `h`. All arithmetic is unsigned 32-bit and **wraps** (no overflow traps).

```
a = a + 0x6d2b79f5
t = (a XOR (a >> 15)) * (1 OR a)
t = ((t + (t XOR (t >> 7)) * (61 OR t)) ) XOR t
result = t XOR (t >> 14)
```

(`>>` is a logical shift. In the JS reference this is `Math.imul`, `|0` and `>>>0`.) Each call returns the next
unsigned 32-bit integer. `vectors.json` has the first 14 outputs for several seeds.

## 3. Draw order

Draws happen in this exact order, **even when the value ends up unused**. New draws may only be added at the end.

| # | Draw | How |
|---|---|---|
| 1 | style | weighted pick over `styles` using each style's `weight` |
| 2 | body | `next()` |
| 3 | color | `next()` |
| 4 | eye variant | `next()` |
| 5 | eye scale | `next()` |
| 6 | mouth | weighted pick over `identityMouths` |
| 7 | brow | weighted pick over `identityBrows` |
| 8 to 15 | accessories | for each slot in order `top, eyes, face, cheeks`: first `next() % 100` (the chance), then `next()` (the pick) |
| 16 | accessory color | `next()` |

**Weighted pick:** `total = sum of weights`, `r = next() % total`, then walk the items subtracting each weight
until `r < 0`, and return that item.

**Order matters for `styles`.** The styles are walked in the order they appear in `parts.json`. A JSON reader that does not
keep key order will pick different styles. (`identityMouths`, `identityBrows`, `bodies`, `palettes` and the accessory lists are
arrays, so their order is safe.)

## 4. Resolve (what the seed chose, with your pins applied)

- **style:** the pin if it names a known style, otherwise draw 1.
- **body:** the pin if it names a known body (any style). Otherwise the pool is: the style's `bodies` list if it has one
  (block-eyes), else every body that is not `block`. The pick is `pool[draw2 % pool.length]`.
- **color:** if the pin matches a palette `id`, that palette's color. Otherwise the pin as given if it is non-empty.
  Otherwise `palettes[draw3 % palettes.length].color`.
- **accent color:** the pin if non-empty, else `pool[draw16 % pool.length]` where `pool` is `accColors` without any entry equal
  (ignoring letter case) to the body color.
- **accessories, per slot:** pin `"none"` gives nothing. A pin that names an item in that slot gives that item. Any other
  non-empty pin gives nothing. With no pin, the item `list[pick % list.length]` is used only if `chance < accChance[slot]`.
- **variant:** the pin if it is an integer, else draw 4.
- **eye scale:** the `eyeSize` pin if present, else `[90, 100, 115][draw5 % 3] / 100`.
- **face height:** the `faceY` pin, or 0.
- **mouth:** the pin if it names a known mouth (including `none`), else draw 6.
- **brow:** the style's `defaultBrow` if it has one; else, if the style shows brows, the pin if it names a known brow else
  draw 7; else `none`.

Empty-string pins behave like no pin (`color`, `accColor`, `bg`). `size: 0` means 128. Unknown ids fall back to the seed's choice.

## 5. Build the picture

Use the **mood** named in `options.mood`, or `neutral` if it is missing or unknown. Then, in this order:

1. `mouth` = the mood's `mouth` if it has one, else the resolved mouth.
2. `brow` = if the style shows brows: the mood's `brow` if it has one, else the resolved brow; otherwise `none`.
3. `gaze` = `options.gaze`, else the mood's `gaze`, else `[0, 0]`. Clamp each to -1...1, multiply by 3.5.
4. `blink` = `options.blink` or 0, clamped to 0...1.
5. **Eyes:** take the eye fragment for the mood's `eye` key. Look through the style's eye families in order and use the first
   family that has that key; the fragment is `list[variant % list.length]`. If none has it, use `eyes.blob.open[0]`.
   Replace **every** `data-part="pupil-l"` and `data-part="pupil-r"` with the same text followed by
   ` transform="translate(GX GY)"` (GX and GY formatted with `num`, see below).
6. If `blink` is not 0, wrap the eyes: `<g transform="translate(0 46) scale(1 S) translate(0 -46)">EYES</g>` with
   `S = num(1 - 0.9 * blink)`.
7. Face transform: `translate(X Y) scale(FS) translate(-50 -50)` with `X = 50 + body.fx` (0 if missing),
   `Y = 50 + body.fy (0 if missing) + faceY`, `FS = body.fs` (1 if missing). These three are written as plain numbers
   (shortest form, see below).
8. A helper `part(name, svg)` gives `<g data-part="NAME">SVG</g>`, or empty text when `svg` is empty.
9. **Back layer** (not for `block` bodies): for slots `top, eyes, face, cheeks` in order, `part("acc-SLOT-back", item.back)`
   joined together. If that is non-empty it is wrapped as `<g transform="FACE_TRANSFORM">...</g>`.
10. **Face group:** `<g data-part="face" transform="FACE_TRANSFORM">` then, in order: `part("acc-cheeks", cheeks.front)`,
    `<g data-part="eyes" transform="translate(50 46) scale(ES) translate(-50 -46)">EYES</g>` (`ES = num(eyeScale)`),
    `part("acc-eyes", eyes.front)`, the brow fragment from `brows[brow]` (as is, may be empty),
    `part("mouth", mouths[mouth])`, `part("acc-face", face.front)`, `part("acc-top", top.front)`, then `</g>`.
11. **Scene:** (`<g data-part="body-back">BODY.back</g>` if the body has `back` and is not `block`) + back layer +
    `<g data-part="body">BODY.svg</g>` + (`<g data-part="body-front">BODY.front</g>` if it has `front`) + face group.
12. **Frame:** for `block` bodies the scene as is; otherwise `<g transform="translate(50 50) scale(0.88) translate(-50 -50)">SCENE</g>`.
13. **Crop and background:** the shape maps to `circle: 50, rounded: 22, square: 0`; any other value means no crop.
    With a crop: `<clipPath id="ID"><rect width="100" height="100" rx="RX"/></clipPath><g clip-path="url(#ID)">` + (the background
    rect `<rect width="100" height="100" fill="BG"/>` if `bg` is set) + frame + `</g>`, where `ID = "av" + base36(fnv1a(seed))`
    in lowercase. Without a crop: the background rect (if any) comes first, then the frame.
14. **Overlay:** if the mood has an `overlay`, `<g data-part="overlay">FRAME</g>`, where `FRAME` is
    `frames[overlayFrame % frames.length]` if `overlayFrame` is an integer, else `frames[still]`.
15. **Root:** `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="SIZE" height="SIZE">` + background (no-crop case)
    + crop-or-frame + overlay + `</svg>`. `SIZE` is `options.size` (128 if missing or 0), written as a plain number.
16. **Placeholders**, replaced in this order, everywhere in the finished text: `{{body}}` becomes the color, `{{acc}}` the accent
    color, `{{shade}}` the shade of the color, `{{lid}}` the body's `lid` if it has one else the color.

**Shade:** if the color is exactly `#` plus six hex digits (any case), each pair `v` becomes `floor(v * 78 / 100)` as two
lowercase hex digits. Any other text is returned unchanged.

## 6. Number formatting

Two kinds of numbers end up in the text, and they must match JavaScript exactly:

- **`num(x)`** (gaze, blink scale, eye scale): round to **2 decimals**, then print without trailing zeros, and never print `-0`.
  Rounding is JavaScript's `toFixed`: an exact tie goes **up** (away from zero for positives), so `2.625` becomes `2.63`.
  Printf-style formatting (`%.2f`) rounds exact ties to even and gives `2.62`, which is **wrong** here.
  `3.5` prints as `3.5`, `1` as `1`, `-0.001` as `0`.
- **Plain numbers** (face transform parts, size): the shortest text that reads back as the same number, with whole numbers
  written without `.0` (`50`, not `50.0`). Very large or very small numbers (exponent form) never occur with valid input and
  are not supported.

`vectors.json` has `formatting.num` and `formatting.shortest` for both.

## 7. Options

Pins (choose the look): `style`, `body`, `color` (hex or palette id), `variant`, `eyeSize`, `faceY`, `mouth`, `brow`,
`top`, `eyes`, `face`, `cheeks` (an item id or `"none"`), `accColor`.
State (not seeded): `mood`, `gaze` (`[x, y]`), `blink`, `overlayFrame`.
Output: `shape`, `bg`, `size`.

## 8. Not defined (do not rely on it)

A negative `variant` or `overlayFrame`, `NaN`, and exponent-sized numbers. The JS reference misbehaves on them; a port
may do anything sensible, but must not crash on valid input.

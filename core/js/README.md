# Blobmates

Friendly blob avatars that feel alive. Give it any string (a username, an email, a bot name) and it always draws the same character. Pin any part you want to change, and optionally make it blink, follow the pointer, wander around and react to taps.

- **Deterministic:** the same string gives the same avatar everywhere.
- **Editable:** pin the shape, color, eyes, mouth, glasses or a bow, and let the name decide the rest.
- **18 moods**, each with its own face and its own movement.
- **Plain SVG:** static avatars are just an SVG string. No dependencies.

Try the editor and read the docs: https://github.com/dhri-yama/blobmates

## Install

```bash
npm install blobmates
```

## Static avatar

Returns an SVG string. Use it for profile pictures, lists, emails and server rendering.

```js
import { blobmate } from "blobmates";

const svg = blobmate("sagar", { mood: "happy", size: 96 });
element.innerHTML = svg;

// Pin anything, the name decides the rest
blobmate("sagar", { body: "cloud", color: "#F4A3C9", eyes: "glasses-round", shape: "circle" });
```

## React

```jsx
import { Blobmate, LiveBlobmate } from "blobmates/react";

<Blobmate seed="sagar" size={64} shape="circle" />

<LiveBlobmate seed="sagar" mood="happy" size={120} react />

// wanders around inside its parent, which needs a size
<div style={{ height: 320, position: "relative" }}>
  <LiveBlobmate seed="sagar" mood="excited" roam />
</div>
```

`LiveBlobmate` runs in the browser only. In Next.js, put it in a client component (`"use client"`). `Blobmate` works on the server.

## Live avatar without React

```js
import { blobmate } from "blobmates";
import { animate } from "blobmates/runtime";

const rt = animate(document.querySelector("#box"), blobmate, {
  seed: "sagar",
  mood: "happy",
  motion: "follow",        // "none" | "follow" | "idle"
  roam: { speed: 70 },     // optional: wander inside #box
  react: true,             // optional: jump and change face when tapped
});

rt.set({ mood: "angry" });
rt.poke();                 // trigger the tap reaction from code
rt.destroy();              // when the element goes away
```

## Options

By default the name decides everything. Any option you pass is pinned.

| Option | Values |
|---|---|
| `body` | a shape id (81 of them, see `bodies`) |
| `style` | `blob-face`, `mood-mark`, `block-eyes`, `minimal` |
| `color`, `accColor` | a hex color, or a palette name such as `pink` |
| `variant`, `eyeSize`, `faceY` | eye type 0 to 4, 0.7 to 1.4, -10 to 10 |
| `mouth`, `brow` | ids from the parts data |
| `top`, `eyes`, `face`, `cheeks` | an accessory id, or `"none"` (see `accessories`) |
| `mood` | one of `moods`, for example `happy`, `thinking`, `sleeping` |
| `gaze` | `[x, y]`, each from -1 to 1 |
| `shape`, `bg`, `size` | `circle`, `rounded` or `square`; a background color; pixels |

```js
import { moods, bodies, accessories } from "blobmates";
blobmate.resolve("sagar");   // what the name chose, without drawing
```

Accessories are optional: the name adds one only some of the time, and `"none"` always turns a slot off.

## Notes

- Adding or removing shapes in a new release can change which shape some names pick. Pin `body` if you need an avatar to stay exactly the same across upgrades.
- A static SVG cannot animate or react on its own. Use `LiveBlobmate` or `animate` for that.
- Live avatars redraw their SVG as they move. They are fine for a handful on a page, not for hundreds.
- With the system's reduced-motion setting on, movement and blinking stop.
- The `togepi` shape is an egg inspired by a Pokémon. Togepi is a Nintendo / The Pokémon Company character, so think before using it in anything commercial.

## License

MIT

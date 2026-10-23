# DESIGN.md

How Blobmates looks and behaves. The website follows a calm, warm style in the spirit of the Headspace site (white page, one orange accent, big friendly headings, rounded cards with an orange bottom edge). The avatars are flat, colorful blobs with big expressive eyes.

## Principles

1. **Friendly and calm.** Plenty of white space, soft corners, one accent color.
2. **The avatars are the color.** The page stays neutral so the blobs stand out.
3. **Alive but not noisy.** Motion is small and mood-driven. It respects reduced-motion settings.
4. **Show, then explain.** Real avatars in the headline areas, short text, code in neutral boxes.

## Site

### Color

| Token | Value | Use |
|---|---|---|
| `--orange` | `#F47D31` | accent: active nav underline, selected states, primary buttons, switches |
| `--orange-d` | `#E5651A` | hover on orange |
| `--yellow` | `#FFC93C` | reserved accent |
| `--head` | `#3F3F3F` | headings, strong text |
| `--ink` | `#555555` | body text |
| `--mute` | `#8D8A86` | captions, labels, hints |
| `--line` | `#E9E6E2` | hairlines and borders |
| `--tint` | `#FAF8F5` | tiles and quiet panels |
| `--bg` | `#FFFFFF` | page |

Orange is used sparingly: the one thing that is active or primary on screen. Selected-state fill is a pale orange tint (`#FFF4EC`) with an orange outline.

### Type

System font stack (`ui-sans-serif, system-ui, ...`), no web font to load. Headings are weight 600 with slightly tight tracking (`-0.02em`). Body is 15px. Small labels are 12 to 13px, and section labels are uppercase with wide tracking.

| Role | Size |
|---|---|
| Landing headline | `clamp(34px, 5vw, 48px)` |
| Docs title | 40px |
| Section heading | 24 to 30px |
| Body | 15px |
| Caption / label | 12 to 13px |
| Code | 12 to 12.5px monospace |

### Layout

- Navbar: 61px, sticky, white with a hairline. Logo (a live Blobmate) and wordmark on the left, three links on the right (Home, Editor, Docs). Active link has a 3px orange underline.
- Landing: full-height hero with copy on the left and blobmates roaming across it behind the text. Then a mood grid and three cards.
- Editor: at 1100px and wider, three zones (avatar and controls, moods and code, shape panel). From 560px to 1100px, the avatar column and the panel sit side by side. Below 560px everything stacks.
- Docs: sticky table of contents on the left, article up to about 680px wide.

### Components

- **Tile / card:** `--tint` background, 14px radius, 3px orange bottom edge. This bottom edge is the one deliberate "accent border on a rounded card", taken from the reference design. Do not copy it onto other components.
- **Pill button:** 999px radius, 1px `--line` border, white. Active state is solid orange with white text.
- **Segmented control:** pills inside a tinted track. Used for mode choices (motion, framework, static or live).
- **Switch:** 36 by 20 track, orange when on.
- **Icon button:** round, 38px, used for shuffle, copy and download. Always has a title and an aria-label.
- **Cell:** thumbnail plus label in a grid, used for shapes, mouths, accessories and moods. Selected cell gets the orange outline and tint.
- **Callout (`.note`):** pale orange fill with a thin peach outline. No thick side bar.
- **Code block:** light warm gray (`#F6F4F1`) with a hairline border, not a dark theme.

### Do and don't

- Do keep one accent color. Do use real avatars as illustrations.
- Don't add thick one-sided colored borders to cards or callouts (see the tile exception above).
- Don't add icons where a word is clearer.
- Don't let a moving avatar sit on top of text. Roaming avatars stay behind the copy.

## Avatars

### Canvas

100 by 100 viewBox. The whole avatar is drawn at 0.88 scale so any body fits inside a circular crop. Overlays (thought bubble, snoring) are drawn on the full canvas, above the avatar, in the top-right corner.

### Face

Eyes at y=46 (x=36 and x=64), mouth around y=66 to 75, brows above the eyes. Ink color is `#111111`. Eye whites are `#FFFFFF`. Each body places the face with its own offset and scale so it sits naturally on the shape.

### Styles

| Style | Look |
|---|---|
| `blob-face` | colored body, white eyes with black pupils, mouth |
| `mood-mark` | line eyes and a line mouth only |
| `block-eyes` | full-bleed color block with a brow bar and eyes |
| `minimal` | two dot eyes and a small mouth |

### Shapes

81 bodies in these families: round, lobed (clover, cloud, flower), spiky (sun, burst, sparkle), characters (ghost, arch, heart, egg, drip), irregular pebbles, geometric (diamond, kite, hexagon), 10 dino heads and a Togepi-style egg. All have a similar visual weight so swapping shapes does not change the feel.

### Palette

Flat colors, no gradients or shadows: pink `#F4A3C9`, hot pink `#EE6FB0`, red `#E84A3C`, orange `#F08A2C`, amber `#F5A83A`, yellow `#F7C531`, green `#2FA35A`, teal `#4FB39F`, sky `#4DA3F5`, blue `#2B66E8`, navy `#3A4A9C`, purple `#9966C6`, lavender `#AC8AD6`. Details such as spots and plates use a darker tint of the body color. Accessories use their own 10-color palette that never equals the body color.

### Accessories

Optional, never required. Four slots: head (bow, horns, ears, halo), glasses (shades and glasses), face (moustaches and beards), cheeks (blush, freckles, tear, sweat, bandaid). The seed decides whether each appears, with a low chance (about 30%, 15%, 10% and 25%). Anything can be pinned or set to none.

### Moods and motion

Every mood sets the eyes, brows, mouth and gaze, and also its own movement, so the same shape behaves differently when it is joyful or angry.

| Feel | Moods | Movement |
|---|---|---|
| Lively | joyful, excited, happy | bounce with stretch, bigger tilt, quick blinks |
| Calm | neutral, grateful, smug | slow breathing, faint tilt |
| Low | sad, hurt, guilty, insecure, bored | slightly smaller and slumped, slow or trembling |
| Tense | angry, stressed | fast tremble; stressed blinks a lot, angry rarely |
| Odd | confused, thinking | side to side tilt; thinking shows a thought bubble with three dots |
| Still | surprised, sleepy, sleeping | puffed up, or slow deep breaths; sleeping shows rising z's |

Rules:
- Motion numbers are data in `parts.json`, shared by all platforms.
- Changing mood eases over a fraction of a second, never snaps.
- Roaming speed follows mood (excited fast, sleepy and sleeping almost still).
- Walking hops and leans toward the direction of travel, and the eyes look where it is going.
- A tap gives a short jump and a brief surprised, joyful, excited or happy face (opt-in).
- With reduced motion on, movement and blinking stop.

### Brand mark

The logo is a live Blobmate generated from the name `blobmate` with nothing pinned. It should always be produced by the library, never drawn by hand, so the brand and the product stay the same thing.

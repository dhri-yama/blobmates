// Package entry: a ready-to-use `blobmate` bound to the bundled parts, plus the factory for custom parts.
import { makeBlobmate } from './index.js';
import parts from './parts.js';

export const blobmate = makeBlobmate(parts);
export { makeBlobmate, parts };

// Ids you can pass as options.
export const moods = Object.keys(parts.moods);
export const bodies = parts.bodies.map((b) => b.id);
export const accessories = Object.fromEntries(Object.entries(parts.accessories).map(([slot, list]) => [slot, list.map((a) => a.id)]));

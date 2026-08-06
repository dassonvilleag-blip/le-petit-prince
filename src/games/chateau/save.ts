// src/games/chateau/save.ts
// note : extensions .ts nécessaires — même raison que terrain.ts (Task 2) et placement.ts
// (Task 4) : ce fichier est chargé transitivement par save.test.ts sous node --experimental-strip-types.
import { PLOT_SIZE } from "./constants.ts";
import { createHeightmap, type Heightmap } from "./terrain.ts";
import type { PlacedPiece } from "./placement.ts";

export interface WorldState {
  terrain: Heightmap;
  pieces: PlacedPiece[];
}

const STORAGE_KEY = "chateau-save-v1";

export function emptyWorld(): WorldState {
  return { terrain: createHeightmap(), pieces: [] };
}

export function serializeWorld(world: WorldState): string {
  return JSON.stringify(world);
}

function isValidWorld(value: unknown): value is WorldState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<WorldState>;
  if (!Array.isArray(candidate.terrain) || candidate.terrain.length !== PLOT_SIZE + 1) return false;
  if (!candidate.terrain.every((row) => Array.isArray(row) && row.length === PLOT_SIZE + 1)) return false;
  if (!Array.isArray(candidate.pieces)) return false;
  return true;
}

export function deserializeWorld(raw: string | null): WorldState {
  if (!raw) return emptyWorld();
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValidWorld(parsed) ? parsed : emptyWorld();
  } catch {
    return emptyWorld();
  }
}

export function saveToLocalStorage(world: WorldState): void {
  localStorage.setItem(STORAGE_KEY, serializeWorld(world));
}

export function loadFromLocalStorage(): WorldState {
  return deserializeWorld(localStorage.getItem(STORAGE_KEY));
}

export function clearSave(): void {
  localStorage.removeItem(STORAGE_KEY);
}

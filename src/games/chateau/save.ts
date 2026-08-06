// src/games/chateau/save.ts
// note : extensions .ts nécessaires sur les imports relatifs (même raison que grid.ts).
import { GRID_SIZE } from "./constants.ts";
import { createGrid, type Grid, type Cell } from "./grid.ts";

export interface WorldState {
  grid: Grid;
}

const STORAGE_KEY = "chateau-townscaper-save-v1";

export function emptyWorld(): WorldState {
  return { grid: createGrid() };
}

export function serializeWorld(world: WorldState): string {
  return JSON.stringify(world);
}

function isValidCell(value: unknown): value is Cell {
  if (typeof value !== "object" || value === null) return false;
  const cell = value as Partial<Cell>;
  return typeof cell.height === "number" && typeof cell.colorId === "string";
}

function isValidWorld(value: unknown): value is WorldState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<WorldState>;
  if (!Array.isArray(candidate.grid) || candidate.grid.length !== GRID_SIZE) return false;
  return candidate.grid.every(
    (row) => Array.isArray(row) && row.length === GRID_SIZE && row.every(isValidCell),
  );
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

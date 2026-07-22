import { test } from "node:test";
import assert from "node:assert/strict";
import { computeUnitValues, UNITS } from "../units.ts";

test("cas nominal : une date de naissance plausible retourne des valeurs positives", () => {
  const birthDate = new Date("2000-01-01T00:00:00Z");
  const today = new Date("2026-07-22T00:00:00Z");
  const result = computeUnitValues(birthDate, today);
  assert.ok(result !== null);
  assert.ok(result.daysLeft > 0);
  assert.equal(result.units.length, UNITS.length);
  for (const u of result.units) {
    assert.ok(u.value >= 0, `${u.label} ne doit pas être négatif`);
  }
});

test("cas limite : une date de naissance de plus de 80 ans retourne null", () => {
  const birthDate = new Date("1900-01-01T00:00:00Z");
  const today = new Date("2026-07-22T00:00:00Z");
  const result = computeUnitValues(birthDate, today);
  assert.equal(result, null);
});

test("cas limite : exactement 80 ans aujourd'hui retourne null (daysLeft <= 0)", () => {
  const birthDate = new Date("1946-07-22T00:00:00Z");
  const today = new Date("2026-07-22T00:00:00Z");
  const result = computeUnitValues(birthDate, today);
  assert.equal(result, null);
});

test("les nuits de sommeil restent cohérentes avec les jours restants", () => {
  const birthDate = new Date("2000-01-01T00:00:00Z");
  const today = new Date("2026-07-22T00:00:00Z");
  const result = computeUnitValues(birthDate, today);
  assert.ok(result !== null);
  const nights = result.units.find((u) => u.label === "nuits de sommeil");
  assert.ok(nights !== undefined);
  // ~1 nuit par jour restant, à quelques jours près à cause de l'arrondi et de 365.25
  assert.ok(Math.abs(nights.value - result.daysLeft) < 5);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { yearsAgoToPosition, positionToYearsAgo, MAX_YEARS_AGO } from '../mapping.js';

test('aujourd\'hui (0 an) est à la position 0', () => {
  assert.equal(yearsAgoToPosition(0), 0);
});

test('le Big Bang (âge max) est à la position 1', () => {
  assert.equal(yearsAgoToPosition(MAX_YEARS_AGO), 1);
});

test('la position croît avec yearsAgo et reste dans [0, 1]', () => {
  const p1 = yearsAgoToPosition(1);
  const p1000 = yearsAgoToPosition(1000);
  const p1e9 = yearsAgoToPosition(1_000_000_000);
  assert.ok(p1 > 0);
  assert.ok(p1000 > p1);
  assert.ok(p1e9 > p1000);
  assert.ok(p1e9 < 1);
});

test('les 10 000 dernières années occupent plus de 30% de l\'échelle', () => {
  const p = yearsAgoToPosition(10_000);
  assert.ok(p > 0.3, `position=${p}`);
});

test('positionToYearsAgo est l\'inverse de yearsAgoToPosition', () => {
  for (const yearsAgo of [1, 500, 10_000, 1_000_000, 4_600_000_000]) {
    const position = yearsAgoToPosition(yearsAgo);
    const roundTrip = positionToYearsAgo(position);
    const relativeError = Math.abs(roundTrip - yearsAgo) / yearsAgo;
    assert.ok(relativeError < 1e-9, `yearsAgo=${yearsAgo} roundTrip=${roundTrip}`);
  }
});

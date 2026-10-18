import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EPSOM_PER_PPM, BAKING_SODA_PER_PPM,
  parseAmount, concentrateSalt, batchWeight, dose, mayNotDissolve,
} from "../src/mixer.ts";

// The page shows 2 decimals, so that is the precision that matters.
const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 0.005, `${actual} is not ~${expected}`);

test("parseAmount accepts zero and positive numbers", () => {
  assert.equal(parseAmount("68"), 68);
  assert.equal(parseAmount(" 2.5 "), 2.5);
  assert.equal(parseAmount("1e3"), 1000);
  assert.equal(parseAmount("0"), 0);
  assert.ok(Object.is(parseAmount("-0"), 0));
});

test("parseAmount rejects empty, negative and non-numbers", () => {
  for (const raw of ["", "   ", "-5", "abc", "Infinity", "NaN"]) {
    assert.equal(parseAmount(raw), null, JSON.stringify(raw));
  }
});

test("concentrateSalt: grams of salt for a 4000 ppm, 1000 g bottle", () => {
  near(concentrateSalt(4000, 1000, EPSOM_PER_PPM), 9.85);
  near(concentrateSalt(4000, 1000, BAKING_SODA_PER_PPM), 6.71);
});

test("batchWeight converts US fl oz to grams of water", () => {
  near(batchWeight(1), 29.57);
  near(batchWeight(128), 3785.41);
});

test("dose: concentrate needed for a target", () => {
  near(dose(3785.41, 68, 4000), 64.35);
  near(dose(3785.41, 20, 4000), 18.93);
  assert.equal(dose(3785.41, 0, 4000), 0);
  // Target equal to the strength means the whole batch is concentrate
  near(dose(1000, 4000, 4000), 1000);
});

test("mayNotDissolve flags baking soda over ~69 g per kg of water", () => {
  // The limit falls at about 38,450 ppm in a 1000 g bottle
  assert.equal(mayNotDissolve(concentrateSalt(38000, 1000, BAKING_SODA_PER_PPM), 1000), false); // 68 g/kg
  assert.equal(mayNotDissolve(concentrateSalt(39000, 1000, BAKING_SODA_PER_PPM), 1000), true);  // 70 g/kg
  assert.equal(mayNotDissolve(6.71, 1000), false); // the default bottle
});

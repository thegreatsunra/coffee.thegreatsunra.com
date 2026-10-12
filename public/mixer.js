// Molar masses, g/mol
const EPSOM_SALT = 246.47; // MgSO4·7H2O
const CACO3 = 100.09;
const BAKING_SODA = 84.01; // NaHCO3

const ML_PER_FL_OZ = 29.5735295625;
const WATER_DENSITY = 1; // g/mL; room-temperature water is ~0.998, so batches run ~0.2% heavy

// Grams of salt per gram of concentrate, per ppm as CaCO3
export const EPSOM_PER_PPM = EPSOM_SALT / CACO3 / 1e6;
export const BAKING_SODA_PER_PPM = 2 * BAKING_SODA / CACO3 / 1e6; // two bicarbonates equal one CaCO3

// Baking soda dissolves to roughly 69 g per kg of water near 0 °C, about 96 g at 20 °C.
const BAKING_SODA_COLD_LIMIT = 0.069;

// An input's text as a number, or null if it is empty, not a number, or negative.
export function parseAmount(raw) {
  const text = raw.trim();
  const n = Number(text);
  if (text === "" || !Number.isFinite(n) || n < 0) return null;
  return n === 0 ? 0 : n; // -0 would display as "-0.00"
}

export function concentrateSalt(strengthPpm, bottleGrams, saltPerPpm) {
  return strengthPpm * bottleGrams * saltPerPpm;
}

export function batchWeight(flOz) {
  return flOz * ML_PER_FL_OZ * WATER_DENSITY;
}

export function dose(batchGrams, targetPpm, strengthPpm) {
  return batchGrams * targetPpm / strengthPpm;
}

export function mayNotDissolve(saltGrams, bottleGrams) {
  return saltGrams / (bottleGrams - saltGrams) > BAKING_SODA_COLD_LIMIT;
}

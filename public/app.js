import { EPSOM_PER_PPM, BAKING_SODA_PER_PPM, parseAmount, concentrateSalt, batchWeight, dose, mayNotDissolve } from "./mixer.js";

const DEFAULTS = { hardnessTarget: 68, bufferTarget: 30, batchFlOz: 128, hardnessStrength: 4000, hardnessBottle: 1000, bufferStrength: 4000, bufferBottle: 1000 };
const MAY_BE_ZERO = ["hardnessTarget", "bufferTarget"];
const STORAGE_KEY = "coffee-water-mixer:v1";

const TOO_MUCH_SALT = "The salt weighs more than the bottle total. Lower the strength or raise the bottle total.";
const MAY_NOT_DISSOLVE = "At this strength the baking soda may not fully dissolve, or may crystallize in the fridge. Baking soda dissolves to about 69 g per 1000 g of cold water.";

const $ = (id) => document.getElementById(id);
const inputs = Object.keys(DEFAULTS).map($);

function show(id, text) {
  $(id).textContent = text;
}

function format(n, decimals = 2) {
  if (!Number.isFinite(n)) return "–";
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// Each input's number, or null when it is invalid. Invalid fields get a red border.
function readInputs() {
  const values = {};
  for (const input of inputs) {
    let value = parseAmount(input.value);
    if (value === 0 && !MAY_BE_ZERO.includes(input.id)) value = null;
    input.closest(".input-wrap").classList.toggle("invalid", value === null);
    values[input.id] = value;
  }
  return values;
}

// One concentrate bottle: how to make it, any warning, and how many batches it lasts.
function showBottle(name, salt, bottleTotal, batchDose, warning) {
  show(`${name}Salt`, format(salt));
  show(`${name}Fill`, format(bottleTotal));
  show(`${name}Water`, format(salt === null ? null : bottleTotal - salt));
  show(`${name}Warn`, salt !== null && salt >= bottleTotal ? TOO_MUCH_SALT : warning);
  show(`${name}Lasts`, bottleTotal !== null && batchDose > 0
    ? `One bottle makes ${format(bottleTotal / batchDose, 1)} batches at this target.`
    : "");
}

function update() {
  const { hardnessTarget, bufferTarget, batchFlOz, hardnessStrength, hardnessBottle, bufferStrength, bufferBottle } = readInputs();

  const batch = batchFlOz === null ? null : batchWeight(batchFlOz);
  const hardnessDose = batch !== null && hardnessTarget !== null && hardnessStrength !== null
    ? dose(batch, hardnessTarget, hardnessStrength)
    : null;
  const bufferDose = batch !== null && bufferTarget !== null && bufferStrength !== null
    ? dose(batch, bufferTarget, bufferStrength)
    : null;
  const ready = hardnessDose !== null && bufferDose !== null;

  show("hardnessDose", format(hardnessDose));
  show("bufferDose", format(bufferDose));
  show("readingAfterHardness", format(hardnessDose));
  show("readingAfterBuffer", format(ready ? hardnessDose + bufferDose : null));
  show("readingFinal", format(batch));
  show("topUp", format(ready ? batch - hardnessDose - bufferDose : null));

  let batchWarning = "";
  if (!ready) batchWarning = "Enter a batch size and concentrate strengths greater than zero, and targets of zero or more.";
  else if (hardnessDose + bufferDose > batch) batchWarning = "The concentrates add up to more than the whole batch. Raise the concentrate strengths or lower the targets.";
  show("batchWarn", batchWarning);

  const hardnessSalt = hardnessStrength !== null && hardnessBottle !== null
    ? concentrateSalt(hardnessStrength, hardnessBottle, EPSOM_PER_PPM)
    : null;
  const bufferSalt = bufferStrength !== null && bufferBottle !== null
    ? concentrateSalt(bufferStrength, bufferBottle, BAKING_SODA_PER_PPM)
    : null;
  const bufferWarning = bufferSalt !== null && mayNotDissolve(bufferSalt, bufferBottle) ? MAY_NOT_DISSOLVE : "";
  showBottle("hardness", hardnessSalt, hardnessBottle, hardnessDose, "");
  showBottle("buffer", bufferSalt, bufferBottle, bufferDose, bufferWarning);

  save();
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(inputs.map((input) => [input.id, input.value]))));
  } catch {} // storage can be blocked, e.g. in private browsing; the page works without it
}

function load() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch {}
  for (const input of inputs) {
    input.value = typeof saved?.[input.id] === "string" ? saved[input.id] : DEFAULTS[input.id];
  }
}

load();
for (const input of inputs) input.addEventListener("input", update);
$("reset").addEventListener("click", () => {
  for (const input of inputs) input.value = DEFAULTS[input.id];
  update();
});
update();

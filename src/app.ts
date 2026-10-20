import { EPSOM_PER_PPM, BAKING_SODA_PER_PPM, SMALL_SCALE, BIG_SCALE, parseAmount, concentrateSalt, batchWeight, dose, mayNotDissolve, scaleError } from "./mixer.ts";

const DEFAULTS = { hardnessTarget: "68", bufferTarget: "30", batchFlOz: "128", hardnessStrength: "4000", hardnessBottle: "1000", bufferStrength: "4000", bufferBottle: "1000" };
type Field = keyof typeof DEFAULTS;
const MAY_BE_ZERO: string[] = ["hardnessTarget", "bufferTarget"];
const STORAGE_KEY = "coffee-water-mixer:v1";

const TOO_MUCH_SALT = "The salt weighs more than the bottle total. Lower the strength or raise the bottle total.";
const MAY_NOT_DISSOLVE = "At this strength the baking soda may not fully dissolve, or may crystallize in the fridge. Baking soda dissolves to about 69 g per 1000 g of cold water.";

// The markup is fixed, so every id app.ts asks for exists.
const $ = (id: string) => document.getElementById(id)!;
const inputs = Object.keys(DEFAULTS).map((id) => $(id) as HTMLInputElement);

function show(id: string, text: string) {
  $(id).textContent = text;
}

function format(n: number | null, decimals = 2) {
  if (n === null || !Number.isFinite(n)) return "–";
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// Each input's number, or null when it is invalid. Pico draws aria-invalid fields with a red border.
function readInputs() {
  const values = {} as Record<Field, number | null>;
  for (const input of inputs) {
    let value = parseAmount(input.value);
    if (value === 0 && !MAY_BE_ZERO.includes(input.id)) value = null;
    if (value === null) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
    values[input.id as Field] = value;
  }
  return values;
}

// One concentrate bottle: how to make it, any warning, and how many batches it lasts.
function showBottle(name: string, strength: number | null, salt: number | null, bottleTotal: number | null, batchDose: number | null, warning: string) {
  show(`${name}Salt`, format(salt));
  // Water and total go on the 1 g scale, so whole grams; the salt goes on the 0.01 g scale.
  show(`${name}Fill`, format(bottleTotal, 0));
  show(`${name}Water`, format(salt === null || bottleTotal === null ? null : bottleTotal - salt, 0));
  show(`${name}Warn`, salt !== null && bottleTotal !== null && salt >= bottleTotal ? TOO_MUCH_SALT : warning);
  show(`${name}Lasts`, bottleTotal !== null && batchDose !== null && batchDose > 0
    ? `One bottle makes ${format(bottleTotal / batchDose, 1)} batches at this target.`
    : "");
  const error = strength !== null && salt !== null && bottleTotal !== null
    ? scaleError(strength, [[salt, SMALL_SCALE], [bottleTotal, BIG_SCALE]])
    : null;
  show(`${name}Error`, strength !== null && error !== null
    ? `Worst-case scale error: ±${format(error)} ppm (±${format(error / strength * 100)}%).`
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
  const ready = batch !== null && hardnessDose !== null && bufferDose !== null;

  show("hardnessDose", format(hardnessDose));
  show("bufferDose", format(bufferDose));
  // Doses are weighed on the 0.01 g scale; the jug readings are on the 1 g scale, so whole grams.
  // Top-up is the difference of the rounded readings, so the column adds up.
  show("readingAfterHardness", format(hardnessDose, 0));
  show("readingAfterBuffer", format(ready ? hardnessDose + bufferDose : null, 0));
  show("readingFinal", format(batch, 0));
  show("topUp", format(ready ? Math.round(batch) - Math.round(hardnessDose + bufferDose) : null, 0));

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
  const bufferWarning = bufferSalt !== null && bufferBottle !== null && mayNotDissolve(bufferSalt, bufferBottle) ? MAY_NOT_DISSOLVE : "";
  showBottle("hardness", hardnessStrength, hardnessSalt, hardnessBottle, hardnessDose, "");
  showBottle("buffer", bufferStrength, bufferSalt, bufferBottle, bufferDose, bufferWarning);

  let errorText = "";
  if (ready && hardnessTarget !== null && bufferTarget !== null && hardnessSalt !== null && hardnessBottle !== null && bufferSalt !== null && bufferBottle !== null) {
    const errorFor = (label: string, target: number, salt: number, bottle: number, batchDose: number) => {
      const ppm = scaleError(target, [[salt, SMALL_SCALE], [bottle, BIG_SCALE], [batchDose, SMALL_SCALE], [batch, BIG_SCALE]]);
      const percent = target === 0 ? 0 : ppm / target * 100;
      return `${label} ±${format(ppm)} ppm (±${format(percent)}%)`;
    };
    errorText = `Worst-case scale error: ${errorFor("hardness", hardnessTarget, hardnessSalt, hardnessBottle, hardnessDose)}, ${errorFor("alkalinity", bufferTarget, bufferSalt, bufferBottle, bufferDose)}.`;
  }
  show("scaleError", errorText);

  save();
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(inputs.map((input) => [input.id, input.value]))));
  } catch {} // storage can be blocked, e.g. in private browsing; the page works without it
}

function load() {
  let saved: Record<string, unknown> | null = null;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"); } catch {}
  for (const input of inputs) {
    const value = saved?.[input.id];
    input.value = typeof value === "string" ? value : DEFAULTS[input.id as Field];
  }
}

load();
for (const input of inputs) input.addEventListener("input", update);
$("reset").addEventListener("click", () => {
  for (const input of inputs) input.value = DEFAULTS[input.id as Field];
  update();
});
update();

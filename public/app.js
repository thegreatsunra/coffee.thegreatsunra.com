(function () {
  "use strict";

  var K = {
    mgso4: 246.47,
    caco3: 100.09,
    nahco3: 84.01,
    hco3PerCaco3: 2,
    ppm: 1000000,
    mlPerFlOz: 29.5735295625,
    density: 1
  };

  var DEFAULTS = { targetH: 68, targetB: 20, flOz: 128, strH: 4000, totH: 1000, strB: 4000, totB: 1000 };
  var STORE = "coffee-water-mixer:v1";

  // Baking soda dissolves to roughly 69 g per kg of water near 0 °C, about 96 g at 20 °C.
  var BICARB_COLD_LIMIT = 0.069;

  var ids = Object.keys(DEFAULTS);
  var inputs = {};
  ids.forEach(function (id) { inputs[id] = document.getElementById(id); });

  function $(id) { return document.getElementById(id); }

  function fmt(n, d) {
    if (n === null || !isFinite(n)) return "–";
    return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  function read(id) {
    var raw = inputs[id].value.trim();
    if (raw === "") return null;
    var v = Number(raw);
    return isFinite(v) && v > 0 ? v : (v === 0 ? 0 : null);
  }

  function markInvalid(id, bad) {
    inputs[id].closest(".input-wrap").classList.toggle("invalid", bad);
  }

  function pos(v) { return v !== null && v > 0; }
  function nonneg(v) { return v !== null && v >= 0; }

  function save() {
    try {
      var o = {};
      ids.forEach(function (id) { o[id] = inputs[id].value; });
      localStorage.setItem(STORE, JSON.stringify(o));
    } catch (e) {}
  }

  function load() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) { saved = null; }
    ids.forEach(function (id) {
      var v = saved && typeof saved[id] === "string" ? saved[id] : String(DEFAULTS[id]);
      inputs[id].value = v;
    });
  }

  function calc() {
    var v = {};
    ids.forEach(function (id) { v[id] = read(id); });

    // Validity per field
    markInvalid("targetH", !nonneg(v.targetH));
    markInvalid("targetB", !nonneg(v.targetB));
    markInvalid("flOz", !pos(v.flOz));
    markInvalid("strH", !pos(v.strH));
    markInvalid("totH", !pos(v.totH));
    markInvalid("strB", !pos(v.strB));
    markInvalid("totB", !pos(v.totB));

    // Concentrates
    var saltH = pos(v.strH) && pos(v.totH) ? v.strH * v.totH / K.ppm * (K.mgso4 / K.caco3) : null;
    var saltB = pos(v.strB) && pos(v.totB) ? v.strB * v.totB / K.ppm * (K.hco3PerCaco3 * K.nahco3 / K.caco3) : null;

    $("saltH").textContent = fmt(saltH, 2);
    $("fillH").textContent = fmt(pos(v.totH) ? v.totH : null, 2);
    $("waterH").textContent = fmt(saltH !== null ? v.totH - saltH : null, 2);
    $("saltB").textContent = fmt(saltB, 2);
    $("fillB").textContent = fmt(pos(v.totB) ? v.totB : null, 2);
    $("waterB").textContent = fmt(saltB !== null ? v.totB - saltB : null, 2);

    var warnH = "", warnB = "";
    if (saltH !== null && saltH >= v.totH) warnH = "The salt weighs more than the bottle total. Lower the strength or raise the bottle total.";
    if (saltB !== null && saltB >= v.totB) {
      warnB = "The salt weighs more than the bottle total. Lower the strength or raise the bottle total.";
    } else if (saltB !== null && saltB / (v.totB - saltB) > BICARB_COLD_LIMIT) {
      warnB = "At this strength the baking soda may not fully dissolve, or may crystallize in the fridge. Baking soda dissolves to about 69 g per 1000 g of cold water.";
    }
    $("warnH").textContent = warnH;
    $("warnB").textContent = warnB;

    // Batch
    var water = pos(v.flOz) ? v.flOz * K.mlPerFlOz * K.density : null;
    var doseH = water !== null && nonneg(v.targetH) && pos(v.strH) ? water * v.targetH / v.strH : null;
    var doseB = water !== null && nonneg(v.targetB) && pos(v.strB) ? water * v.targetB / v.strB : null;
    var ok = water !== null && doseH !== null && doseB !== null;

    $("doseH").textContent = fmt(doseH, 2);
    $("doseB").textContent = fmt(doseB, 2);
    $("cum1").textContent = fmt(doseH, 2);
    $("cum2").textContent = fmt(ok ? doseH + doseB : null, 2);
    $("cum3").textContent = fmt(water, 2);
    $("topUp").textContent = fmt(ok ? water - doseH - doseB : null, 2);

    var bw = "";
    if (!ok) {
      bw = "Enter a batch size and concentrate strengths greater than zero, and targets of zero or more.";
    } else if (doseH + doseB > water) {
      bw = "The concentrates add up to more than the whole batch. Raise the concentrate strengths or lower the targets.";
    }
    $("batchWarn").textContent = bw;

    // How long each bottle lasts
    function lasts(tot, dose) {
      if (!pos(tot) || !pos(dose)) return "";
      var n = tot / dose;
      return "One bottle covers " + fmt(n, 1) + " batches at this target.";
    }
    $("lastsH").textContent = lasts(v.totH, doseH);
    $("lastsB").textContent = lasts(v.totB, doseB);

    save();
  }

  load();
  ids.forEach(function (id) { inputs[id].addEventListener("input", calc); });
  $("reset").addEventListener("click", function () {
    ids.forEach(function (id) { inputs[id].value = String(DEFAULTS[id]); });
    calc();
  });
  calc();
})();

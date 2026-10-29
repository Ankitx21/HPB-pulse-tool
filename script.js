const mainGrid = document.getElementById("mainGrid");
const resultsSection = document.getElementById("results");
const assessBtn = document.getElementById("assessBtn");
const resetBtn = document.getElementById("resetBtn");
const downloadReportBtn = document.getElementById("downloadReportBtn");

let latestResults = null;
let latestAssessmentInputs = null;

function collectInputs() {
  return {
    buildingType: readText("buildingType"),
    state: readText("state"),
    city: readText("city"),
    areaSqm: readNumber("area"),
    energyKWh: readNumber("energy"),
    energyPeriod: readText("energyPeriod"),
    coolingTR: readNumber("acCapacity"),
    contractDemandKVA: readNumber("contractDemand"),
    dgSize: readNumber("dgSize"),
    renewableValue: readNumber("renewableValue"),
    renewablePeriod: readText("renewablePeriod"),
    acAreaPercentage: readNumber("acArea"),
    waterKL: readNumber("water"),
    waterPeriod: readText("waterPeriod"),
    occupants: readNumber("occupants")
  };
}

function setResultsVisibility(showResults) {
  if (!mainGrid || !resultsSection) return;

  mainGrid.classList.toggle("has-results", showResults);
  resultsSection.classList.toggle("hidden", !showResults);
}

function resetAssessmentForm() {
  reportProjectName.value = "";
  const resetFields = [
    "area",
    "acArea",
    "occupants",
    "energy",
    "acCapacity",
    "contractDemand",
    "dgSize",
    "renewableValue",
    "water"
  ];

  resetFields.forEach(id => {
    const field = document.getElementById(id);
    if (field) field.value = "";
  });

  const buildingType = document.getElementById("buildingType");
  const state = document.getElementById("state");
  const city = document.getElementById("city");
  const energyPeriod = document.getElementById("energyPeriod");
  const renewablePeriod = document.getElementById("renewablePeriod");
  const waterPeriod = document.getElementById("waterPeriod");

  if (buildingType) buildingType.selectedIndex = 0;
  if (state) state.value = "";
  if (energyPeriod) energyPeriod.value = "annual";
  if (renewablePeriod) renewablePeriod.value = "annual";
  if (waterPeriod) waterPeriod.value = "annual";

  if (city) {
    city.innerHTML = `<option value="">Select City</option>`;
    city.disabled = true;
  }

  updateInputPlaceholders();
}

function updateInputPlaceholders() {
  const placeholderByField = {
    energy: {
      annual: "e.g. 15,00,000",
      monthly: "e.g. 1,25,000"
    },
    renewableValue: {
      annual: "e.g. 0",
      monthly: "e.g. 0"
    },
    water: {
      annual: "e.g. 10,000",
      monthly: "e.g. 800",
      daily: "e.g. 25"
    }
  };

  const bindings = [
    ["energy", "energyPeriod"],
    ["renewableValue", "renewablePeriod"],
    ["water", "waterPeriod"]
  ];

  bindings.forEach(([inputId, selectId]) => {
    const input = document.getElementById(inputId);
    const select = document.getElementById(selectId);
    const placeholder = placeholderByField[inputId]?.[select?.value];
    if (input && placeholder) input.placeholder = placeholder;
  });
}

function getElementText(id) {
  const el = document.getElementById(id);
  return el ? el.textContent.trim().replace(/\s+/g, " ") : "";
}

function formatMetricValue(value, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : MISSING_RESULT_TEXT;
}

function formatEpiLabel(value) {
  if (!Number.isFinite(value)) return "-";
  if (value > 0 && value < 0.1) return value.toFixed(3);
  if (value < 1) return value.toFixed(2);
  return value < 10 ? value.toFixed(1) : String(Math.round(value));
}

function clampFloatingElement(element, container, pct, padding = 8) {
  if (!element || !container || !Number.isFinite(pct)) return;

  const containerWidth = container.clientWidth;
  const elementWidth = element.offsetWidth;
  const containerLeft = container.offsetLeft;

  if (!containerWidth || !elementWidth) return;

  const desiredCenter = (pct / 100) * containerWidth;
  const minCenter = (elementWidth / 2) + padding;
  const maxCenter = containerWidth - (elementWidth / 2) - padding;
  const clampedCenter = Math.min(Math.max(desiredCenter, minCenter), maxCenter);

  element.style.left = `${containerLeft + clampedCenter}px`;
}

function positionBubbleWithStem(bubble, container, pct, padding = 8, edgeBias = 0) {
  if (!bubble || !container || !Number.isFinite(pct)) return;

  const containerWidth = container.clientWidth;
  const bubbleWidth = bubble.offsetWidth;
  const containerLeft = container.offsetLeft;

  if (!containerWidth || !bubbleWidth) return;

  const desiredCenter = (pct / 100) * containerWidth;
  const maxCenter = containerWidth - (bubbleWidth / 2) - padding - edgeBias;
  const clampedCenter = Math.min(Math.max(desiredCenter, 0), maxCenter);
  const stemOffset = Math.min(
    Math.max(desiredCenter - (clampedCenter - (bubbleWidth / 2)), 4),
    bubbleWidth - 4
  );

  bubble.style.left = `${containerLeft + clampedCenter}px`;
  bubble.style.setProperty("--bubble-stem-left", `${stemOffset}px`);
}

function positionBubbleInFrame(bubble, frame, scale, pct, padding = 8) {
  if (!bubble || !frame || !scale || !Number.isFinite(pct)) return;

  const frameWidth = frame.clientWidth;
  const scaleWidth = scale.clientWidth;
  const scaleLeft = scale.offsetLeft;
  const bubbleWidth = bubble.offsetWidth;

  if (!frameWidth || !scaleWidth || !bubbleWidth) return;

  const desiredCenter = scaleLeft + ((pct / 100) * scaleWidth);
  const minCenter = (bubbleWidth / 2) + padding;
  const maxCenter = frameWidth - (bubbleWidth / 2) - padding;
  const clampedCenter = Math.min(Math.max(desiredCenter, minCenter), maxCenter);
  const stemOffset = Math.min(
    Math.max(desiredCenter - (clampedCenter - (bubbleWidth / 2)), 4),
    bubbleWidth - 4
  );

  bubble.style.left = `${clampedCenter}px`;
  bubble.style.setProperty("--bubble-stem-left", `${stemOffset}px`);

  return {
    desiredCenter,
    clampedCenter,
    stemOffset,
    stemAbsoluteLeft: clampedCenter - (bubbleWidth / 2) + stemOffset
  };
}

const reportDialog = document.getElementById("reportDialog");
const reportDownloadForm = document.getElementById("reportDownloadForm");
const reportProjectName = document.getElementById("reportProjectName");
const reportConfirmBtn = document.getElementById("reportConfirmBtn");
const reportCancelBtn = document.getElementById("reportCancelBtn");
const reportDownloadError = document.getElementById("reportDownloadError");
let reportIsDownloading = false;

function openReportDialog() {
  if (!latestResults || !latestAssessmentInputs || reportDialog.open) return;
  reportDownloadError.hidden = true;
  const defaultName = latestAssessmentInputs.state ? `Office \u2014 ${latestAssessmentInputs.state}` : "Office";
  document.getElementById("reportProjectNameHint").textContent = `If left blank, your report will use ?${defaultName}?.`;
  reportDialog.showModal();
}

reportCancelBtn.addEventListener("click", () => reportDialog.close());
reportDialog.addEventListener("cancel", event => {
  if (reportIsDownloading) event.preventDefault();
});
reportDownloadForm.addEventListener("submit", event => {
  event.preventDefault();
  if (!reportIsDownloading) downloadReport();
});

async function downloadReport() {
  if (!latestResults || !latestAssessmentInputs) return;
  reportIsDownloading = true;
  reportConfirmBtn.disabled = true;
  reportCancelBtn.disabled = true;
  reportConfirmBtn.textContent = "Preparing PDF?";
  reportDownloadError.hidden = true;
  reportDownloadForm.setAttribute("aria-busy", "true");
  try {
    const defaultName = latestAssessmentInputs.state ? `Office \u2014 ${latestAssessmentInputs.state}` : "Office";
    const projectName = reportProjectName.value.trim() || defaultName;
    const blob = await window.buildBuildingReport({ ...latestAssessmentInputs, projectName }, latestResults);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const city = (latestAssessmentInputs.city || "project").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    link.href = url;
    link.download = `building-health-report-${city}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    reportDialog.close();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error("Could not generate building report", error);
    reportDownloadError.textContent = "The report could not be downloaded. Please try again.";
    reportDownloadError.hidden = false;
  } finally {
    reportIsDownloading = false;
    reportConfirmBtn.disabled = false;
    reportCancelBtn.disabled = false;
    reportConfirmBtn.textContent = "Download PDF";
    reportDownloadForm.removeAttribute("aria-busy");
  }
}

/*************************************************
 * CONSTANTS
 *************************************************/
const ASSURE_EPI_TARGET = 75;
const DEFAULT_SPECIFIC_YIELD = 1500;
const NBC_LPCD = 45;
const MISSING_RESULT_TEXT = "Result not available due to missing input(s).";
const COLD_CLIMATE_MESSAGE = "BEE star ratings are not defined for cold climate zones due to insufficient benchmark data.";


/*************************************************
 * BEE STAR RATING EQUATIONS (SAMPLE – WORKING)
 * Replace with official BEE equations later
 *************************************************/
const beeEquations = {
  "Composite": {
    "Large": {
      "5Star": { a: 0.75, c: 20 },
      "4Star": { a: 0.80, c: 30 },
      "3Star": { a: 0.85, c: 40 },
      "2Star": { a: 0.90, c: 50 },
      "1Star": { a: 0.95, c: 60 }
    },
    "Medium": {
      "5Star": { a: 0.9, c: 20 },
      "4Star": { a: 0.95, c: 30 },
      "3Star": { a: 1.0, c: 40 },
      "2Star": { a: 1.05, c: 50 },
      "1Star": { a: 1.1, c: 60 }
    },
    "Small": {
      "5Star": { a: 0.45, c: 20 },
      "4Star": { a: 0.5, c: 30 },
      "3Star": { a: 0.55, c: 40 },
      "2Star": { a: 0.6, c: 50 },
      "1Star": { a: 0.65, c: 60 }
    }
  },

  "Warm & Humid": {
    "Large": {
      "5Star": { a: 0.7, c: 25 },
      "4Star": { a: 0.75, c: 35 },
      "3Star": { a: 0.8, c: 45 },
      "2Star": { a: 0.85, c: 55 },
      "1Star": { a: 0.9, c: 65 }
    },
    "Medium": {
      "5Star": { a: 0.7, c: 25 },
      "4Star": { a: 0.75, c: 35 },
      "3Star": { a: 0.8, c: 45 },
      "2Star": { a: 0.85, c: 55 },
      "1Star": { a: 0.9, c: 65 }
    },
    "Small": {
      "5Star": { a: 0.5, c: 25 },
      "4Star": { a: 0.55, c: 35 },
      "3Star": { a: 0.6, c: 45 },
      "2Star": { a: 0.65, c: 55 },
      "1Star": { a: 0.7, c: 65 }
    }
  },

  "Hot & Dry": {
    "Large": {
      "5Star": { a: 0.9, c: 15 },
      "4Star": { a: 0.95, c: 25 },
      "3Star": { a: 1.0, c: 35 },
      "2Star": { a: 1.05, c: 45 },
      "1Star": { a: 1.1, c: 55 }
    },
    "Medium": {
      "5Star": { a: 1.05, c: 15 },
      "4Star": { a: 1.1, c: 25 },
      "3Star": { a: 1.15, c: 35 },
      "2Star": { a: 1.2, c: 45 },
      "1Star": { a: 1.25, c: 55 }
    },
    "Small": {
      "5Star": { a: 1.55, c: 15 },
      "4Star": { a: 0.6, c: 25 },
      "3Star": { a: 0.65, c: 35 },
      "2Star": { a: 0.7, c: 45 },
      "1Star": { a: 0.75, c: 55 }
    }
  },

  "Temperate": {
    "Large": {
      "5Star": { a: 0.9, c: 15 },
      "4Star": { a: 0.95, c: 25 },
      "3Star": { a: 1.0, c: 35 },
      "2Star": { a: 1.05, c: 45 },
      "1Star": { a: 1.1, c: 55 }
    },
    "Medium": {
      "5Star": { a: 1.05, c: 15 },
      "4Star": { a: 1.1, c: 25 },
      "3Star": { a: 1.15, c: 35 },
      "2Star": { a: 1.2, c: 45 },
      "1Star": { a: 1.25, c: 55 }
    },
    "Small": {
      "5Star": { a: 0.55, c: 15 },
      "4Star": { a: 0.6, c: 25 },
      "3Star": { a: 0.65, c: 35 },
      "2Star": { a: 0.7, c: 45 },
      "1Star": { a: 0.75, c: 55 }
    }
  }
};

/*************************************************
 * CLIMATE + STATE + CITY DATA (SINGLE SOURCE)
 *************************************************/
let climateRawData = [];
let cityClimateMap = {};

fetch("Location_CZ_Latitude.json")
  .then(res => res.json())
  .then(data => {
    climateRawData = data;

    data.forEach(item => {
      cityClimateMap[item.City.trim().toLowerCase()] = {
        zone: item.Climate_Zone.trim(),
        state: item.State,
        lat: item.Lat,
        lon: item.Longitude
      };
    });

    console.log("✅ Climate JSON loaded");
  })
  .catch(err => console.error("❌ Climate JSON load error", err));



/*************************************************
 * SAFE INPUT READERS (CRITICAL)
 *************************************************/
function readNumber(id) {
  const el = document.getElementById(id);
  if (!el) return NaN;
  const v = el.value;
  if (v === null || v === undefined || v.trim() === "") return NaN;
  const normalized = v.replace(/,/g, "").trim();
  return Number(normalized);
}

function readText(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function toAnnualEnergyKWh(value, period) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return period === "monthly" ? value * 12 : value;
}

function toAnnualWaterKL(value, period) {
  if (!Number.isFinite(value) || value <= 0) return NaN;

  if (period === "monthly") return value * 12;
  if (period === "daily") return value * 210;
  return value;
}

function calculateLpcd(value, period, occupants) {
  if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(occupants) || occupants <= 0) {
    return NaN;
  }

  if (period === "monthly") return (value * 1000) / (occupants * 18);
  if (period === "daily") return (value * 1000) / occupants;
  return (value * 1000) / (occupants * 210);
}

function getWaterFormulaHtml(period) {
  if (period === "monthly") {
    return `<span>LPCD = Monthly average water consumption (kL) &times; 1000 &divide; [Total occupants &times; 18 days]</span>`;
  }

  if (period === "daily") {
    return `<span>LPCD = Daily water consumption (kL) &times; 1000 &divide; Total occupants</span>`;
  }

  return `<span>LPCD = Annual water consumption (kL) &times; 1000 &divide; [Total occupants &times; 210 days]</span>`;
}

function buildOutputHelp(text) {
  return `
    <span class="input-help output-help">
      <img class="input-help-icon" src="buildinge_health_tool_asset/info.png" alt="More info">
      <span class="input-help-tooltip">${text}</span>
    </span>
  `;
}

/*************************************************
 * STATE → CITY DROPDOWN (FIXED)'
 *************************************************/
document.addEventListener("DOMContentLoaded", () => {

  let climateRawData = [];

  const stateSelect = document.getElementById("state");
  const citySelect = document.getElementById("city");
  ["energyPeriod", "renewablePeriod", "waterPeriod"].forEach(id => {
    const select = document.getElementById(id);
    if (select) select.addEventListener("change", updateInputPlaceholders);
  });
  updateInputPlaceholders();

  if (!stateSelect || !citySelect) {
    console.error("State or City select not found in DOM");
    return;
  }

  fetch("Location_CZ_Latitude.json")
    .then(res => {
      if (!res.ok) throw new Error("JSON not loaded");
      return res.json();
    })
    .then(data => {
      console.log("✅ Climate JSON loaded:", data.length, "rows");

      climateRawData = data;

      // Populate States
      const states = [...new Set(data.map(d => d.State))].sort();

      states.forEach(state => {
        const opt = document.createElement("option");
        opt.value = state;
        opt.textContent = state;
        stateSelect.appendChild(opt);
      });

      console.log("✅ States populated:", stateSelect.options.length);
    })
    .catch(err => console.error("❌ Climate JSON error:", err));

  stateSelect.addEventListener("change", () => {
    citySelect.innerHTML = `<option value="">Select City</option>`;
    citySelect.value = "";
    citySelect.disabled = true;

    if (!stateSelect.value) return;

    const cities = climateRawData
      .filter(d => d.State === stateSelect.value)
      .map(d => d.City)
      .sort();

    cities.forEach(city => {
      const opt = document.createElement("option");
      opt.value = city;
      opt.textContent = city;
      citySelect.appendChild(opt);
    });

    citySelect.disabled = cities.length === 0;
  });

});


/*************************************************
 * BUILDING SIZE
 *************************************************/
function getBuildingSize(areaSqm) {
  if (areaSqm <= 10000) return "Small";
  if (areaSqm <= 30000) return "Medium";
  return "Large";
}

let epi1 = null;
let epi2 = null;
let epi3 = null;
let epi4 = null;
let epi5 = null;


/*************************************************
 * CORE CALCULATION (FINAL)
 *************************************************/
function calculateBuildingPerformance(inputs) {

  const {
    city,
    areaSqm,
    energyKWh,
    energyPeriod,
    coolingTR,
    contractDemandKVA,
    dgSize,
    renewableValue,
    renewablePeriod,
    acAreaPercentage,
    waterKL,      // ✅ ADD
    waterPeriod,
    occupants,
    // lpcd
  } = inputs;

  let sfPerTR = null;


  /* ---------- ENERGY ---------- */
  const energyAnnualKWh = Number.isFinite(energyKWh) && energyKWh > 0
    ? toAnnualEnergyKWh(energyKWh, energyPeriod)
    : NaN;

  /* ---------- AREA ---------- */
  const areaSqft = Number.isFinite(areaSqm) && areaSqm > 0
    ? areaSqm / 0.092903
    : NaN;

  /* ---------- CLIMATE ---------- */
  const climateZone =
    cityClimateMap[city.toLowerCase()]?.zone || "Unknown";


  /* ---------- BUILDING SIZE ---------- */
  const buildingSize = getBuildingSize(areaSqm);

  /* ---------- EPI ---------- */
  const epi = Number.isFinite(energyAnnualKWh) &&
    energyAnnualKWh > 0 &&
    Number.isFinite(areaSqm) &&
    areaSqm > 0
    ? energyAnnualKWh / areaSqm
    : NaN;

  /* ---------- ASSURE EPI ---------- */
  const assureStatus = !Number.isFinite(epi)
    ? { text: MISSING_RESULT_TEXT, class: "rating-fair" }
    : epi <= ASSURE_EPI_TARGET
      ? { text: "Within target", class: "metric-good" }
      : { text: "Above target", class: "metric-bad" };

  /* ---------- NET ENERGY (FINAL & CORRECT) ---------- */

  // Annual demand
  const annualEnergyDemand = energyAnnualKWh;


  // Renewable generation normalized to annual kWh
  const renewableGenKWh = toAnnualEnergyKWh(renewableValue, renewablePeriod);

  // Net balance
  const netEnergy = renewableGenKWh - annualEnergyDemand;

  // Tolerance
  const EPS = Math.max(1, 0.005 * annualEnergyDemand);

  let netStatus = {
    text: "Net Negative — More energy used than produced",
    class: "badge-negative"
  };

  if (renewableGenKWh > 0) {
    if (netEnergy > EPS) {
      netStatus = {
        text: "Net positive — Your building generates more energy than it consumes — extra energy can be exported for savings.",
        class: "badge-positive"
      };
    } else if (Math.abs(netEnergy) <= EPS) {
      netStatus = {
        text: "Net Zero — Your building generation and consumption are nearly equal",
        class: "badge-neutral"
      };
    }
  }

  /* ================= BEE STAR RATING (NBC-ALIGNED) ================= */

  let starRating = {
    text: MISSING_RESULT_TEXT,
    note: MISSING_RESULT_TEXT,
    class: "badge-warn"
  };

  let epi1 = NaN;
  let epi2 = NaN;
  let epi3 = NaN;
  let epi4 = NaN;
  let epi5 = NaN;

  /* ---------- HARD STOPS ---------- */

  // 1️⃣ Cold climate zone → NOT APPLICABLE
  if (climateZone.toLowerCase().includes("cold")) {
    starRating = {
      text: COLD_CLIMATE_MESSAGE,
      note: COLD_CLIMATE_MESSAGE,
      class: "badge-neutral"
    };
  }

  // 2️⃣ Missing required inputs
  else if (
    !city ||
    climateZone === "Unknown" ||
    isNaN(areaSqm) || areaSqm <= 0 ||
    isNaN(energyKWh) || energyKWh <= 0 ||
    isNaN(acAreaPercentage) || acAreaPercentage <= 0 || acAreaPercentage > 100
  ) {
    starRating = {
      text: MISSING_RESULT_TEXT,
      note: MISSING_RESULT_TEXT,
      class: "badge-warn"
    };
  }

  // 3️⃣ Valid → calculate stars
  else {
    const zoneKey = climateZone.trim();
    const eqByZone = beeEquations[zoneKey];
    const eq = eqByZone ? eqByZone[buildingSize] : null;

    if (!eq) {
      starRating = {
        text: MISSING_RESULT_TEXT,
        note: "BEE equations not available for this building type",
        class: "badge-warn"
      };
    } else {
      const acPct = acAreaPercentage;

      epi5 = (eq["5Star"].a * acPct) + eq["5Star"].c;
      epi4 = (eq["4Star"].a * acPct) + eq["4Star"].c;
      epi3 = (eq["3Star"].a * acPct) + eq["3Star"].c;
      epi2 = (eq["2Star"].a * acPct) + eq["2Star"].c;
      epi1 = (eq["1Star"].a * acPct) + eq["1Star"].c;

      if (epi <= epi5)
        starRating = { text: "★★★★★ (5 Star)", class: "badge-good" };
      else if (epi <= epi4)
        starRating = { text: "★★★★☆ (4 Star)", class: "badge-good" };
      else if (epi <= epi3)
        starRating = { text: "★★★☆☆ (3 Star)", class: "badge-warn" };
      else if (epi <= epi2)
        starRating = { text: "★★☆☆☆ (2 Star)", class: "badge-bad" };
      else if (epi <= epi1)
        starRating = { text: "★☆☆☆☆ (1 Star)", class: "badge-bad" };
      else
        starRating = { text: "No Star", class: "badge-bad" };
    }
  }

  /* ================= HVAC SIZING KPI ================= */

  let hvacSizing = {
    value: "",
    status: MISSING_RESULT_TEXT,
    note: "",
    class: "rating-fair",
    sfPerTR: null
  };

  if (areaSqft > 0 && !isNaN(coolingTR) && coolingTR > 0) {

    // ✅ ASSIGN, DO NOT DECLARE
    sfPerTR = areaSqft / coolingTR;

    if (sfPerTR >= 700 && sfPerTR <= 800) {
      hvacSizing = {
        value: `${sfPerTR.toFixed(0)} sqft/TR`,
        status: "Right amount of cooling provided",
        note: "Within recommended range",
        class: "rating-excellent",
        sfPerTR
      };
    }
    else if (sfPerTR < 700) {
      hvacSizing = {
        value: `${sfPerTR.toFixed(0)} sqft/TR`,
        status: "More cooling provided than needed",
        note: "Low sqft/TR",
        class: "rating-poor",
        sfPerTR
      };
    }
    else {
      hvacSizing = {
        value: `${sfPerTR.toFixed(0)} sqft/TR`,
        status: "Less cooling provided than needed",
        note: "High sqft/TR",
        class: "rating-fair",
        sfPerTR
      };
    }
  }


  /* ================= CONTRACT / DG SIZING KPI (STRUCTURED) ================= */
  const PF = 0.9;

  let demandSizing = {
    contract: "",
    dg: "",
    cdWsf: NaN,
    dgWsf: NaN,
    contractStatus: MISSING_RESULT_TEXT,
    dgStatus: MISSING_RESULT_TEXT,
    contractClass: "rating-fair",
    dgClass: "rating-fair"
  };

  if (areaSqft > 0) {
    const cdKW = !isNaN(contractDemandKVA) ? contractDemandKVA * PF : NaN;
    const dgKW = !isNaN(dgSize) ? dgSize * PF : NaN;

    const cdWsf = !isNaN(cdKW) ? (cdKW * 1000) / areaSqft : NaN;
    const dgWsf = !isNaN(dgKW) ? (dgKW * 1000) / areaSqft : NaN;

    demandSizing.cdWsf = cdWsf;
    demandSizing.dgWsf = dgWsf;

    if (!isNaN(cdWsf)) {
      demandSizing.contract = `${cdWsf.toFixed(2)} W/sqft`;
      demandSizing.contractStatus = cdWsf < 5 ? "Efficient" : "Above target";
      demandSizing.contractClass = cdWsf < 5 ? "rating-excellent" : "rating-poor";
    } else {
      demandSizing.contract = "Not provided";
    }

    if (!isNaN(dgWsf)) {
      demandSizing.dg = `${dgWsf.toFixed(2)} W/sqft`;
      demandSizing.dgStatus = dgWsf < 5 ? "Efficient" : "Above target";
      demandSizing.dgClass = dgWsf < 5 ? "rating-excellent" : "rating-poor";
    } else {
      demandSizing.dg = "Not provided";
    }
  }


  /* ================= LPCD CALCULATION ================= */
  let lpcd = NaN;
  const annualWaterKL = toAnnualWaterKL(waterKL, waterPeriod);

  if (
    !isNaN(waterKL) &&
    waterKL > 0 &&
    !isNaN(occupants) &&
    occupants > 0
  ) {
    // Annual kL → litres
    lpcd = calculateLpcd(waterKL, waterPeriod, occupants);
  }

  console.log("WATER DEBUG:", {
    waterKL,
    waterPeriod,
    annualWaterKL,
    occupants,
    lpcd
  });

  /* ================= WATER (NBC LPCD ONLY) ================= */
  let waterStatus = {
    text: MISSING_RESULT_TEXT,
    class: "rating-fair"
  };

  if (!isNaN(lpcd)) {
    if (lpcd <= NBC_LPCD) {
      waterStatus = {
        text: `${lpcd.toFixed(1)} lpcd — Within NBC`,
        class: "rating-excellent"
      };
    } else {
      waterStatus = {
        text: `${lpcd.toFixed(1)} lpcd — Above NBC`,
        class: "rating-poor"
      };
    }
  }

  /* ---------- DEBUG (KEEP FOR NOW) ---------- */
  console.log("DEBUG:", {
    areaSqm,
    energyAnnualKWh,
    epi
  });

  return {
    city,
    climateZone,
    buildingSize,

    /* ---------- ENERGY ---------- */
    epi,
    annualEnergyDemand,     // ← used by Net Energy bar
    renewableGenKWh,        // ← used by Net Energy bar
    netEnergy,

    /* ---------- EPI / STARS ---------- */
    epiThresholds: {
      oneStar: epi1,
      twoStar: epi2,
      threeStar: epi3,
      fourStar: epi4,
      fiveStar: epi5
    },

    assureStatus,
    starRating,

    /* ---------- KPIs ---------- */
    netStatus,
    hvacSizing,
    sfPerTR,
    demandSizing,
    waterStatus,
    waterPeriod,

    lpcd
  };

}


function updateEpiBar({ epi, thresholds, assure, coldClimate = false }) {

  /* ===============================
     0️⃣ DOM ELEMENTS (ONCE)
     =============================== */
  const fill = document.querySelector(".epi-fill");
  const buildingMarker = document.querySelector(".building-marker");
  const assureMarker = document.querySelector(".assure-marker");
  const bar = document.querySelector(".epi-bar");

  const buildingLabel = document.getElementById("buildingLabel");
  const assureLabel = document.getElementById("assureLabel");
  const buildingText = document.getElementById("buildingEpiText");
  const starScale = document.querySelector(".epi-star-scale");
  const msg = document.getElementById("epiMessage");

  /* ===============================
     RESET UI (CRITICAL FOR SWITCHING)
     =============================== */
  if (assureMarker) assureMarker.style.display = "";
  if (assureLabel) assureLabel.style.display = "";
  if (buildingMarker) buildingMarker.style.display = "";
  if (starScale) starScale.style.display = "";

  fill.style.width = "0%";
  fill.style.background = "#2ecc71";

  /* ===============================
     ❄️ COLD CLIMATE MODE
     =============================== */
  if (coldClimate) {
    if (isNaN(epi)) {
      if (starScale) starScale.style.display = "none";
      fill.style.width = "0%";
      fill.style.background = "#dcdcdc";
      if (buildingMarker) buildingMarker.style.display = "none";
      if (buildingLabel) buildingLabel.style.display = "none";
      if (assureMarker) assureMarker.style.left = "75%";
      if (assureLabel) assureLabel.style.left = "75%";
      msg.innerHTML = `
        <b>BEE star benchmarking is not available for cold climate zones.</b><br>
        EPI comparison with ASSURE KPI needs valid energy and area inputs.
      `;
      return;
    }

    const AXIS_MAX = Math.max(assure * 1.4, epi * 1.15, assure + 25);
    const pct = v => (Math.max(0, Math.min(v, AXIS_MAX)) / AXIS_MAX) * 100;
    const buildingPct = pct(epi);
    const assurePct = pct(assure);

    fill.style.width = `${buildingPct}%`;
    fill.style.background = epi <= assure ? "#2ecc71" : `
      linear-gradient(
        to right,
        #2ecc71 0%,
        #2ecc71 ${assurePct}%,
        #27ae60 ${assurePct}%,
        #27ae60 100%
      )
    `;

    buildingMarker.style.left = `calc(${buildingPct}% - 2px)`;
    buildingLabel.style.left = `${buildingPct}%`;
    assureMarker.style.left = `calc(${assurePct}% - 2px)`;
    assureLabel.style.left = `${assurePct}%`;
    buildingText.textContent = formatEpiLabel(epi);

    if (starScale) starScale.style.display = "none";

    const dist = Math.abs(buildingPct - assurePct);
    if (dist < 8) {
      buildingLabel.style.top = "-78px";
      assureLabel.style.top = "-38px";
    } else {
      buildingLabel.style.top = "-58px";
      assureLabel.style.top = "-58px";
    }

    clampFloatingElement(buildingLabel, bar, buildingPct);
    clampFloatingElement(assureLabel, bar, assurePct);

    const delta = Math.round(Math.abs(epi - assure));
    const status = epi <= assure
      ? `Within ASSURE KPI by ${delta} kWh/m²/yr.`
      : `${delta} kWh/m²/yr above ASSURE KPI (75 kWh/m²/yr).`;

    msg.innerHTML = `
      <b>BEE star benchmarking is not available for cold climate zones.</b><br>
      EPI comparison with ASSURE KPI is available: ${status}
    `;

    return;

  }

  /* ===============================
     NORMAL FLOW (NON-COLD)
     =============================== */
  if (!thresholds || isNaN(epi)) return;

  const {
    oneStar,
    twoStar,
    threeStar,
    fourStar,
    fiveStar
  } = thresholds;

  /* ===============================
     1️⃣ BASE THRESHOLD
     =============================== */
  const BASE_MAX = Math.max(
    assure,
    (2 * oneStar) - twoStar
  );

  /* ===============================
     2️⃣ SMART 2-STAGE EXTENSION
     =============================== */
  let AXIS_MAX = BASE_MAX;

  if (epi > BASE_MAX) {
    const SOFT_CAP = 1000;
    const LINEAR_FACTOR = 0.8;
    const LOG_FACTOR = BASE_MAX;

    if (epi <= SOFT_CAP) {
      AXIS_MAX = BASE_MAX + (epi - BASE_MAX) * LINEAR_FACTOR;
    } else {
      AXIS_MAX =
        BASE_MAX +
        (SOFT_CAP - BASE_MAX) * LINEAR_FACTOR +
        Math.log10(epi - SOFT_CAP + 1) * LOG_FACTOR;
    }
  }

  /* ===============================
     3️⃣ SCALE HELPERS
     =============================== */
  const clamp = v => Math.max(0, Math.min(v, AXIS_MAX));
  const pct = v => (clamp(v) / AXIS_MAX) * 100;

  const buildingEpi = clamp(epi);

  /* ===============================
     4️⃣ BAR + MARKERS
     =============================== */
  const buildingPct = pct(buildingEpi);
  const assurePct = pct(assure);

  fill.style.width = `${buildingPct}%`;

  // Green → darker green after ASSURE
  if (epi > assure) {
    fill.style.background = `
      linear-gradient(
        to right,
        #2ecc71 0%,
        #2ecc71 ${assurePct}%,
        #27ae60 ${assurePct}%,
        #27ae60 100%
      )
    `;
  } else {
    fill.style.background = "#2ecc71";
  }

  buildingMarker.style.left = `calc(${buildingPct}% - 2px)`;
  buildingLabel.style.left = `${buildingPct}%`;

  assureMarker.style.left = `calc(${assurePct}% - 2px)`;
  assureLabel.style.left = `${assurePct}%`;

  buildingText.textContent = formatEpiLabel(epi);
  clampFloatingElement(buildingLabel, bar, buildingPct);
  clampFloatingElement(assureLabel, bar, assurePct);

  /* ===============================
     5️⃣ STAR POSITIONING
     =============================== */
  const stars = [
    { id: 5, value: fiveStar },
    { id: 4, value: fourStar },
    { id: 3, value: threeStar },
    { id: 2, value: twoStar },
    { id: 1, value: oneStar }
  ];

  stars.forEach(({ id, value }) => {
    const el = document.querySelector(
      `.epi-star-group[data-star="${id}"]`
    );
    if (!el || isNaN(value)) return;
    el.style.left = `${pct(value)}%`;
    el.style.opacity = 1;
  });

  /* ===============================
     6️⃣ LABEL STACKING
     =============================== */
  const dist = Math.abs(buildingPct - assurePct);

  if (dist < 8) {
    buildingLabel.style.top = "-78px";
    assureLabel.style.top = "-38px";
  } else {
    buildingLabel.style.top = "-58px";
    assureLabel.style.top = "-58px";
  }

  /* ===============================
     7️⃣ USER MESSAGE
     =============================== */
  if (epi <= fiveStar) {
    msg.innerHTML = "Excellent! 5-Star energy performance.";
  }
  else if (epi <= threeStar) {
    msg.innerHTML = "Average efficiency. Optimization recommended.";
  }
  else if (epi <= oneStar) {
    msg.innerHTML = "<b>Poor efficiency.</b> Action required.";
  }
  else {
    const delta = Math.round(epi - assure);
    msg.innerHTML =
      `<b>Very high energy use.</b> ${delta} kWh/m²/yr above ASSURE KPI (75 kWh/m²/yr)`;
  }
}

// Net energy bar staus

function updateNetEnergyBar({ consumed, generated }) {

  const conFill = document.querySelector(".net-energy-consumed");
  const genFill = document.querySelector(".net-energy-generated");

  const conText = document.getElementById("conText");
  const genText = document.getElementById("genText");
  const msg = document.getElementById("netEnergyMsg");

  if (
    isNaN(consumed) || consumed < 0 ||
    isNaN(generated) || generated < 0
  ) {
    msg.innerHTML = "Result not available due to missing input(s).";
    return;
  }

  const maxVal = Math.max(consumed, generated, 1);

  const conPct = (consumed / maxVal) * 100;
  const genPct = (generated / maxVal) * 100;

  conFill.style.width = `${conPct}%`;
  genFill.style.width = `${genPct}%`;

  conText.textContent = `Consumed – ${Math.round(consumed)} kWh`;
  genText.textContent = `Generated – ${Math.round(generated)} kWh`;

  const diff = Math.round(generated - consumed);

  if (diff > 0) {
    msg.innerHTML = `
      <span style="color:#2ecc71">
        Net Positive: Generated &gt; Consumed (${diff} kWh surplus)
      </span>
    `;
  }
  else if (diff < 0) {
    msg.innerHTML = `
      <span style="color:#e74c3c">
        Net Negative: Consumed &gt; Generated (${Math.abs(diff)} kWh deficit)
      </span>
    `;
  }
  else {
    msg.innerHTML = `
      <span style="color:#f1c40f">
        Net Zero: Generated ≈ Consumed
      </span>
    `;
  }
}


// ############################ havc sizing bar ##################################

function updateHvacBar(sfPerTR) {
  if (!sfPerTR || isNaN(sfPerTR)) return;

  const TARGET = 800;

  const fill = document.querySelector(".hvac-fill");

  const buildingMarker = document.querySelector(".hvac-marker.building");
  const targetMarker = document.querySelector(".hvac-marker.target");

  const buildingLabel = document.getElementById("hvacBuildingLabel");
  const buildingValue = document.getElementById("hvacBuildingValue");
  const statusMessage = document.getElementById("hvacStatusMessage");
  const bar = document.querySelector(".hvac-bar");

  /* ================= DYNAMIC SCALE ================= */
  const AXIS_MAX = Math.max(sfPerTR, TARGET) * 1.2;
  const pct = v => Math.min((v / AXIS_MAX) * 100, 100);

  const buildingPct = pct(sfPerTR);
  const targetPct = pct(TARGET);

  /* ================= BAR WIDTH ================= */
  fill.style.width = `${buildingPct}%`;

  /* ================= POSITIONING ================= */
  buildingMarker.style.left = `${buildingPct}%`;
  targetMarker.style.left = `${targetPct}%`;
  const targetLabel = document.getElementById("hvacTargetLabel");
  targetLabel.style.left = `${targetPct}%`;


  buildingValue.textContent = `${Math.round(sfPerTR)} sqft/TR`;
  buildingLabel.style.left = `${buildingPct}%`;
  buildingLabel.style.setProperty("--bubble-stem-left", "50%");

  if (targetLabel) {
    targetLabel.innerHTML = `
      <span>ASSURE KPI</span>
      <b>800 sqft/TR</b>
    `;
  }

  /* ================= STRICT COLOR LOGIC ================= */
  const TOLERANCE = 1; // allow ±1 sqft/TR

  let color;
  let statusClass;
  let statusText;
  const labelLineColor = "#111827";

  if (sfPerTR >= 700 && sfPerTR <= TARGET + TOLERANCE) {
    color = "#2ecc71"; // GREEN (exact / acceptable)
    statusClass = "green";
    statusText = "Right amount of cooling provided";
  }
  else if (sfPerTR < TARGET) {
    color = "#3498db"; // BLUE (more cooling provided)
    statusClass = "blue";
    statusText = "More cooling provided than needed";
  }
  else {
    color = "#e74c3c"; // RED (less cooling provided)
    statusClass = "red";
    statusText = "Less cooling provided than needed";
  }

  /* ================= APPLY COLORS ================= */
  fill.style.background = color;

  // Change building marker line color
  buildingMarker.style.setProperty("--marker-color", labelLineColor);

  // Keep the label as a white note and only change the accent/stem color.
  buildingLabel.style.setProperty("--marker-color", labelLineColor);

  // Change text color
  buildingValue.style.color = "#111827";

  if (statusMessage) {
    statusMessage.innerHTML = `<span class="lg ${statusClass}">${statusText}</span>`;
  }
}

// ############################ WATER CYLINDER ##################################

function updateWaterCylinder(lpcd) {

  if (isNaN(lpcd)) return;

  const LIMIT = 45;
  const CYLINDER_HEIGHT = 460;

  const fill = document.getElementById("fill");
  const limitLine = document.getElementById("limitLine");
  const actualBadge = document.getElementById("badge");
  const scale = document.getElementById("Scale");

  /* ================= SAFE GUARD ================= */
  if (!fill || !limitLine || !actualBadge || !scale) return;

  /* ================= SMART MAX SCALE ================= */
  function getNiceMax(value) {
    if (value <= 60) return 60;
    if (value <= 120) return 120;
    if (value <= 300) return 300;
    if (value <= 600) return 600;
    if (value <= 1000) return 1000;

    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    return Math.ceil(value / magnitude) * magnitude;
  }

  const maxValue = getNiceMax(lpcd);

  /* ================= FILL HEIGHT ================= */
  const fillPercent = Math.min(lpcd / maxValue, 1);
  const heightPx = fillPercent * CYLINDER_HEIGHT;
  fill.style.height = heightPx + "px";

  /* ================= COLOR LOGIC ================= */
  if (lpcd > LIMIT) {
    fill.style.background = "linear-gradient(to top, #ef4444, #dc2626)";
    actualBadge.style.color = "#ef4444";
  } else {
    fill.style.background = "linear-gradient(to top, #60a5fa, #3b82f6)";
    actualBadge.style.color = "#ffffff";
  }

  /* ================= LIMIT LINE ================= */
  const limitPercent = LIMIT / maxValue;
  const limitPosPx = limitPercent * CYLINDER_HEIGHT;
  limitLine.style.bottom = (limitPosPx - 2) + "px";

  /* ================= BADGE POSITION ================= */
  let badgeBottom = heightPx + 20;
  if (badgeBottom < 60) badgeBottom = 60;

  actualBadge.style.bottom = badgeBottom + "px";
  actualBadge.textContent = `Actual: ${lpcd.toFixed(1)} lpcd`;

  /* ================= CLEAN SCALE (MAX 6 TICKS) ================= */
  scale.innerHTML = "";

  const divisions = 5; // 6 ticks total
  const step = maxValue / divisions;

  for (let i = 0; i <= divisions; i++) {

    const value = Math.round(i * step);
    const percent = value / maxValue;
    const pos = percent * CYLINDER_HEIGHT;

    const label = document.createElement("div");
    label.className = "scale-row";
    label.style.position = "absolute";
    label.style.right = "0";
    label.style.bottom = pos + "px";
    label.style.transform = "translateY(50%)";

    const number = document.createElement("span");
    number.textContent = value;

    const line = document.createElement("div");
    line.className = "scale-line";

    label.appendChild(number);
    label.appendChild(line);

    scale.appendChild(label);
  }

  /* ================= NBC LIMIT LABEL ================= */
  const limitLabel = document.createElement("div");
  limitLabel.className = "scale-row";
  limitLabel.style.position = "absolute";
  limitLabel.style.right = "0";
  limitLabel.style.bottom = limitPosPx + "px";
  limitLabel.style.transform = "translateY(50%)";
  limitLabel.style.color = "#facc15";
  limitLabel.style.fontWeight = "700";
  limitLabel.innerHTML = `
    <span>45</span>
    <div class="scale-line"></div>
    <div class="scale-label">(NBC) limit: 45 lpcd</div>
  `;

  scale.appendChild(limitLabel);
}



/*************************************************
 * ASSESS BUTTON (FINAL – VALIDATED)
 *************************************************/
assessBtn.addEventListener("click", () => {

  /* ========= COLLECT INPUTS ========= */
  const inputs = {
    city: readText("city"),
    areaSqm: readNumber("area"),
    energyKWh: readNumber("energy"),
    energyPeriod: readText("energyPeriod"),
    coolingTR: readNumber("acCapacity"),
    contractDemandKVA: readNumber("contractDemand"),
    dgSize: readNumber("dgSize"),
    renewableValue: readNumber("renewableValue"),
    renewablePeriod: readText("renewablePeriod"),
    acAreaPercentage: readNumber("acArea"),
    waterKL: readNumber("water"),        // ✅ ADD
    waterPeriod: readText("waterPeriod"),
    occupants: readNumber("occupants"),  // ✅ ADD
    // lpcd: readNumber("lpcd")
  };

  /* ========= CITY REQUIRED (ONLY POPUP CASE) ========= */
  if (!inputs.city) {
    alert("Please select State and City to continue");
    return;
  }


  /* ========= RUN CALCULATION ========= */
  const results = calculateBuildingPerformance(inputs);
  latestAssessmentInputs = Object.freeze({ ...collectInputs() });
  renderResults(results);
});

resetBtn.addEventListener("click", resetAssessmentForm);
downloadReportBtn.addEventListener("click", openReportDialog);

function buildDemandLine(d) {
  const parts = [];

  if (d.contract && d.contract !== "Not provided") {
    parts.push(`<strong>Contract:</strong> ${d.contract}`);
  }

  if (d.dg && d.dg !== "Not provided") {
    parts.push(`<strong>DG:</strong> ${d.dg}`);
  }

  // If nothing provided
  if (parts.length === 0) {
    return `
      <span class="rating-fair">
        Input required — enter <b>Contract Demand</b> or <b>DG Set size</b>
      </span>
    `;
  }

  return `
    ${parts.join(" &nbsp;•&nbsp; ")}
    &nbsp;—&nbsp;
    <strong>${d.status}</strong>
  `;
}

function buildSizingDots(value, dotCount, colorA, colorB) {
  let dotsHtml = "";
  for (let i = 1; i <= dotCount; i++) {
    const fill = Math.max(0, Math.min(1, value - (i - 1)));
    const dotColor = i % 2 === 0 ? colorB : colorA;
    dotsHtml += `<div class="dg-dot" style="--fill:${fill}; --dot-color:${dotColor};"></div>`;
  }
  return dotsHtml;
}

function getSizingScalePct(value, dotCount) {
  const clampedValue = Math.max(0, Math.min(value, dotCount));
  return (clampedValue / dotCount) * 100;
}

function getSizingMarkerPct(value, dotCount) {
  const clampedValue = Math.max(0, Math.min(value, dotCount));
  if (clampedValue <= 0) return 0;
  return ((clampedValue - 0.5) / dotCount) * 100;
}

function getSizingBarPct(value, axisMax) {
  const clampedValue = Math.max(0, Math.min(value, axisMax));
  return (clampedValue / axisMax) * 100;
}

function renderDensitySizingBar({
  root,
  themeClass = "",
  iconSrc,
  iconAlt,
  title,
  helpText,
  value,
  valueUnit,
  target,
  targetText,
  goodStatusText,
  badStatusText
}) {
  const axisMax = Math.max(value, target);
  const valuePct = getSizingBarPct(value, axisMax);
  const targetPct = getSizingBarPct(target, axisMax);
  const targetVisualPct = Math.min(targetPct, 96);
  const good = value <= target;
  const fillColor = good ? "#2ecc71" : "#e74c3c";
  const buildingLineColor = good ? "#111827" : "#111827";
  const statusText = good ? goodStatusText : badStatusText;
  const statusClass = good ? "is-good" : "is-alert";

  root.innerHTML = `
    <div class="${themeClass}">
      <div class="dg-head section-heading">
        <img class="section-icon" src="${iconSrc}" alt="${iconAlt}">
        <span class="dg-title section-title">${title}</span>
        ${buildOutputHelp(helpText)}
      </div>

      <div class="dg-visual dg-bar-visual">
        <div class="dg-bubble ${good ? "dg-good" : "dg-bad"}" style="left:${valuePct}%; --dg-line:${buildingLineColor};">
          <span>Your Building</span>
          <b>${value.toFixed(1)} ${valueUnit}</b>
        </div>

        <div class="dg-bar">
          <div class="dg-fill" style="width:${valuePct}%; background:${fillColor};"></div>
          <div class="dg-building-marker" style="left:calc(${valuePct}% - 2px); --dg-line:${buildingLineColor};"></div>
          <div class="dg-target-marker" style="left:calc(${targetVisualPct}% - 2px);"></div>
        </div>

        <div class="dg-target-label" style="left:${targetVisualPct}%;">
          <span>ASSURE KPI</span>
          <b>${targetText}</b>
        </div>

        <div class="dg-status-message ${statusClass}">${statusText}</div>
      </div>
    </div>
  `;

  const bubble = root.querySelector(".dg-bubble");
  const frame = root.querySelector(".dg-visual");
  const bar = root.querySelector(".dg-bar");
  const targetLabel = root.querySelector(".dg-target-label");
  positionBubbleInFrame(bubble, frame, bar, valuePct, 8);
  positionBubbleInFrame(targetLabel, frame, bar, targetVisualPct, 8);
}

function renderDgSizingVisual(dgWsf) {
  const root = document.getElementById("outDgSizing");
  if (!root) return;

  if (isNaN(dgWsf) || dgWsf < 0) {
    root.innerHTML = `
      <div class="dg-head section-heading">
        <img class="section-icon" src="buildinge_health_tool_asset/dg-set-sizing.png" alt="DG Set Sizing">
        <span class="dg-title section-title">Backup Power Density</span>
        ${buildOutputHelp("Backup Power Density is the electrical power consumption per floor area that can be supported by the DG system. Lower value indicates a lean backup system that prioritises only the essentials while a higher value indicates redundancy.")}
      </div>
      <div class="rating-fair">Result not available due to missing input(s).</div>
    `;
    return;
  }

  const TARGET = 5;
  renderDensitySizingBar({
    root,
    iconSrc: "buildinge_health_tool_asset/dg-set-sizing.png",
    iconAlt: "DG Set Sizing",
    title: "Backup Power Density",
    helpText: "Backup Power Density is the electrical power consumption per floor area that can be supported by the DG system. Lower value indicates a lean backup system that prioritises only the essentials while a higher value indicates redundancy.",
    value: dgWsf,
    valueUnit: "W/sqft",
    target: TARGET,
    targetText: "&lt; 5 W/sqft",
    goodStatusText: "Right amount of backup power",
    badStatusText: "More backup power than needed"
  });
}

// ///////////////////Contract demand//////////////////////////

function renderContractSizingVisual(cdWsf) {
  const root = document.getElementById("outContractSizing");
  if (!root) return;

  if (isNaN(cdWsf) || cdWsf < 0) {
    root.innerHTML = `
      <div class="dg-head section-heading">
        <img class="section-icon" src="buildinge_health_tool_asset/contract-demand.png" alt="Contract Demand">
        <span class="dg-title section-title">Contract Demand Density</span>
        ${buildOutputHelp("Contract Demand is the maximum power capacity agreed with the electric utility. If it is higher than your actual need, you are paying for unused capacity; if it is lower, it can lead to penalties.")}
      </div>
      <div class="rating-fair">Result not available due to missing input(s).</div>
    `;
    return;
  }

  const TARGET = 5;
  renderDensitySizingBar({
    root,
    themeClass: "contract-theme",
    iconSrc: "buildinge_health_tool_asset/contract-demand.png",
    iconAlt: "Contract Demand",
    title: "Contract Demand Density",
    helpText: "Contract Demand Density is the maximum power capacity agreed with the electric utility. If it is higher than your actual need, you are paying for unused capacity; if it is lower, it can lead to penalties. ",
    value: cdWsf,
    valueUnit: "W/sqft",
    target: TARGET,
    targetText: "&lt; 5 W/sqft",
    goodStatusText: "Right-sized power capacity",
    badStatusText: "More power capacity than needed"
  });
}
/*************************************************

 * RENDER RESULTS (MATCHES HTML EXACTLY)
 *************************************************/

function resultNumber(value, digits = 0) {
  if (!Number.isFinite(value)) return "--";
  return Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  });
}

function boundedPct(value, max) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.max(3, Math.min(97, (value / max) * 100));
}

function parseStarCount(text) {
  if (!text || text === MISSING_RESULT_TEXT || text === COLD_CLIMATE_MESSAGE) return 0;
  const match = String(text).match(/(\d)\s*Star/i);
  return match ? Number(match[1]) : 0;
}

function resultToneClass(kind, value) {
  if (!Number.isFinite(value)) return "tone-missing";
  if (kind === "good") return "tone-good";
  if (kind === "warn") return "tone-warn";
  if (kind === "bad") return "tone-bad";
  return "tone-warn";
}

function getOutputIconSvg(iconSrc, title = "") {
  if (iconSrc.includes("bee-star")) {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.2 18.4 5.8v5.1c0 4.1-2.6 7.7-6.4 9.1-3.8-1.4-6.4-5-6.4-9.1V5.8L12 3.2Z"></path>
        <path d="m9.4 12 1.7 1.7 3.8-4"></path>
      </svg>
    `;
  }

  if (title === "Net Energy Status") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 15.8a6 6 0 0 1 12 0"></path>
        <path d="M12 15.8 15.5 10.4"></path>
      </svg>
    `;
  }

  if (iconSrc.includes("net_energy")) {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m13 2.8-7.2 10h5L9.8 21.2l8.4-11h-5.6L13 2.8Z"></path>
      </svg>
    `;
  }

  if (iconSrc.includes("hvac-sizing")) {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 8.5h8.2a3.2 3.2 0 1 0-3.2-3.2"></path>
        <path d="M4 12h13.5a3 3 0 1 1-3 3"></path>
        <path d="M7 16h5.2a2.6 2.6 0 1 1-2.6 2.6"></path>
      </svg>
    `;
  }

  if (iconSrc.includes("contract-demand")) {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3.5h7l3 3V20.5H7V3.5Z"></path>
        <path d="M14 3.5V7h3"></path>
        <path d="M9.5 11h5"></path>
        <path d="M9.5 14h5"></path>
        <path d="M9.5 17h3"></path>
      </svg>
    `;
  }

  if (iconSrc.includes("dg-set-sizing")) {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.2 8.4H5.6v7.2h1.6"></path>
        <path d="M16.8 8.4h1.6v7.2h-1.6"></path>
        <path d="M11.9 7.2 9.5 12h2.8l-.2 4.8 2.5-5h-2.8l.1-4.6Z"></path>
      </svg>
    `;
  }

  if (iconSrc.includes("water")) {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.8s5.3 5.7 5.3 9.4a5.3 5.3 0 0 1-10.6 0C6.7 9.5 12 3.8 12 3.8Z"></path>
        <path d="M9.7 13.7a2.6 2.6 0 0 0 2.9 2.1"></path>
      </svg>
    `;
  }

  return "";
}

function renderOutputHeader(iconSrc, title, tone, helpText) {
  return `
    <div class="result-card-head">
      <span class="result-icon ${tone} ${title === "Net Energy Status" ? "net-energy-icon" : ""}">${getOutputIconSvg(iconSrc, title)}</span>
      <span>${title}</span>
      ${buildOutputHelp(helpText)}
    </div>
  `;
}

function renderMetricBar({ value, target, axisMax, unit, targetLabel, buildingLabel, fillClass, toneClass }) {
  const targetPct = boundedPct(target, axisMax);
  const valuePct = boundedPct(value, axisMax);
  const readableValue = Number.isFinite(value) ? `${resultNumber(value, value < 10 ? 1 : 0)} ${unit}` : "Not available";

  return `
    <div class="mini-bar-wrap">
      <div class="benchmark-tag" style="left:${targetPct}%">
        <span>${targetLabel}</span>
      </div>
      <div class="mini-bar ${fillClass}">
        <span class="target-line" style="left:${targetPct}%"></span>
        <span class="building-line" style="left:${valuePct}%"></span>
      </div>
      <div class="building-tag ${toneClass}" style="left:${valuePct}%">
        <span>${buildingLabel}</span>
        <b>${readableValue}</b>
      </div>
    </div>
  `;
}

function renderResults(r) {
  latestResults = r;

  const outputCards = document.getElementById("outputCards");
  if (!outputCards) return;

  const starCount = parseStarCount(r.starRating?.text);
  const starTone = starCount >= 4 ? "tone-good" : starCount >= 3 ? "tone-warn" : "tone-bad";
  const starHtml = Array.from({ length: 5 }, (_, i) =>
    `<span class="star ${i < starCount ? "filled" : ""}">&#9733;</span>`
  ).join("");
  const climateText = r.climateZone ? `CLIMATE ZONE: <b>${r.climateZone.toUpperCase()}</b>` : "CLIMATE ZONE: <b>--</b>";
  const beeNote = r.starRating?.text === COLD_CLIMATE_MESSAGE
    ? COLD_CLIMATE_MESSAGE
    : starCount >= 5
      ? "Excellent! 5-Star energy performance."
      : starCount > 0
        ? `${starCount}-Star energy performance.`
        : "Zero star energy performance.";

  const epiTone = Number.isFinite(r.epi) && r.epi <= ASSURE_EPI_TARGET ? "tone-good" : "tone-warn";
  const epiAxis = Math.max(ASSURE_EPI_TARGET * 1.7, Number.isFinite(r.epi) ? r.epi * 1.25 : 0, 120);
  const epiMessage = Number.isFinite(r.epi)
    ? r.epi <= ASSURE_EPI_TARGET
      ? "Within the ASSURE KPI target of 75 kWh/m2/yr."
      : `${resultNumber(r.epi - ASSURE_EPI_TARGET, 0)} kWh/m2/yr above ASSURE KPI target.`
    : MISSING_RESULT_TEXT;

  const generated = Number.isFinite(r.renewableGenKWh) ? r.renewableGenKWh : 0;
  const consumed = Number.isFinite(r.annualEnergyDemand) ? r.annualEnergyDemand : NaN;
  const netPct = Number.isFinite(consumed) && consumed > 0 ? Math.min(999, (generated / consumed) * 100) : NaN;
  const netTone = Number.isFinite(netPct) && netPct >= 100 ? "tone-good" : Number.isFinite(netPct) && netPct > 0 ? "tone-warn" : "tone-bad";
  const donutPct = Number.isFinite(netPct) ? Math.max(0, Math.min(100, netPct)) : 0;
  const netLabel = Number.isFinite(netPct) ? `${Math.round(netPct)}%` : "--";
  const netSubLabel = Number.isFinite(netPct) && netPct >= 100 ? "NET POSITIVE" : Number.isFinite(netPct) && netPct > 0 ? "TO NET ZERO" : "NO OFFSET";
  const netMsg = Number.isFinite(netPct)
    ? `Renewables offset ${Math.round(netPct)}% of consumption.`
    : MISSING_RESULT_TEXT;

  const hvacValue = r.hvacSizing?.sfPerTR;
  const hvacTone = !Number.isFinite(hvacValue)
    ? "tone-missing"
    : hvacValue >= 700 && hvacValue <= 800
      ? "tone-good"
      : "tone-bad";
  const hvacAxis = Math.max(1000, Number.isFinite(hvacValue) ? hvacValue * 1.25 : 0);
  const hvacMsg = Number.isFinite(hvacValue)
    ? hvacValue < 700
      ? "More cooling provided than needed"
      : hvacValue <= 800
        ? "Right amount of cooling provided"
        : "Less cooling provided than needed"
    : MISSING_RESULT_TEXT;

  const cdValue = r.demandSizing?.cdWsf;
  const cdTone = Number.isFinite(cdValue) && cdValue <= 5 ? "tone-good" : "tone-warn";
  const cdAxis = Math.max(8, Number.isFinite(cdValue) ? cdValue * 1.35 : 0);
  const cdMsg = Number.isFinite(cdValue)
    ? cdValue <= 5 ? "Right-sized power capacity" : "More power capacity than needed"
    : MISSING_RESULT_TEXT;

  const dgValue = r.demandSizing?.dgWsf;
  const dgTone = Number.isFinite(dgValue) && dgValue <= 5 ? "tone-good" : "tone-bad";
  const dgAxis = Math.max(8, Number.isFinite(dgValue) ? dgValue * 1.35 : 0);
  const dgMsg = Number.isFinite(dgValue)
    ? dgValue <= 5 ? "Right amount of backup power" : "More backup power than needed"
    : MISSING_RESULT_TEXT;

  const waterTone = Number.isFinite(r.lpcd) && r.lpcd <= NBC_LPCD ? "tone-good" : "tone-warn";
  const waterAxis = Math.max(70, Number.isFinite(r.lpcd) ? r.lpcd * 1.35 : 0);
  const waterMsg = Number.isFinite(r.lpcd)
    ? r.lpcd <= NBC_LPCD
      ? "Water use is within the recommended limit."
      : "Water use exceeds the recommended limit - consider reducing consumption."
    : MISSING_RESULT_TEXT;

  outputCards.innerHTML = `
    <article class="metric-card ${starTone}" id="outStarRating">
      ${renderOutputHeader("buildinge_health_tool_asset/bee-star.png", "BEE Star Rating", starTone, "BEE (Bureau of Energy Efficiency) label that rates a building's energy efficiency from 1 to 5 stars with higher stars indicating better performance.")}
      <div class="star-row">${starHtml}</div>
      <div class="climate-pill">${climateText}</div>
      <p class="card-message">${beeNote}</p>
    </article>

    <article class="metric-card epi-card-output ${epiTone}">
      ${renderOutputHeader("buildinge_health_tool_asset/net_energy.png", "Energy Performance Index", epiTone, "The annual energy a building uses per square meter (kWh/m2/year), indicating its overall energy efficiency. Lower values mean better performance.")}
      ${renderMetricBar({
    value: r.epi,
    target: ASSURE_EPI_TARGET,
    axisMax: epiAxis,
    unit: "kWh/m2/yr",
    targetLabel: "ASSURE KPI<br><b>75 kWh/m2/yr</b>",
    buildingLabel: "YOUR BUILDING",
    fillClass: "epi-gradient",
    toneClass: epiTone
  })}
      <div class="epi-tick-row" aria-hidden="true"><span>5</span><span>4</span><span>3</span><span>2</span><span>1</span></div>
      <p class="card-message" id="epiMessage">${epiMessage}</p>
    </article>

    <article class="metric-card net-energy-card-output ${netTone}">
      ${renderOutputHeader("buildinge_health_tool_asset/net_energy.png", "Net Energy Status", netTone, "Net Energy Status shows whether your building produces enough energy to meet its needs. A positive status means you produce more than you consume.")}
      <div class="net-card-body">
        <div class="donut" style="--pct:${donutPct};"></div>
        <div class="net-percent"><b>${netLabel}</b><span>${netSubLabel}</span></div>
      </div>
      <div class="net-values">
        <span>Consumed<br><b>${resultNumber(consumed)} kWh</b></span>
        <span>Generated<br><b>${resultNumber(generated)} kWh</b></span>
      </div>
      <p class="card-message" id="netEnergyMsg">${netMsg}</p>
    </article>

    <article class="metric-card ${hvacTone}">
      ${renderOutputHeader("buildinge_health_tool_asset/hvac-sizing.png", "HVAC Capacity Factor", hvacTone, "HVAC Capacity Factor (sqft/TR) indicates the floor area cooled by a single ton of air conditioning. A higher value suggests a more efficient building that needs smaller cooling equipment.")}
      ${renderMetricBar({
    value: hvacValue,
    target: 800,
    axisMax: hvacAxis,
    unit: "sqft/TR",
    targetLabel: "ASSURE KPI<br><b>700-800 sqft/TR</b>",
    buildingLabel: "YOUR BUILDING",
    fillClass: "hvac-gradient",
    toneClass: hvacTone
  })}
      <p class="card-message">${hvacMsg}</p>
    </article>

    <article class="metric-card ${cdTone}">
      ${renderOutputHeader("buildinge_health_tool_asset/contract-demand.png", "Contract Demand Density", cdTone, "Contract Demand Density is the maximum power capacity agreed with the electric utility. If it is higher than your actual need, you are paying for unused capacity; if it is lower, it can lead to penalties.")}
      ${renderMetricBar({
    value: cdValue,
    target: 5,
    axisMax: cdAxis,
    unit: "W/sqft",
    targetLabel: "ASSURE KPI<br><b>&lt; 5 W/sqft</b>",
    buildingLabel: "YOUR BUILDING",
    fillClass: "contract-gradient",
    toneClass: cdTone
  })}
      <p class="card-message">${cdMsg}</p>
    </article>

    <article class="metric-card ${dgTone}">
      ${renderOutputHeader("buildinge_health_tool_asset/dg-set-sizing.png", "Backup Power Density", dgTone, "Backup Power Density is the electrical power consumption per floor area that can be supported by the DG system. Lower value indicates a lean backup system that prioritises only the essentials while a higher value indicates redundancy.")}
      ${renderMetricBar({
    value: dgValue,
    target: 5,
    axisMax: dgAxis,
    unit: "W/sqft",
    targetLabel: "ASSURE KPI<br><b>&lt; 5 W/sqft</b>",
    buildingLabel: "YOUR BUILDING",
    fillClass: "backup-gradient",
    toneClass: dgTone
  })}
      <p class="card-message">${dgMsg}</p>
    </article>

    <article class="metric-card ${waterTone}">
      ${renderOutputHeader("buildinge_health_tool_asset/water.png", "Water Efficiency", waterTone, "Water Efficiency indicates the average amount of water used per person per day (lpcd). Lower values mean better efficiency and reduced water consumption, while higher values indicate increased usage and potential wastage.")}
      ${renderMetricBar({
    value: r.lpcd,
    target: NBC_LPCD,
    axisMax: waterAxis,
    unit: "lpcd",
    targetLabel: "NBC LIMIT<br><b>&lt; 45 lpcd</b>",
    buildingLabel: "YOUR BUILDING",
    fillClass: "water-gradient",
    toneClass: waterTone
  })}
      <p class="card-message">${waterMsg}</p>
    </article>
  `;

  const inputAction = document.getElementById("assessBtn");
  if (inputAction) inputAction.innerHTML = 'Update results';

  setResultsVisibility(true);

  if (resultsSection) {
    resultsSection.classList.remove("results-refresh");
    void resultsSection.offsetWidth;
    resultsSection.classList.add("results-refresh");
  }
}

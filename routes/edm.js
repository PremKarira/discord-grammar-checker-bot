import { Router } from "express";

import { getEdmCache, saveEdmCache } from "../config/db.js";

const router = Router();

const EDM_URL =
  "https://p372.fivem.opfw.me/op-framework/exclusiveDealership.json";

const SPECIAL_IMPORTS_URL =
  "https://p372.fivem.opfw.me/op-framework/specialImportsDealership.json";

const VEHICLE_JSON_URL = "https://edm.shrt.day/json";

const IMAGE_BASE_URL = "https://edm.shrt.day/images";

// ============================================================
// CACHE SETTINGS
// ============================================================

// 10 minutes is now only a fallback.
// Normal refreshes happen when a shuffle's `next` is reached.
const CACHE_TTL = 10 * 60 * 1000;

const FAILED_REFRESH_COOLDOWN = 60 * 1000;

const REQUEST_TIMEOUT = 15 * 1000;

const MAX_RETRIES = 3;

// ============================================================
// MEMORY CACHE
// ============================================================

let cache = {
  edmResponse: null,
  specialImportsResponse: null,
  vehicleJsonResponse: null,
};

let cacheUpdatedAt = null;

let cachePromise = null;

let lastRefreshAttemptAt = 0;

let mongoCacheLoaded = false;

// ============================================================
// TIERS
// ============================================================

const tiers = [
  {
    name: "Respected",
    slug: "respected",
    start: 0,
    end: 5,
  },
  {
    name: "Heroic",
    slug: "heroic",
    start: 5,
    end: 10,
  },
  {
    name: "Legendary",
    slug: "legendary",
    start: 10,
    end: 15,
  },
];

// ============================================================
// GENERAL HELPERS
// ============================================================

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatTimestamp = (timestamp) => {
  if (!timestamp) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(timestamp * 1000));
};

const formatCacheTimestamp = (timestamp) => {
  if (!timestamp) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(timestamp));
};

// ============================================================
// UPSTREAM FETCH
// ============================================================

const fetchJson = async (url) => {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Fetching EDM source (${attempt}/${MAX_RETRIES}): ${url}`);

      const response = await fetch(url, {
        headers: {
          accept: "application/json",
          "user-agent": "Legacy-India-EDM/1.0",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      console.log(`EDM source fetched successfully: ${url}`);

      return data;
    } catch (error) {
      lastError = error;

      console.warn(
        `EDM source request failed (${attempt}/${MAX_RETRIES}): ${url}`,
        error?.message || error,
      );

      if (attempt < MAX_RETRIES) {
        const delay = 1500 * Math.pow(2, attempt - 1);

        console.log(`Retrying in ${delay}ms...`);

        await sleep(delay);
      }
    }
  }

  throw lastError;
};

// ============================================================
// MONGODB CACHE
// ============================================================

const loadCacheFromMongoDB = async () => {
  if (mongoCacheLoaded) {
    return;
  }

  try {
    const stored = await getEdmCache();

    if (!stored) {
      console.log("No EDM cache found in MongoDB.");

      mongoCacheLoaded = true;

      return;
    }

    if (stored.edmResponse) {
      cache.edmResponse = stored.edmResponse;
    }

    if (stored.specialImportsResponse) {
      cache.specialImportsResponse = stored.specialImportsResponse;
    }

    if (stored.vehicleJsonResponse) {
      cache.vehicleJsonResponse = stored.vehicleJsonResponse;
    }

    if (stored.updatedAt) {
      cacheUpdatedAt = new Date(stored.updatedAt).getTime();
    }

    console.log(
      `EDM cache loaded from MongoDB${
        cacheUpdatedAt ? ` (${formatCacheTimestamp(cacheUpdatedAt)})` : ""
      }`,
    );

    mongoCacheLoaded = true;
  } catch (error) {
    /*
     * This can happen if the router is imported
     * before initDB() has completed.
     *
     * Do NOT permanently mark the cache as loaded.
     * The next request will try again.
     */

    console.error(
      "Failed to load EDM cache from MongoDB:",
      error?.message || error,
    );
  }
};

// ============================================================
// CACHE VALIDATION
// ============================================================

const hasUsableCache = () =>
  Boolean(
    cache.edmResponse &&
    cache.specialImportsResponse &&
    cache.vehicleJsonResponse,
  );

// ============================================================
// SHUFFLE STATE
// ============================================================

const getEdmNextShuffle = () => {
  const value = cache.edmResponse?.data?.next;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const getSpecialImportsNextShuffle = () => {
  const value = cache.specialImportsResponse?.data?.next;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

// ============================================================
// DETERMINE WHICH SOURCES NEED REFRESH
// ============================================================

const getRequiredRefreshes = () => {
  const nowSeconds = Math.floor(Date.now() / 1000);

  const edmNext = getEdmNextShuffle();

  const specialNext = getSpecialImportsNextShuffle();

  const refreshEdm = edmNext !== null && nowSeconds >= edmNext;

  const refreshSpecialImports =
    specialNext !== null && nowSeconds >= specialNext;

  if (refreshEdm) {
    console.log(
      `🔄 EDM shuffle is due. Next shuffle was ${formatTimestamp(edmNext)}`,
    );
  }

  if (refreshSpecialImports) {
    console.log(
      `🔄 Special Imports shuffle is due. Next shuffle was ${formatTimestamp(
        specialNext,
      )}`,
    );
  }

  return {
    refreshEdm,
    refreshSpecialImports,
  };
};

// ============================================================
// SAVE CACHE
// ============================================================

const saveCacheToMongoDB = async () => {
  try {
    await saveEdmCache({
      edmResponse: cache.edmResponse,

      specialImportsResponse: cache.specialImportsResponse,

      vehicleJsonResponse: cache.vehicleJsonResponse,
    });

    console.log("✅ EDM cache saved to MongoDB.");
  } catch (error) {
    /*
     * MongoDB failure should not
     * invalidate a successful upstream
     * refresh.
     */

    console.error(
      "⚠️ Failed to save EDM cache to MongoDB:",
      error?.message || error,
    );
  }
};

// ============================================================
// REFRESH CACHE
// ============================================================

const refreshCache = async ({
  refreshEdm = false,
  refreshSpecialImports = false,
  refreshVehicleJson = false,
  forceAll = false,
} = {}) => {
  if (cachePromise) {
    return cachePromise;
  }

  cachePromise = (async () => {
    lastRefreshAttemptAt = Date.now();

    /*
     * Initial startup:
     *
     * Fetch everything.
     */

    if (forceAll) {
      refreshEdm = true;
      refreshSpecialImports = true;
      refreshVehicleJson = true;
    }

    /*
     * If either dealership is refreshing,
     * also refresh vehicle JSON so that
     * newly shuffled vehicles have their
     * latest display name / price / model.
     */

    if (refreshEdm || refreshSpecialImports) {
      refreshVehicleJson = true;
    }

    const requests = [];

    if (refreshEdm) {
      requests.push({
        type: "edm",
        promise: fetchJson(EDM_URL),
      });
    }

    if (refreshSpecialImports) {
      requests.push({
        type: "specialImports",
        promise: fetchJson(SPECIAL_IMPORTS_URL),
      });
    }

    if (refreshVehicleJson) {
      requests.push({
        type: "vehicleJson",
        promise: fetchJson(VEHICLE_JSON_URL),
      });
    }

    if (requests.length === 0) {
      return cache;
    }

    console.log(
      `🔄 Refreshing EDM cache: ${requests
        .map((item) => item.type)
        .join(", ")}`,
    );

    const results = await Promise.allSettled(
      requests.map((item) => item.promise),
    );

    let successfulUpdates = 0;

    results.forEach((result, index) => {
      const type = requests[index].type;

      if (result.status === "fulfilled") {
        successfulUpdates++;

        if (type === "edm") {
          cache.edmResponse = result.value;

          console.log("✅ EDM dealership cache refreshed.");
        }

        if (type === "specialImports") {
          cache.specialImportsResponse = result.value;

          console.log("✅ Special Imports cache refreshed.");
        }

        if (type === "vehicleJson") {
          cache.vehicleJsonResponse = result.value;

          console.log("✅ Vehicle JSON cache refreshed.");
        }
      } else {
        console.error(
          `❌ ${type} refresh failed:`,
          result.reason?.message || result.reason,
        );
      }
    });

    /*
     * Initial cache must be complete.
     */

    if (!hasUsableCache()) {
      throw new Error(
        `EDM cache is incomplete (${successfulUpdates}/${requests.length} requested sources succeeded).`,
      );
    }

    cacheUpdatedAt = Date.now();

    await saveCacheToMongoDB();

    console.log(
      `✅ EDM cache updated at ${formatCacheTimestamp(cacheUpdatedAt)}`,
    );

    return cache;
  })();

  try {
    return await cachePromise;
  } finally {
    cachePromise = null;
  }
};

// ============================================================
// GET CACHED DATA
// ============================================================

const getCachedData = async () => {
  /*
   * IMPORTANT:
   *
   * Load MongoDB lazily.
   *
   * index.js imports this router before
   * initDB() is called.
   */

  await loadCacheFromMongoDB();

  /*
   * ========================================================
   * INITIAL CACHE
   * ========================================================
   */

  if (!hasUsableCache()) {
    console.log(
      "No complete EDM cache available. Performing initial refresh...",
    );

    return refreshCache({
      forceAll: true,
    });
  }

  /*
   * ========================================================
   * SHUFFLE-BASED REFRESH
   * ========================================================
   *
   * This is the PRIMARY refresh mechanism.
   *
   * EDM and Special Imports are checked
   * independently.
   */

  const { refreshEdm, refreshSpecialImports } = getRequiredRefreshes();

  if (refreshEdm || refreshSpecialImports) {
    /*
     * IMPORTANT:
     *
     * We intentionally do NOT use the
     * 10-minute cooldown here.
     *
     * Once the shuffle timestamp is reached,
     * we immediately attempt the refresh.
     *
     * If it fails, the old `next` timestamp
     * remains in memory, so the next request
     * will try again.
     */

    try {
      return await refreshCache({
        refreshEdm,
        refreshSpecialImports,
      });
    } catch (error) {
      console.error("❌ Shuffle refresh failed:", error?.message || error);

      console.warn("Serving previous cached EDM data.");

      return cache;
    }
  }

  /*
   * ========================================================
   * NORMAL TTL FALLBACK
   * ========================================================
   *
   * This is NOT the normal refresh mechanism.
   *
   * It only exists as a safety net.
   */

  const now = Date.now();

  if (cacheUpdatedAt && now - cacheUpdatedAt < CACHE_TTL) {
    return cache;
  }

  /*
   * ========================================================
   * FAILED FALLBACK COOLDOWN
   * ========================================================
   */

  if (now - lastRefreshAttemptAt < FAILED_REFRESH_COOLDOWN) {
    console.warn(
      "EDM cache is stale, but fallback refresh cooldown is active. Serving cached data.",
    );

    return cache;
  }

  /*
   * ========================================================
   * FALLBACK REFRESH
   * ========================================================
   *
   * Nothing has shuffled, but cache is
   * older than 10 minutes.
   *
   * Refresh all sources.
   */

  try {
    return await refreshCache({
      forceAll: true,
    });
  } catch (error) {
    console.error("❌ EDM fallback refresh failed:", error?.message || error);

    return cache;
  }
};

// ============================================================
// VEHICLE LOOKUP
// ============================================================

const findVehicleByModel = (data, modelName) => {
  if (!data || !modelName) {
    return null;
  }

  const target = String(modelName).trim().toLowerCase();

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findVehicleByModel(item, modelName);

      if (found) {
        return found;
      }
    }

    return null;
  }

  if (typeof data !== "object") {
    return null;
  }

  const possibleModelNames = [
    data.modelName,
    data.model,
    data.vehicleModel,
    data.spawnName,
    data.spawn,
    data.name,
  ];

  const exactMatch = possibleModelNames.some(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim().toLowerCase() === target,
  );

  if (exactMatch) {
    return data;
  }

  for (const value of Object.values(data)) {
    if (value && typeof value === "object") {
      const found = findVehicleByModel(value, modelName);

      if (found) {
        return found;
      }
    }
  }

  return null;
};

// ============================================================
// VEHICLE DISPLAY NAME
// ============================================================

const getVehicleDisplayName = (vehicle, fallback) => {
  if (!vehicle) {
    return fallback;
  }

  return (
    vehicle.label ??
    vehicle.displayName ??
    vehicle.vehicleName ??
    vehicle.name ??
    fallback
  );
};

// ============================================================
// VEHICLE IMAGE MODEL NAME
// ============================================================

const getVehicleImageModelName = (vehicle, fallback) => {
  if (!vehicle) {
    return fallback;
  }

  return (
    vehicle.modelName ??
    vehicle.model ??
    vehicle.vehicleModel ??
    vehicle.spawnName ??
    vehicle.spawn ??
    fallback
  );
};

// ============================================================
// VEHICLE PRICE
// ============================================================

const getVehiclePrice = (vehicle) => {
  if (!vehicle || typeof vehicle !== "object") {
    return null;
  }

  const possiblePrices = [
    vehicle.price,
    vehicle.sellPrice,
    vehicle.salePrice,
    vehicle.cost,
    vehicle.value,
  ];

  for (const price of possiblePrices) {
    if (typeof price === "number" && Number.isFinite(price)) {
      return price;
    }

    if (
      typeof price === "string" &&
      price.trim() !== "" &&
      Number.isFinite(Number(price))
    ) {
      return Number(price);
    }
  }

  return null;
};

const formatPrice = (price) => {
  if (typeof price !== "number" || !Number.isFinite(price)) {
    return "";
  }

  return `₹${price.toLocaleString("en-IN")}`;
};

// ============================================================
// CAR CARD
// ============================================================

const renderCarCard = ({
  modelName,
  tier,
  stock,
  price = null,
  imageModelName = modelName,
}) => {
  const safeModelName = escapeHtml(modelName);

  const stockLabel =
    typeof stock === "number"
      ? `<span class="stock ${
          stock > 0 ? "available" : "empty"
        }">Stock: ${stock}</span>`
      : "";

  const priceLabel =
    typeof price === "number"
      ? `<span class="price">${escapeHtml(formatPrice(price))}</span>`
      : "";

  const imageHtml = imageModelName
    ? `
        <img
          src="${IMAGE_BASE_URL}/${tier}/${encodeURIComponent(
            imageModelName,
          )}.webp"
          alt="${safeModelName}"
          loading="lazy"
          onerror="this.closest('.car-card').classList.add('image-missing')"
        >
      `
    : "";

  return `
    <li class="car-card">
      ${imageHtml}

      <div>
        <strong>${safeModelName}</strong>
        ${priceLabel}
        ${stockLabel}
      </div>
    </li>
  `;
};

// ============================================================
// GLOBE ICON
// ============================================================

const globeIcon = `
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="12" cy="12" r="9"></circle>
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <path d="M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-6.3-3.8-9S9.5 5.7 12 3z"></path>
  </svg>
`;

// ============================================================
// ROUTE
// ============================================================

router.get("/", async (req, res) => {
  try {
    const { edmResponse, specialImportsResponse, vehicleJsonResponse } =
      await getCachedData();

    const edmRotation = edmResponse?.data?.rotation || [];

    const specialImportsRotation = specialImportsResponse?.data?.rotation || [];

    const edmNextShuffle = edmResponse?.data?.next || null;

    const specialImportsNextShuffle =
      specialImportsResponse?.data?.next || null;

    // ======================================================
    // EDM SHUFFLE
    // ======================================================

    const edmTierSections = tiers
      .map((tier) => {
        const cars = edmRotation
          .slice(tier.start, tier.end)
          .map((rotationModelName) => {
            const vehicle = findVehicleByModel(
              vehicleJsonResponse,
              rotationModelName,
            );

            if (vehicle) {
              const displayName = getVehicleDisplayName(
                vehicle,
                rotationModelName,
              );

              const imageModelName = getVehicleImageModelName(
                vehicle,
                rotationModelName,
              );

              const price = getVehiclePrice(vehicle);

              return renderCarCard({
                modelName: displayName,

                imageModelName,

                tier: tier.slug,

                price,
              });
            }

            return renderCarCard({
              modelName: rotationModelName,

              imageModelName: null,

              tier: tier.slug,

              price: null,
            });
          })
          .join("");

        return `
              <section class="tier-section">

                <div class="tier-heading">
                  <h3>${tier.name}</h3>

                  <span>
                    ${tier.end - tier.start} cars
                  </span>
                </div>

                <ol class="car-grid">
                  ${cars}
                </ol>

              </section>
            `;
      })
      .join("");

    // ======================================================
    // SPECIAL IMPORTS
    // ======================================================

    const specialImportCards = specialImportsRotation
      .map((car) => {
        const rotationModelName = car?.modelName;

        const vehicle = findVehicleByModel(
          vehicleJsonResponse,
          rotationModelName,
        );

        if (vehicle) {
          const displayName = getVehicleDisplayName(vehicle, rotationModelName);

          const imageModelName = getVehicleImageModelName(
            vehicle,
            rotationModelName,
          );

          const price = getVehiclePrice(vehicle);

          return renderCarCard({
            modelName: displayName,

            imageModelName,

            tier: "special",

            stock: car.stock,

            price,
          });
        }

        return renderCarCard({
          modelName: rotationModelName,

          imageModelName: null,

          tier: "special",

          stock: car.stock,

          price: null,
        });
      })
      .join("");

    // ======================================================
    // HTML
    // ======================================================

    res.send(`
<!DOCTYPE html>

<html>

<head>

  <title>
    Legacy India EDM Shuffle
  </title>

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >

  <style>

    * {
      box-sizing: border-box;
    }

    body {
      background: #101114;
      color: #eee;
      font: 16px Arial, sans-serif;
      margin: 0;
      min-height: 100vh;
      padding: 30px;
    }

    .container {
      max-width: 1180px;
      margin: 34px auto;
    }

    header {
      margin-bottom: 28px;
      padding-right: 10px;
    }

    h1,
    h2,
    h3,
    p {
      margin-top: 0;
    }

    h1 {
      color: #fff;
      font-size: 34px;
      margin-bottom: 8px;
    }

    h2 {
      font-size: 24px;
      margin-bottom: 16px;
    }

    h3 {
      font-size: 18px;
      margin-bottom: 0;
    }

    p {
      color: #b7bbc7;
      line-height: 1.5;
    }

    .cache-info {
      color: #8f98aa;
      font-size: 14px;
      margin-top: 10px;
    }

    .summary {
      display: grid;
      gap: 14px;
      grid-template-columns:
        repeat(
          auto-fit,
          minmax(220px, 1fr)
        );
      margin: 22px 0 32px;
    }

    .summary-item,
    .shuffle-section {
      background: #181a20;
      border: 1px solid #292d37;
      border-radius: 8px;
    }

    .summary-item {
      padding: 18px;
    }

    .summary-item span {
      color: #8f98aa;
      display: block;
      font-size: 13px;
      margin-bottom: 6px;
      text-transform: uppercase;
    }

    .summary-item strong {
      color: #fff;
      font-size: 18px;
    }

    .shuffle-section {
      margin-bottom: 24px;
      padding: 22px;
    }

    .section-title {
      align-items: center;
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .section-title h2 {
      margin: 0;
    }

    .json-link {
      align-items: center;
      background: #242832;
      border: 1px solid #343945;
      border-radius: 7px;
      color: #aeb6c6;
      display: inline-flex;
      height: 34px;
      justify-content: center;
      text-decoration: none;
      transition:
        background 0.2s,
        color 0.2s,
        border-color 0.2s;
      width: 34px;
    }

    .json-link:hover {
      background: #303541;
      border-color: #5865f2;
      color: #fff;
    }

    .json-link svg {
      height: 19px;
      width: 19px;
    }

    .tier-section {
      margin-top: 22px;
    }

    .tier-heading {
      align-items: center;
      border-bottom: 1px solid #2a2e38;
      display: flex;
      justify-content: space-between;
      margin-bottom: 14px;
      padding-bottom: 10px;
    }

    .tier-heading span {
      color: #a6adbb;
      font-size: 14px;
    }

    .car-grid {
      display: grid;
      gap: 14px;
      grid-template-columns:
        repeat(
          auto-fit,
          minmax(160px, 1fr)
        );
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .car-card {
      background: #20232b;
      border: 1px solid #303542;
      border-radius: 8px;
      min-height: 166px;
      overflow: hidden;
    }

    .car-card img {
      aspect-ratio: 16 / 9;
      background: #15171c;
      display: block;
      object-fit: cover;
      width: 100%;
    }

    .car-card.image-missing img {
      display: none;
    }

    .car-card div {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
    }

    .car-card strong {
      color: #fff;
      font-size: 15px;
      overflow-wrap: anywhere;
    }

    .price {
      color: #8fd3ff;
      font-size: 14px;
      font-weight: 600;
    }

    .stock {
      border-radius: 999px;
      color: #fff;
      display: inline-flex;
      font-size: 13px;
      padding: 5px 9px;
      width: fit-content;
    }

    .stock.available {
      background: #247a51;
    }

    .stock.empty {
      background: #7a2f35;
    }

    @media (max-width: 640px) {

      body {
        padding: 18px;
      }

      .container {
        margin-top: 20px;
      }

      h1 {
        font-size: 28px;
      }

      .shuffle-section {
        padding: 16px;
      }

    }

  </style>

</head>

<body>

  <main class="container">

    <header>

      <h1>
        Legacy India EDM Shuffle
      </h1>

      <p>
        Latest dealership rotations from the
        Legacy India EDM and Special Imports routes.
      </p>

      <div class="cache-info">

        Last updated:

        <strong>
          ${formatCacheTimestamp(cacheUpdatedAt)}
        </strong>

        · Refreshes automatically when either shuffle updates

      </div>

    </header>

    <section
      class="summary"
      aria-label="Shuffle timing"
    >

      <div class="summary-item">

        <span>
          EDM Next Shuffle
        </span>

        <strong>
          ${formatTimestamp(edmNextShuffle)}
        </strong>

      </div>

      <div class="summary-item">

        <span>
          Special Imports Next Shuffle
        </span>

        <strong>
          ${formatTimestamp(specialImportsNextShuffle)}
        </strong>

      </div>

      <div class="summary-item">

        <span>
          Special Imports
        </span>

        <strong>
          ${specialImportsResponse?.data?.enabled ? "Enabled" : "Disabled"}
        </strong>

      </div>

    </section>

    <section class="shuffle-section">

      <div class="section-title">

        <h2>
          EDM Shuffle
        </h2>

        <a
          class="json-link"
          href="${EDM_URL}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open EDM JSON"
          title="Open EDM JSON"
        >
          ${globeIcon}
        </a>

      </div>

      ${edmTierSections}

    </section>

    <section class="shuffle-section">

      <div class="section-title">

        <h2>
          Special Import Shuffle
        </h2>

        <a
          class="json-link"
          href="${SPECIAL_IMPORTS_URL}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open Special Imports JSON"
          title="Open Special Imports JSON"
        >
          ${globeIcon}
        </a>

      </div>

      <ol class="car-grid">

        ${specialImportCards}

      </ol>

    </section>

  </main>

</body>

</html>
      `);
  } catch (error) {
    console.error("Error loading Legacy India EDM shuffle:", error);

    res.status(500).send("Error loading Legacy India EDM shuffle.");
  }
});

export default router;

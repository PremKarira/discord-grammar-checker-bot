import { Router } from "express";

const router = Router();

const EDM_URL =
  "https://p372.fivem.opfw.me/op-framework/exclusiveDealership.json";

const SPECIAL_IMPORTS_URL =
  "https://p372.fivem.opfw.me/op-framework/specialImportsDealership.json";

const VEHICLE_JSON_URL = "https://edm.shrt.day/json";

const IMAGE_BASE_URL = "https://edm.shrt.day/images";

// Cache for 10 minutes
const CACHE_TTL = 10 * 60 * 1000;

let cache = null;
let cacheUpdatedAt = null;
let cachePromise = null;

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

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatTimestamp = (timestamp) => {
  if (!timestamp) return "Unknown";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(timestamp * 1000));
};

const formatCacheTimestamp = (timestamp) => {
  if (!timestamp) return "Unknown";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(timestamp));
};

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },

    // Prevent an upstream request from hanging forever.
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(
      `Request failed for ${url}: ${response.status}`,
    );
  }

  return response.json();
};

/*
 * Fetch all upstream data.
 *
 * The promise is shared between simultaneous requests so if
 * 100 users hit the page at exactly the same time, only ONE
 * refresh is performed.
 */
const refreshCache = async () => {
  if (cachePromise) {
    return cachePromise;
  }

  cachePromise = (async () => {
    const [
      edmResponse,
      specialImportsResponse,
      vehicleJsonResponse,
    ] = await Promise.all([
      fetchJson(EDM_URL),
      fetchJson(SPECIAL_IMPORTS_URL),
      fetchJson(VEHICLE_JSON_URL),
    ]);

    cache = {
      edmResponse,
      specialImportsResponse,
      vehicleJsonResponse,
    };

    cacheUpdatedAt = Date.now();

    console.log(
      `EDM cache updated at ${formatCacheTimestamp(cacheUpdatedAt)}`,
    );

    return cache;
  })();

  try {
    return await cachePromise;
  } finally {
    cachePromise = null;
  }
};

/*
 * Return cached data if it is still valid.
 *
 * If there is no cache, fetch immediately.
 *
 * If the cache is expired:
 * - Try refreshing it.
 * - If refresh fails but old cache exists, continue serving
 *   the old data instead of returning an error.
 */
const getCachedData = async () => {
  const now = Date.now();

  if (
    cache &&
    cacheUpdatedAt &&
    now - cacheUpdatedAt < CACHE_TTL
  ) {
    return cache;
  }

  try {
    return await refreshCache();
  } catch (error) {
    console.error(
      "EDM cache refresh failed:",
      error,
    );

    // Keep serving old data if available.
    if (cache) {
      console.warn(
        "Serving stale EDM cache because refresh failed.",
      );

      return cache;
    }

    throw error;
  }
};

/*
 * Recursively search the vehicle JSON for an exact model match.
 */
const findVehicleByModel = (data, modelName) => {
  if (!data || !modelName) return null;

  const target = String(modelName)
    .trim()
    .toLowerCase();

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findVehicleByModel(
        item,
        modelName,
      );

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
      String(value)
        .trim()
        .toLowerCase() === target,
  );

  if (exactMatch) {
    return data;
  }

  for (const value of Object.values(data)) {
    if (
      value &&
      typeof value === "object"
    ) {
      const found = findVehicleByModel(
        value,
        modelName,
      );

      if (found) {
        return found;
      }
    }
  }

  return null;
};

/*
 * Get the proper human-readable vehicle name.
 *
 * Example:
 *
 * {
 *   "label": "2001 Bavaria EM3",
 *   "modelName": "eforty6"
 * }
 *
 * Display:
 *   2001 Bavaria EM3
 *
 * NOT:
 *   eforty6
 */
const getVehicleDisplayName = (
  vehicle,
  fallback,
) => {
  if (!vehicle) return fallback;

  return (
    vehicle.label ??
    vehicle.displayName ??
    vehicle.vehicleName ??
    vehicle.name ??
    fallback
  );
};

/*
 * Get the internal model/spawn name.
 *
 * This is used for the vehicle image URL.
 *
 * Example:
 *
 * label    -> 2001 Bavaria EM3
 * modelName -> eforty6
 *
 * Display uses label.
 * Image uses modelName.
 */
const getVehicleImageModelName = (
  vehicle,
  fallback,
) => {
  if (!vehicle) return fallback;

  return (
    vehicle.modelName ??
    vehicle.model ??
    vehicle.vehicleModel ??
    vehicle.spawnName ??
    vehicle.spawn ??
    fallback
  );
};

const getVehiclePrice = (vehicle) => {
  if (
    !vehicle ||
    typeof vehicle !== "object"
  ) {
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
    if (
      typeof price === "number" &&
      Number.isFinite(price)
    ) {
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
  if (
    typeof price !== "number" ||
    !Number.isFinite(price)
  ) {
    return "";
  }

  return `₹${price.toLocaleString("en-IN")}`;
};

const renderCarCard = ({
  modelName,
  tier,
  stock,
  price = null,
  imageModelName = modelName,
}) => {
  const safeModelName = escapeHtml(
    modelName,
  );

  const stockLabel =
    typeof stock === "number"
      ? `<span class="stock ${
          stock > 0
            ? "available"
            : "empty"
        }">Stock: ${stock}</span>`
      : "";

  const priceLabel =
    typeof price === "number"
      ? `<span class="price">${escapeHtml(
          formatPrice(price),
        )}</span>`
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

router.get("/", async (req, res) => {
  try {
    const {
      edmResponse,
      specialImportsResponse,
      vehicleJsonResponse,
    } = await getCachedData();

    const edmRotation =
      edmResponse?.data?.rotation || [];

    const specialImportsRotation =
      specialImportsResponse?.data?.rotation || [];

    const edmNextShuffle =
      edmResponse?.data?.next || null;

    const specialImportsNextShuffle =
      specialImportsResponse?.data?.next || null;

    /*
     * EDM SHUFFLE
     *
     * For every EDM rotation vehicle:
     *
     * - Find the vehicle in vehicle JSON.
     * - Display vehicle.label.
     * - Display vehicle.price.
     * - Use vehicle.modelName for the image.
     *
     * Example JSON:
     *
     * {
     *   "label": "2001 Bavaria EM3",
     *   "price": 250000,
     *   "modelName": "eforty6"
     * }
     *
     * Result:
     *
     * 2001 Bavaria EM3
     * ₹2,50,000
     *
     * Image:
     * /images/respected/eforty6.webp
     */
    const edmTierSections = tiers
      .map((tier) => {
        const cars = edmRotation
          .slice(tier.start, tier.end)
          .map((rotationModelName) => {
            const vehicle =
              findVehicleByModel(
                vehicleJsonResponse,
                rotationModelName,
              );

            if (vehicle) {
              const displayName =
                getVehicleDisplayName(
                  vehicle,
                  rotationModelName,
                );

              const imageModelName =
                getVehicleImageModelName(
                  vehicle,
                  rotationModelName,
                );

              const price =
                getVehiclePrice(vehicle);

              return renderCarCard({
                modelName: displayName,
                imageModelName,
                tier: tier.slug,
                price,
              });
            }

            /*
             * Vehicle was not found in vehicle JSON.
             * Fall back to the original EDM rotation name.
             */
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
              <span>${tier.end - tier.start} cars</span>
            </div>

            <ol class="car-grid">
              ${cars}
            </ol>
          </section>
        `;
      })
      .join("");

    /*
     * SPECIAL IMPORTS
     *
     * If found in vehicle JSON:
     * - Display name comes from "label"
     * - Price comes from "price"
     * - Image uses "modelName"
     * - Stock comes from Special Imports rotation
     *
     * Example:
     *
     * {
     *   "label": "2001 Bavaria EM3",
     *   "price": 250000,
     *   "modelName": "eforty6"
     * }
     *
     * Display:
     * 2001 Bavaria EM3
     *
     * Price:
     * ₹2,50,000
     *
     * Image:
     * /images/special/eforty6.webp
     */
    const specialImportCards =
      specialImportsRotation
        .map((car) => {
          const rotationModelName =
            car?.modelName;

          const vehicle =
            findVehicleByModel(
              vehicleJsonResponse,
              rotationModelName,
            );

          if (vehicle) {
            const displayName =
              getVehicleDisplayName(
                vehicle,
                rotationModelName,
              );

            const imageModelName =
              getVehicleImageModelName(
                vehicle,
                rotationModelName,
              );

            const price =
              getVehiclePrice(vehicle);

            return renderCarCard({
              modelName: displayName,
              imageModelName,
              tier: "special",
              stock: car.stock,
              price,
            });
          }

          /*
           * Vehicle was not found in vehicle JSON.
           * Fall back to the original Special Imports name.
           */
          return renderCarCard({
            modelName: rotationModelName,
            imageModelName: null,
            stock: car.stock,
            price: null,
          });
        })
        .join("");

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Legacy India EDM Shuffle</title>

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
              grid-template-columns: repeat(
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
              grid-template-columns: repeat(
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
              <h1>Legacy India EDM Shuffle</h1>

              <p>
                Latest dealership rotations from the
                Legacy India EDM and Special Imports routes.
              </p>

              <div class="cache-info">
                Last updated:
                <strong>
                  ${formatCacheTimestamp(
                    cacheUpdatedAt,
                  )}
                </strong>
                · Cache refreshes every 10 minutes
              </div>
            </header>

            <section
              class="summary"
              aria-label="Shuffle timing"
            >

              <div class="summary-item">
                <span>EDM Next Shuffle</span>

                <strong>
                  ${formatTimestamp(
                    edmNextShuffle,
                  )}
                </strong>
              </div>

              <div class="summary-item">
                <span>
                  Special Imports Next Shuffle
                </span>

                <strong>
                  ${formatTimestamp(
                    specialImportsNextShuffle,
                  )}
                </strong>
              </div>

              <div class="summary-item">
                <span>Special Imports</span>

                <strong>
                  ${
                    specialImportsResponse?.data
                      ?.enabled
                      ? "Enabled"
                      : "Disabled"
                  }
                </strong>
              </div>

            </section>

            <section class="shuffle-section">

              <div class="section-title">
                <h2>EDM Shuffle</h2>

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
                <h2>Special Import Shuffle</h2>

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
  } catch (err) {
    console.error(
      "Error loading Legacy India EDM shuffle:",
      err,
    );

    res
      .status(500)
      .send(
        "Error loading Legacy India EDM shuffle.",
      );
  }
});

export default router;

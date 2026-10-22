import Hospital from "../models/Hospital.js";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
];
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 18000;
const SEARCH_RADIUS_METERS = 50000;
const PHOTO_ENRICHMENT_LIMIT = 12;
const GOOGLE_PHOTO_SEARCH_LIMIT = 4;
const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
const GENERIC_NAME_WORDS = new Set([
  "hospital",
  "hospitals",
  "medical",
  "centre",
  "center",
  "clinic",
  "the",
  "institute",
  "and",
  "of",
  "india",
]);

function userAgent() {
  return (
    process.env.HOSPITAL_DIRECTORY_USER_AGENT?.trim() ||
    "MediGuide/1.0 (educational hospital directory prototype)"
  );
}

function normalizeCity(value) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function nameWords(value) {
  return value
    .toLocaleLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !GENERIC_NAME_WORDS.has(word));
}

function nameMatch(title, words) {
  const normalized = title.toLocaleLowerCase();
  const matchedWords = words.filter((word) => normalized.includes(word)).length;
  return {
    matchedWords,
    score: words.length ? matchedWords / words.length : 0,
  };
}

async function findWikipediaHospitalImage(hospitalName, city) {
  try {
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrsearch", `"${hospitalName}" ${city} India hospital`);
    url.searchParams.set("gsrnamespace", "0");
    url.searchParams.set("gsrlimit", "8");
    url.searchParams.set("prop", "pageimages");
    url.searchParams.set("piprop", "thumbnail");
    url.searchParams.set("pithumbsize", "900");

    const response = await fetch(url, {
      headers: { "User-Agent": userAgent(), Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return "";

    const data = await response.json();
    const words = nameWords(hospitalName);
    if (!words.length) return "";

    const candidates = Object.values(data.query?.pages || {})
      .map((page) => ({ page, ...nameMatch(page.title || "", words) }))
      .filter(
        ({ page, matchedWords, score }) =>
          matchedWords >= Math.min(2, words.length) &&
          score >= 0.5 &&
          page.thumbnail?.source
      )
      .sort(
        (a, b) => b.score - a.score || b.matchedWords - a.matchedWords
      );

    return candidates[0]?.page.thumbnail.source || "";
  } catch (error) {
    console.warn(
      `Wikipedia image lookup failed for "${hospitalName}": ${error.message}`
    );
    return "";
  }
}

async function findCommonsHospitalImage(hospitalName, city) {
  try {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrsearch", `${hospitalName} ${city}`);
    url.searchParams.set("gsrnamespace", "6");
    url.searchParams.set("gsrlimit", "20");
    url.searchParams.set("prop", "imageinfo");
    url.searchParams.set("iiprop", "url|mime");
    url.searchParams.set("iiurlwidth", "900");

    const response = await fetch(url, {
      headers: { "User-Agent": userAgent(), Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return "";

    const data = await response.json();
    const words = nameWords(hospitalName);
    if (!words.length) return "";

    const candidates = Object.values(data.query?.pages || {})
      .map((page) => ({
        page,
        ...nameMatch((page.title || "").replace(/^File:/i, ""), words),
      }))
      .filter(
        ({ page, matchedWords, score }) =>
          matchedWords >= Math.min(2, words.length) &&
          score >= 0.5 &&
          page.imageinfo?.[0]?.thumburl &&
          /^image\//i.test(page.imageinfo[0].mime || "")
      )
      .sort(
        (a, b) => b.score - a.score || b.matchedWords - a.matchedWords
      );

    return candidates[0]?.page.imageinfo[0].thumburl || "";
  } catch (error) {
    console.warn(
      `Wikimedia image lookup failed for "${hospitalName}": ${error.message}`
    );
    return "";
  }
}

function safeImageUrl(value, commonsValue) {
  for (const candidate of [value, commonsValue]) {
    if (typeof candidate !== "string" || !candidate.trim()) continue;
    const raw = candidate.trim();

    // Some OSM image tags contain a Commons filename instead of a URL.
    if (!/^[a-z][a-z\d+.-]*:/i.test(raw)) {
      const fileMatch = raw.match(
        /^(?:File:)?(.+\.(?:jpe?g|png|gif|webp|svg|tiff?))$/i
      );
      if (fileMatch && !/[<>\u0000-\u001f]/.test(fileMatch[1])) {
        return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
          fileMatch[1]
        )}?width=900`;
      }
    }

    try {
      const url = new URL(raw);
      if (url.protocol !== "https:") continue;

      // Convert a Commons file page (HTML) into its actual file redirect.
      if (url.hostname === "commons.wikimedia.org") {
        const title = url.pathname.match(/^\/wiki\/(?:File|Image):(.+)$/i)?.[1];
        if (title) {
          return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
            decodeURIComponent(title)
          )}?width=900`;
        }
      }
      return url.toString();
    } catch {
      // Ignore malformed image tags and try the next candidate.
    }
  }
  return "";
}

async function findGooglePhotoForHospital(hospital, city) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) return "";

  const ignoredWords = new Set([
    ...GENERIC_NAME_WORDS,
    "best",
    "multispeciality",
    "speciality",
    ...normalizeCity(city).split(" "),
  ]);
  const targetWords = hospital.name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !ignoredWords.has(word));
  if (!targetWords.length) return "";

  const compactName = targetWords.join(" ");
  const queries = [
    ...new Set([
      `${hospital.name} ${city} India`,
      `${compactName} hospital ${city} India`,
    ]),
  ];

  try {
    const places = [];
    for (const textQuery of queries) {
      const response = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.photos,places.googleMapsUri",
          },
          body: JSON.stringify({
            textQuery,
            languageCode: "en",
            regionCode: "IN",
            pageSize: 5,
          }),
          signal: AbortSignal.timeout(10000),
        }
      );
      if (!response.ok) continue;

      const data = await response.json();
      places.push(...(data.places || []));
      const matchingPhotoExists = places.some((place) => {
        const match = nameMatch(place.displayName?.text || "", targetWords);
        return (
          Boolean(place.photos?.[0]?.name) &&
          match.matchedWords > 0 &&
          match.score >= 0.34
        );
      });
      if (matchingPhotoExists) break;
    }

    const candidates = places
      .map((place) => ({
        place,
        ...nameMatch(place.displayName?.text || "", targetWords),
      }))
      .filter(
        ({ place, matchedWords, score }) =>
          place.photos?.[0]?.name && matchedWords > 0 && score >= 0.34
      )
      .sort(
        (a, b) => b.score - a.score || b.matchedWords - a.matchedWords
      );

    const photo = candidates[0]?.place.photos?.[0];
    if (!photo?.name) return "";
    hospital.photoAttributions = (photo.authorAttributions || []).map((item) => ({
      name: item.displayName || "Photo contributor",
      uri: item.uri || "",
    }));
    return `/api/hospitals/photo?name=${encodeURIComponent(photo.name)}`;
  } catch (error) {
    console.warn(
      `Google photo search failed for "${hospital.name}": ${error.message}`
    );
    return "";
  }
}

async function searchGoogleHospitals(city, center) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) return null;

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.photos,places.googleMapsUri",
      },
      body: JSON.stringify({
        textQuery: `hospitals in ${city}, India`,
        languageCode: "en",
        regionCode: "IN",
        pageSize: 20,
        locationBias: {
          circle: {
            center: { latitude: center.lat, longitude: center.lon },
            radius: SEARCH_RADIUS_METERS,
          },
        },
      }),
      signal: AbortSignal.timeout(15000),
    }
  );

  if (response.status === 429) {
    console.warn(
      "Google Places search quota is exhausted; using OpenStreetMap instead."
    );
    return null;
  }
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 250).replace(/\s+/g, " ");
    throw new Error(
      `Google Places returned HTTP ${response.status}${
        detail ? `: ${detail}` : ""
      }`
    );
  }

  const data = await response.json();
  return (data.places || [])
    .filter((place) => {
      const lat = Number(place.location?.latitude);
      const lon = Number(place.location?.longitude);
      return (
        place.id &&
        place.displayName?.text &&
        Number.isFinite(lat) &&
        Number.isFinite(lon)
      );
    })
    .map((place) => {
      const photo = place.photos?.[0];
      return {
        id: `google:${place.id}`,
        osmId: `google:${place.id}`,
        name: place.displayName.text,
        address: place.formattedAddress || city,
        city,
        cityKey: normalizeCity(city),
        state: "",
        location: {
          type: "Point",
          coordinates: [
            Number(place.location.longitude),
            Number(place.location.latitude),
          ],
        },
        imageUrl: photo?.name
          ? `/api/hospitals/photo?name=${encodeURIComponent(photo.name)}`
          : "",
        photoAttributions: (photo?.authorAttributions || []).map((item) => ({
          name: item.displayName || "Photo contributor",
          uri: item.uri || "",
        })),
        source: "Google Places",
        sourceUrl:
          place.googleMapsUri ||
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${place.displayName.text} ${city}`
          )}`,
      };
    });
}

export async function getGoogleHospitalPhoto(req, res) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  const photoName = typeof req.query.name === "string" ? req.query.name : "";

  if (!apiKey) {
    return res.status(503).json({
      message: "Google Places photo integration is not configured.",
    });
  }
  if (
    photoName.length > 1024 ||
    !/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_.:-]+$/.test(photoName)
  ) {
    return res.status(400).json({ message: "Invalid photo reference." });
  }

  try {
    const url = new URL(`https://places.googleapis.com/v1/${photoName}/media`);
    url.searchParams.set("maxWidthPx", "900");
    url.searchParams.set("key", apiKey);
    const response = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      redirect: "follow",
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 180).replace(/\s+/g, " ");
      console.error("Google Places photo endpoint returned", response.status, detail);
      return res.status(502).json({
        message: `Google photo request failed (HTTP ${response.status}). Check Places API, billing, and key restrictions.`,
      });
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return res.status(502).json({
        message: "Google photo endpoint did not return an image.",
      });
    }
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_PHOTO_BYTES) {
      return res.status(502).json({ message: "Google photo is too large to display." });
    }

    const image = Buffer.from(await response.arrayBuffer());
    if (image.length > MAX_PHOTO_BYTES) {
      return res.status(502).json({ message: "Google photo is too large to display." });
    }

    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=3600");
    res.set("X-Content-Type-Options", "nosniff");
    return res.status(200).send(image);
  } catch (error) {
    console.error("Google hospital photo request failed:", error.message);
    return res.status(502).json({
      message: "Google photo service is temporarily unavailable.",
    });
  }
}

async function geocodeCity(city) {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", `${city}, India`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("countrycodes", "in");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: { "User-Agent": userAgent(), Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    throw new Error(`City lookup returned HTTP ${response.status}`);
  }

  const results = await response.json();
  if (!Array.isArray(results) || !results.length) return null;
  const lat = Number(results[0].lat);
  const lon = Number(results[0].lon);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

async function fetchOpenStreetMapHospitals(city, center) {
  const query = `[out:json][timeout:20];(nwr["amenity"="hospital"](around:${SEARCH_RADIUS_METERS},${center.lat},${center.lon});nwr["healthcare"="hospital"](around:${SEARCH_RADIUS_METERS},${center.lat},${center.lon}););out center;`;
  let payload;
  let lastError;

  for (const endpoint of OVERPASS_URLS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": userAgent(),
          Accept: "application/json",
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 180).replace(/\s+/g, " ");
        throw new Error(
          `Hospital data service returned HTTP ${response.status}${
            detail ? `: ${detail}` : ""
          }`
        );
      }
      payload = await response.json();
      break;
    } catch (error) {
      lastError = error;
      console.warn(
        `Hospital provider ${new URL(endpoint).hostname} failed:`,
        error.message
      );
    }
  }

  if (!payload) {
    throw new Error(
      `All hospital data providers failed: ${lastError?.message || "unknown error"}`
    );
  }

  const records = [];
  for (const item of payload.elements || []) {
    const tags = item.tags || {};
    const name =
      [tags.name, tags["name:en"], tags.official_name, tags.short_name]
        .find((value) => typeof value === "string" && value.trim())
        ?.trim() || "";
    const lat = Number(item.lat ?? item.center?.lat);
    const lon = Number(item.lon ?? item.center?.lon);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const osmId = `${item.type}/${item.id}`;
    const address = [
      tags["addr:housenumber"],
      tags["addr:street"],
      tags["addr:suburb"],
      tags["addr:city"] || city,
      tags["addr:state"],
      tags["addr:postcode"],
    ]
      .filter(Boolean)
      .join(", ");

    records.push({
      osmId,
      name,
      address: address || city,
      city: tags["addr:city"] || city,
      cityKey: normalizeCity(city),
      state: tags["addr:state"] || "",
      location: { type: "Point", coordinates: [lon, lat] },
      imageUrl: safeImageUrl(
        tags.image || tags["contact:image"] || tags["website:image"],
        tags.wikimedia_commons
      ),
      source: "OpenStreetMap",
      sourceUrl: `https://www.openstreetmap.org/${item.type}/${item.id}`,
      lastFetchedAt: new Date(),
    });
  }
  return records;
}

async function enrichHospitalPhotos(hospitals, city, includeGoogleSearch = false) {
  const candidates = hospitals
    .filter((hospital) => !hospital.imageUrl)
    .slice(0, PHOTO_ENRICHMENT_LIMIT);
  const updated = [];

  for (let index = 0; index < candidates.length; index += 4) {
    await Promise.all(
      candidates.slice(index, index + 4).map(async (hospital, offset) => {
        let imageUrl = "";
        if (
          includeGoogleSearch &&
          index + offset < GOOGLE_PHOTO_SEARCH_LIMIT
        ) {
          imageUrl = await findGooglePhotoForHospital(hospital, city);
        }
        if (!imageUrl) {
          imageUrl =
            (await findWikipediaHospitalImage(hospital.name, hospital.city || city)) ||
            (await findCommonsHospitalImage(hospital.name, hospital.city || city));
        }
        if (imageUrl) {
          hospital.imageUrl = imageUrl;
          updated.push(hospital);
        }
      })
    );
  }
  return updated;
}

export async function searchHospitals(req, res) {
  const city = typeof req.query.city === "string" ? req.query.city.trim() : "";
  const name = typeof req.query.name === "string" ? req.query.name.trim() : "";
  if (!city) {
    return res.status(400).json({ message: "Please enter a city in India." });
  }
  if (city.length > 100 || name.length > 100) {
    return res.status(400).json({
      message: "Search values must be 100 characters or fewer.",
    });
  }

  const cityKey = normalizeCity(city);
  let center = null;

  try {
    // Prefer live Google Places listings when configured. Google data is not
    // persisted to the OpenStreetMap cache.
    if (process.env.GOOGLE_PLACES_API_KEY?.trim()) {
      try {
        center = await geocodeCity(city);
        if (!center) {
          return res.status(404).json({
            message: "City not found. Try another Indian city.",
          });
        }

        const googleResults = await searchGoogleHospitals(city, center);
        if (googleResults !== null) {
          let results = googleResults;
          if (name) {
            const term = name.toLocaleLowerCase();
            results = results.filter((hospital) =>
              hospital.name.toLocaleLowerCase().includes(term)
            );
          }

          await enrichHospitalPhotos(results, city, true);
          return res.status(200).json({
            city,
            count: results.length,
            results,
            source: "Google Places",
            cached: false,
            staleCacheFallback: false,
            notice:
              "Hospital listings and photos are provided by Google Places. Photo contributor attributions are shown where supplied. Confirm details with the hospital before visiting.",
          });
        }
      } catch (error) {
        // A Google configuration/quota outage should not disable the OSM directory.
        console.warn("Google hospital search failed; using OpenStreetMap:", error.message);
      }
    }

    const freshSince = new Date(Date.now() - CACHE_TTL_MS);
    const forceRefresh = req.query.refresh === "1";
    const cached = forceRefresh
      ? []
      : await Hospital.find({ cityKey, lastFetchedAt: { $gte: freshSince } })
          .sort({ name: 1 })
          .limit(200)
          .lean();

    let hospitals = cached;
    let usedCache = cached.length > 0;
    let staleCacheFallback = false;

    if (!usedCache) {
      try {
        center = center || (await geocodeCity(city));
        if (!center) {
          return res.status(404).json({
            message: "City not found. Try another Indian city.",
          });
        }

        const records = await fetchOpenStreetMapHospitals(city, center);
        if (records.length) {
          await Hospital.bulkWrite(
            records.map((record) => ({
              updateOne: {
                filter: { osmId: record.osmId },
                update: { $set: record },
                upsert: true,
              },
            })),
            { ordered: false }
          );
          hospitals = await Hospital.find({ cityKey })
            .sort({ name: 1 })
            .limit(200)
            .lean();
        } else {
          hospitals = [];
        }
      } catch (providerError) {
        // Keep the directory useful during provider outages and label old data.
        const stale = await Hospital.find({ cityKey })
          .sort({ name: 1 })
          .limit(200)
          .lean();
        if (!stale.length) throw providerError;
        hospitals = stale;
        usedCache = true;
        staleCacheFallback = true;
        console.warn(
          `Using ${stale.length} cached hospital records for ${city}; live refresh failed.`
        );
      }
    }

    if (name) {
      const term = name.toLocaleLowerCase();
      hospitals = hospitals.filter((hospital) =>
        hospital.name.toLocaleLowerCase().includes(term)
      );
    }

    if (!staleCacheFallback) {
      const updatedPhotos = await enrichHospitalPhotos(hospitals, city);
      const photoWrites = updatedPhotos
        .filter((hospital) => hospital._id)
        .map((hospital) => ({
          updateOne: {
            filter: { _id: hospital._id },
            update: { $set: { imageUrl: hospital.imageUrl } },
          },
        }));
      if (photoWrites.length) {
        try {
          await Hospital.bulkWrite(photoWrites, { ordered: false });
        } catch (error) {
          // Photo caching is optional; never discard valid hospital listings.
          console.warn("Unable to cache hospital photos:", error.message);
        }
      }
    }

    return res.status(200).json({
      city,
      count: hospitals.length,
      results: hospitals.map((hospital) => {
        const { _id, __v, ...record } = hospital;
        return { ...record, id: hospital.osmId, source: "OpenStreetMap" };
      }),
      source: "OpenStreetMap",
      cached: usedCache,
      staleCacheFallback,
      notice: staleCacheFallback
        ? "Live map data could not be refreshed. These cached OpenStreetMap listings may be outdated; verify details with the hospital. A listing does not confirm current services or appointment availability."
        : "OpenStreetMap listings may be incomplete or outdated and cover a search radius of about 50 km. A listing does not confirm current services or appointment availability.",
    });
  } catch (error) {
    console.error("Hospital search failed:", error.message);
    return res.status(502).json({
      message:
        "Live hospital data providers are temporarily unavailable. No sample or dummy hospitals were substituted. Please try again shortly.",
    });
  }
}

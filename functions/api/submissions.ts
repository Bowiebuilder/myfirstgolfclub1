/**
 * Cloudflare Pages Function: /api/submissions
 * - GET: list approved submissions as JSON
 * - POST: create submission (auto-approve = 1 so pins show immediately)
 */
export const onRequestGet: PagesFunction = async ({ env }) => {
  const db = env.DB as D1Database;
  const { results } = await db
    .prepare(`SELECT id, firstName, lastInitial, city, country, homeCountry, firstGolfClub,
                     firstRoundDate, startedYear,
                     ageWhenStarted, dreamCourse, howGotIntoGolf, story,
                     lat, lng, created_at
              FROM submissions
              WHERE approved = 1
              ORDER BY created_at DESC
              LIMIT 2000`)
    .all();

  return new Response(JSON.stringify(results ?? []), {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=60" },
  });
};

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const db = env.DB as D1Database;

    // --- Turnstile verify ---
    const form = await request.formData();
    const turnstileToken = form.get("cf-turnstile-response")?.toString() || "";
    const ip = request.headers.get("CF-Connecting-IP") || "";
    const body = new URLSearchParams({
      secret: env.TURNSTILE_SECRET as string,
      response: turnstileToken,
      remoteip: ip,
    });

    const verifyResp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const verifyJson = await verifyResp.json();
    if (!verifyJson.success) {
      return new Response(JSON.stringify({ error: "Turnstile verification failed" }), { status: 400 });
    }

    // --- Fields ---
    const s = (k: string) => (form.get(k)?.toString() ?? "").trim();

    const firstName       = s("firstName");
    const lastInitial     = s("lastInitial");
    const homeCountry     = s("homeCountry");   // user's home country (flag)
    const city            = s("city");
    const country         = s("country");       // course location country
    const firstGolfClub   = s("firstGolfClub");

    const startedYear     = s("startedYear");   // YYYY (new)
    const ageWhenStarted  = s("ageWhenStarted");
    const dreamCourse     = s("dreamCourse");
    const howGotIntoGolf  = s("howGotIntoGolf");
    const moment          = s("moment");        // maps to 'story' column

    const latStr          = s("lat");
    const lngStr          = s("lng");
    const consentMapPin   = s("consentMapPin"); // "on" if checked

    // Basic validation
    if (!firstName || !homeCountry || !country || !firstGolfClub) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }
    if (consentMapPin !== "on") {
      return new Response(JSON.stringify({ error: "Consent required for map pin" }), { status: 400 });
    }

    if (startedYear) {
      const yrOk = /^\d{4}$/.test(startedYear) && +startedYear >= 1900 && +startedYear <= new Date().getFullYear();
      if (!yrOk) {
        return new Response(JSON.stringify({ error: "Invalid year (use YYYY)" }), { status: 400 });
      }
    }

    if (ageWhenStarted && !/^\d{1,3}$/.test(ageWhenStarted)) {
      return new Response(JSON.stringify({ error: "Invalid age" }), { status: 400 });
    }

    const lat = Number(latStr);
    const lng = Number(lngStr);
    const latSafe = Number.isFinite(lat) ? lat : null;
    const lngSafe = Number.isFinite(lng) ? lng : null;

    // Insert (auto-approve). We keep firstRoundDate for legacy; store null for new flow.
    const stmt = db.prepare(`
      INSERT INTO submissions
      (firstName, lastInitial, city, country, homeCountry, firstGolfClub,
       firstRoundDate, startedYear,
       ageWhenStarted, dreamCourse, howGotIntoGolf, story,
       lat, lng, approved, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
    `);

    await stmt.bind(
      firstName, lastInitial || null, city || null, country, homeCountry,
      firstGolfClub,
      startedYear || null,
      ageWhenStarted || null, dreamCourse || null, howGotIntoGolf || null, moment || null,
      latSafe, lngSafe
    ).run();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "server_error", detail: err?.message || "" }), { status: 500 });
  }
};

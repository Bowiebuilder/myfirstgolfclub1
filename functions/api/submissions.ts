export const onRequestGet = async ({ env }: any) => {
  try {
    const db = (env as any).DB;
    if (!db) {
      return new Response(JSON.stringify({ error: "DB binding missing (env.DB)" }), { status: 500 });
    }

    const q = `
      SELECT
        id,
        created_at,
        name            AS firstName,
        last_initial    AS lastInitial,
        city,
        country,
        course_name     AS firstGolfClub,
        first_round_date AS firstRoundDate,
        startedYear,
        homeCountry,
        story,
        lat,
        lng
      FROM submissions
      WHERE status = 'approved'
      ORDER BY created_at DESC
      LIMIT 1000
    `;
    const { results } = await db.prepare(q).all();
    return new Response(JSON.stringify(results || []), {
      headers: { "content-type": "application/json", "cache-control": "public, max-age=60" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "server_error", detail: err?.message || String(err) }), { status: 500 });
  }
};

export const onRequestPost = async ({ request, env, cf }: any) => {
  try {
    const db = (env as any).DB;
    if (!db) {
      return new Response(JSON.stringify({ error: "DB binding missing (env.DB)" }), { status: 500 });
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(JSON.stringify({ error: "Expected multipart/form-data" }), { status: 400 });
    }

    const form = await request.formData();

    // --- Turnstile verification (skip if secret missing to avoid lockouts) ---
    const secret = (env as any).TURNSTILE_SECRET;
    const token = form.get("cf-turnstile-response")?.toString() || "";
    if (secret) {
      const ip =
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-forwarded-for") ||
        "";
      const verifyBody = new URLSearchParams({ secret, response: token, remoteip: ip });
      const verifyResp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: verifyBody,
      });
      const verifyJson = await verifyResp.json();
      if (!verifyJson.success) {
        return new Response(JSON.stringify({ error: "Turnstile verification failed" }), { status: 400 });
      }
    }

    // Helpers
    const s = (k: string) => (form.get(k)?.toString() ?? "").trim();
    const firstName     = s("firstName");
    const lastInitial   = s("lastInitial");
    const city          = s("city");
    const country       = s("country");        // course location country
    const homeCountry   = s("homeCountry");    // player flag
    const firstGolfClub = s("firstGolfClub");
    const startedYear   = s("startedYear");    // YYYY (optional)
    const moment        = s("moment");         // store into 'story'
    const latStr        = s("lat");
    const lngStr        = s("lng");
    const consentMapPin = s("consentMapPin");  // "on" if checked

    // Required fields (match your UI)
    if (!firstName || !homeCountry || !country || !firstGolfClub) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }
    if (consentMapPin !== "on") {
      return new Response(JSON.stringify({ error: "Consent required for map pin" }), { status: 400 });
    }

    // startedYear validation (optional)
    if (startedYear) {
      const now = new Date();
      const maxYear = now.getFullYear() + 1; // allow current and next year
      const y = Number(startedYear);
      if (!/^\d{4}$/.test(startedYear) || y < 1900 || y > maxYear) {
        return new Response(JSON.stringify({ error: `Invalid year (use YYYY between 1900 and ${maxYear})` }), { status: 400 });
      }
    }

    const lat = Number(latStr);
    const lng = Number(lngStr);
    const latSafe = Number.isFinite(lat) ? lat : null;
    const lngSafe = Number.isFinite(lng) ? lng : null;

    // Generate a UUID for id (table has TEXT PRIMARY KEY without default)
    const id = (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random()}`;

    // Insert using CURRENT SCHEMA column names
    const stmt = db.prepare(`
      INSERT INTO submissions
      (id, name, last_initial, city, country, course_name,
       first_round_date, story, photo_key, lat, lng, status, homeCountry, startedYear, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, ?, 'approved', ?, ?, datetime('now'))
    `);

    await stmt
      .bind(
        id,
        firstName,
        lastInitial || null,
        city || null,
        country,
        firstGolfClub,
        moment || null,
        latSafe,
        lngSafe,
        homeCountry || null,
        startedYear || null
      )
      .run();

    return new Response(JSON.stringify({ ok: true, id }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "server_error", detail: err?.message || String(err) }), { status: 500 });
  }
};

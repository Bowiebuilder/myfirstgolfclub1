export const onRequestGet: PagesFunction = async ({ env }) => {
  try {
    const db = (env as any).DB as D1Database;
    const { results } = await db
      .prepare("SELECT id, created_at, name, last_initial, city, country, course_name, first_round_date, story, lat, lng, status, homeCountry, startedYear FROM submissions WHERE status = 'approved' ORDER BY created_at DESC LIMIT 1000;")
      .all();

    // Map DB columns -> frontend keys
    const mapped = (results || []).map((r: any) => ({
      id: r.id,
      created_at: r.created_at,
      firstName: r.name || "",
      lastInitial: r.last_initial || "",
      city: r.city || "",
      country: r.country || "",
      firstGolfClub: r.course_name || "",
      firstRoundDate: r.first_round_date || null, // legacy
      startedYear: r.startedYear || null,         // preferred
      story: r.story || "",
      lat: typeof r.lat === "number" ? r.lat : null,
      lng: typeof r.lng === "number" ? r.lng : null,
      homeCountry: r.homeCountry || null,
      status: r.status || "pending",
    }));

    return new Response(JSON.stringify(mapped), {
      headers: { "content-type": "application/json", "cache-control": "public, max-age=60" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "server_error", detail: err?.message || "" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};

export const onRequestPost: PagesFunction = async ({ request, env, cf }) => {
  try {
    const db = (env as any).DB as D1Database;
    const ip = cf?.connectingIP || "0.0.0.0";

    // Parse body (multipart/form-data)
    const form = await request.formData();

    // Turnstile verification
    const token = form.get("cf-turnstile-response")?.toString() ?? "";
    const secret = (env as any).TURNSTILE_SECRET || "";
    if (!secret) {
      return new Response(JSON.stringify({ error: "server_error", detail: "TURNSTILE_SECRET not set" }), { status: 500 });
    }
    const body = new URLSearchParams({ secret, response: token, remoteip: ip });
    const verifyResp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const verifyJson = await verifyResp.json();
    if (!verifyJson.success) {
      return new Response(JSON.stringify({ error: "Turnstile verification failed" }), { status: 400 });
    }

    // Helpers
    const s = (k: string) => (form.get(k)?.toString() ?? "").trim();

    // Fields (align to your table)
    const firstName     = s("firstName");      // -> name
    const lastInitial   = s("lastInitial");    // -> last_initial
    const city          = s("city");
    const country       = s("country");
    const homeCountry   = s("homeCountry");    // -> homeCountry
    const firstGolfClub = s("firstGolfClub");  // -> course_name
    const startedYear   = s("startedYear");    // -> startedYear (YYYY)
    const story         = s("moment") || s("story"); // -> story (new field 'moment' or legacy 'story')
    const latStr        = s("lat");
    const lngStr        = s("lng");
    const consent       = s("consentMapPin");  // must be "on"

    // Required validations
    if (!firstName || !country || !firstGolfClub) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }
    if (consent !== "on") {
      return new Response(JSON.stringify({ error: "Consent required for map pin" }), { status: 400 });
    }
    if (startedYear && !/^\d{4}$/.test(startedYear)) {
      return new Response(JSON.stringify({ error: "Invalid year (use YYYY)" }), { status: 400 });
    }

    const lat = Number(latStr);
    const lng = Number(lngStr);
    const latSafe = Number.isFinite(lat) ? lat : null;
    const lngSafe = Number.isFinite(lng) ? lng : null;

    // Insert into your exact columns; auto-approve with status='approved'
    const stmt = db.prepare(`
      INSERT INTO submissions
      (id, created_at, name, last_initial, city, country, course_name,
       first_round_date, story, photo_key, lat, lng, status, homeCountry, startedYear)
      VALUES (lower(hex(randomblob(16))), datetime('now'),
              ?, ?, ?, ?, ?,
              NULL, ?, NULL, ?, ?, 'approved', ?, ?)
    `);

    await stmt.bind(
      firstName, lastInitial || null, city || null, country, firstGolfClub,
      story || null, latSafe, lngSafe, homeCountry || null, startedYear || null
    ).run();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "server_error", detail: err?.message || "" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};

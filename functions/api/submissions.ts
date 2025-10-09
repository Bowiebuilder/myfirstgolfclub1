// Minimal, production-minded handler for GET/POST /api/submissions
export const onRequest: PagesFunction<{
  DB: D1Database;
  BUCKET: R2Bucket;
  TURNSTILE_SECRET_KEY: string;
}> = async (ctx) => {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  if (method === 'GET') {
    const country = url.searchParams.get('country') ?? undefined;
    const q = country ? `WHERE status='approved' AND country=?` : `WHERE status='approved'`;
    const params = country ? [country] : [];
    const rows = await env.DB.prepare(`SELECT id, name, last_initial, city, country, course_name, first_round_date, story, photo_key, lat, lng FROM submissions ${q} ORDER BY created_at DESC LIMIT 1000`).bind(...params).all();
    return new Response(JSON.stringify(rows.results), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' } });
  }

  if (method === 'POST') {
    try {
      // Turnstile verification
      const form = await request.formData();
      const token = form.get('cf-turnstile-response');
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: String(token || '') })
      });
      const verifyJson: any = await verifyRes.json();
      if (!verifyJson.success) {
        return new Response(JSON.stringify({ error: 'turnstile_failed' }), { status: 400 });
      }

      const id = crypto.randomUUID();
      const payload = {
        name: String(form.get('firstName') || form.get('name') || '').slice(0, 80),
        last_initial: String(form.get('lastInitial') || '').slice(0, 3),
        city: String(form.get('city') || '').slice(0, 120),
        country: String(form.get('country') || '').slice(0, 120),
        course_name: String(form.get('firstGolfClub') || form.get('course') || '').slice(0, 180),
        first_round_date: String(form.get('firstRoundDate') || form.get('monthYear') || ''),
        story: String(form.get('story') || '').slice(0, 2000),
        lat: form.get('lat') ? Number(form.get('lat')) : null,
        lng: form.get('lng') ? Number(form.get('lng')) : null,
      };

      // Optional photo upload
      let photo_key: string | null = null;
      const file = form.get('photo');
      if (file && typeof file !== 'string') {
        const arrayBuffer = await (file as File).arrayBuffer();
        photo_key = `submissions/${id}/${(file as File).name}`;
        await env.BUCKET.put(photo_key, arrayBuffer, {
          httpMetadata: { contentType: (file as File).type },
        });
      }

      await env.DB.prepare(
        `INSERT INTO submissions (id, name, last_initial, city, country, course_name, first_round_date, story, photo_key, lat, lng, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
      ).bind(id, payload.name, payload.last_initial, payload.city, payload.country, payload.course_name, payload.first_round_date, payload.story, photo_key, payload.lat, payload.lng).run();

      return new Response(JSON.stringify({ id, status: 'pending' }), { headers: { 'Content-Type': 'application/json' } });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: 'server_error', message: String(err?.message || err) }), { status: 500 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
};
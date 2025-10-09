export const onRequestGet: PagesFunction = async ({ env }) => {
  try {
    const db = (env as any).DB as D1Database | undefined;
    if (!db) {
      return new Response(
        JSON.stringify({ ok: false, reason: "DB binding missing. Add D1 binding with variable name DB in Pages → Settings → Functions." }, null, 2),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }
    const tableInfo = await db.prepare("PRAGMA table_info(submissions);").all();
    return new Response(
      JSON.stringify({ ok: true, columns: tableInfo?.results ?? [] }, null, 2),
      { headers: { "content-type": "application/json", "cache-control": "no-store" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || String(err) }, null, 2), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};

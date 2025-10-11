export const onRequestGet: PagesFunction = async ({ env }) => {
  const token = (env as any).MAPBOX_PUBLIC_TOKEN || "";
  const ok = !!token;
  return new Response(JSON.stringify({ ok, token: ok ? token : null }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    status: ok ? 200 : 200
  });
};

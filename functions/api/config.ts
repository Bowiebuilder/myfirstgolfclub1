export const onRequestGet: PagesFunction = async ({ env }) => {
  const token = (env as any)?.MAPBOX_TOKEN || "";
  return new Response(JSON.stringify({ mapboxToken: token }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};

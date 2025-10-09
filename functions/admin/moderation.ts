export const onRequest: PagesFunction<{ DB: D1Database; ADMIN_API_KEY: string; }> = async (ctx) => {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const key = request.headers.get('x-admin-key');
  if (key !== env.ADMIN_API_KEY) return new Response('Forbidden', { status: 403 });

  const id = url.searchParams.get('id');
  const action = url.searchParams.get('action'); // 'approve' | 'reject'
  if (!id || !action) return new Response('Bad Request', { status: 400 });

  if (action === 'approve' || action === 'reject') {
    await env.DB.prepare(`UPDATE submissions SET status=? WHERE id=?`).bind(action === 'approve' ? 'approved' : 'rejected', id).run();
    return new Response(JSON.stringify({ id, status: action === 'approve' ? 'approved' : 'rejected' }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response('Bad Request', { status: 400 });
};
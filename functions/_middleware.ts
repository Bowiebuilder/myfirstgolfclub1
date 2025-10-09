export const onRequest: PagesFunction = async (context) => {
  const { request, next } = context;
  const url = new URL(request.url);
  if (url.pathname.includes('.') || url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin/')) {
    return next();
  }
  if (url.pathname !== '/') {
    const indexUrl = new URL('/', request.url);
    return fetch(indexUrl.toString());
  }
  return next();
};
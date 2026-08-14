/** Plain-text error responses shared by the route handlers. */

export function unauthorized() {
  return new Response("Unauthorized", { status: 401 });
}

export function notFound() {
  return new Response("Not found", { status: 404 });
}

/**
 * 校验 ingest 请求的密钥。若设置了 INGEST_SECRET，请求须在 header
 * `x-ingest-secret` 或 query `?secret=` 中携带匹配值。未设置则放行。
 */
export function isIngestAuthorized(request: Request): boolean {
  const secret = process.env.INGEST_SECRET;
  if (!secret) return true;
  const url = new URL(request.url);
  const provided =
    request.headers.get("x-ingest-secret") ?? url.searchParams.get("secret");
  return provided === secret;
}

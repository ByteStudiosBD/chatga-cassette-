import { env } from "cloudflare:workers";

type RuntimeEnv = { BUCKET?: R2Bucket };

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const bucket = (env as unknown as RuntimeEnv).BUCKET;
  if (!bucket) return new Response("Storage unavailable", { status: 503 });
  const object = await bucket.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}

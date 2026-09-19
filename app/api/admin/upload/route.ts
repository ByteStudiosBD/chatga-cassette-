import { env } from "cloudflare:workers";
import { requireAdminApi } from "@/lib/admin-auth";

type RuntimeEnv = { BUCKET?: R2Bucket };

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (!admin.ok) return Response.json({ error: "আবার লগইন করুন" }, { status: admin.status });
  const bucket = (env as unknown as RuntimeEnv).BUCKET;
  if (!bucket) return Response.json({ error: "Upload storage পাওয়া যাচ্ছে না" }, { status: 503 });
  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "");
  if (!(file instanceof File) || !["image", "audio"].includes(kind)) {
    return Response.json({ error: "সঠিক file নির্বাচন করুন" }, { status: 400 });
  }
  const validType = kind === "image" ? file.type.startsWith("image/") : file.type.startsWith("audio/") || file.name.toLowerCase().endsWith(".mp3");
  const maxSize = kind === "image" ? 10 * 1024 * 1024 : 30 * 1024 * 1024;
  if (!validType) return Response.json({ error: kind === "image" ? "শুধু image upload করুন" : "শুধু audio/MP3 upload করুন" }, { status: 415 });
  if (file.size > maxSize) return Response.json({ error: kind === "image" ? "Image 10 MB-এর মধ্যে রাখুন" : "Audio 30 MB-এর মধ্যে রাখুন" }, { status: 413 });
  const extension = file.name.includes(".") ? file.name.split(".").pop()!.replace(/[^a-z0-9]/gi, "").toLowerCase() : kind === "image" ? "webp" : "mp3";
  const key = `${kind}-${crypto.randomUUID()}.${extension || "bin"}`;
  await bucket.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type || undefined } });
  return Response.json({ key, url: `/api/media/${encodeURIComponent(key)}` }, { status: 201 });
}

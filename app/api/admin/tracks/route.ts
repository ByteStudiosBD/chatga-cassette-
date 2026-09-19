import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { tracks } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (!admin.ok) return Response.json({ error: "আবার লগইন করুন" }, { status: admin.status });
  const body = (await request.json()) as { title?: string; artist?: string; fileKey?: string };
  if (!body.title?.trim() || !body.fileKey) return Response.json({ error: "গানের নাম ও file প্রয়োজন" }, { status: 400 });
  const [latest] = await getDb().select({ sortOrder: tracks.sortOrder }).from(tracks).orderBy(desc(tracks.sortOrder)).limit(1);
  const [track] = await getDb().insert(tracks).values({
    title: body.title.trim(), artist: body.artist?.trim() ?? "", fileKey: body.fileKey,
    sortOrder: (latest?.sortOrder ?? 0) + 1, isActive: true,
  }).returning();
  return Response.json({ track }, { status: 201 });
}

export async function DELETE(request: Request) {
  const admin = await requireAdminApi();
  if (!admin.ok) return Response.json({ error: "আবার লগইন করুন" }, { status: admin.status });
  const { id } = (await request.json()) as { id?: number };
  if (!id) return Response.json({ error: "Track পাওয়া যায়নি" }, { status: 400 });
  await getDb().delete(tracks).where(eq(tracks.id, id));
  return Response.json({ ok: true });
}

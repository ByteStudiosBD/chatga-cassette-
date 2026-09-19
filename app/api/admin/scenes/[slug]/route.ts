import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { scenes } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const admin = await requireAdminApi();
  if (!admin.ok) return Response.json({ error: "আবার লগইন করুন" }, { status: admin.status });
  const { slug } = await params;
  const body = (await request.json()) as {
    title?: string; subtitle?: string; imageUrl?: string; imageKey?: string | null;
    ambienceKey?: string | null; sortOrder?: number; isActive?: boolean;
  };
  const title = body.title?.trim() ?? "";
  if (!title) return Response.json({ error: "Page-এর নাম প্রয়োজন" }, { status: 400 });
  const values = {
    slug,
    title,
    subtitle: body.subtitle?.trim() ?? "",
    imageUrl: body.imageUrl ?? "",
    imageKey: body.imageKey ?? null,
    ambienceKey: body.ambienceKey ?? null,
    sortOrder: Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : 0,
    isActive: body.isActive !== false,
    updatedAt: sql`CURRENT_TIMESTAMP`,
  };
  await getDb().insert(scenes).values(values).onConflictDoUpdate({ target: scenes.slug, set: values });
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const admin = await requireAdminApi();
  if (!admin.ok) return Response.json({ error: "আবার লগইন করুন" }, { status: admin.status });
  const { slug } = await params;
  await getDb().delete(scenes).where(eq(scenes.slug, slug));
  return Response.json({ ok: true });
}

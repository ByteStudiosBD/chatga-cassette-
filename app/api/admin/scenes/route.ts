import { getDb } from "@/db";
import { scenes } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";

function cleanSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);
}

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (!admin.ok) return Response.json({ error: "আবার লগইন করুন" }, { status: admin.status });
  const body = (await request.json()) as { title?: string; slug?: string; subtitle?: string; sortOrder?: number };
  const title = body.title?.trim() ?? "";
  const slug = cleanSlug(body.slug || title);
  if (!title || !slug) return Response.json({ error: "নাম এবং URL প্রয়োজন" }, { status: 400 });
  try {
    await getDb().insert(scenes).values({
      slug,
      title,
      subtitle: body.subtitle?.trim() ?? "",
      imageUrl: "/scenes/hatchi-bhabchi.webp",
      sortOrder: Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : 99,
      isActive: true,
    });
    return Response.json({ ok: true, slug }, { status: 201 });
  } catch (error) {
    console.error("Unable to create scene", error);
    return Response.json({ error: "এই URL-এ আগে থেকেই একটি page আছে" }, { status: 409 });
  }
}

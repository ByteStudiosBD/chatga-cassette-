import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { adminSecurity } from "@/db/schema";
import { currentPasswordHash, hashPassword, requireAdminApi, verifyPassword } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (!admin.ok) return Response.json({ error: "আবার লগইন করুন" }, { status: admin.status });
  const body = (await request.json()) as { currentPassword?: string; newPassword?: string };
  if (!body.currentPassword || !(await verifyPassword(body.currentPassword, await currentPasswordHash()))) {
    return Response.json({ error: "বর্তমান পাসওয়ার্ডটি সঠিক নয়" }, { status: 401 });
  }
  if (!body.newPassword || body.newPassword.length < 10) {
    return Response.json({ error: "নতুন পাসওয়ার্ড অন্তত ১০ অক্ষরের হতে হবে" }, { status: 400 });
  }
  const passwordHash = await hashPassword(body.newPassword);
  await getDb().insert(adminSecurity).values({ id: 1, passwordHash, updatedAt: sql`CURRENT_TIMESTAMP` })
    .onConflictDoUpdate({ target: adminSecurity.id, set: { passwordHash, updatedAt: sql`CURRENT_TIMESTAMP` } });
  return Response.json({ ok: true });
}

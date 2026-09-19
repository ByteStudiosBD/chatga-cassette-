import { currentPasswordHash, getOwner, setAdminSession, verifyPassword } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const owner = await getOwner();
  if (!owner.ok) return Response.json({ error: "অনুমতি নেই" }, { status: owner.status });
  const body = (await request.json()) as { password?: string };
  if (!body.password || !(await verifyPassword(body.password, await currentPasswordHash()))) {
    return Response.json({ error: "পাসওয়ার্ডটি সঠিক নয়" }, { status: 401 });
  }
  await setAdminSession(owner.user.userId);
  return Response.json({ ok: true });
}

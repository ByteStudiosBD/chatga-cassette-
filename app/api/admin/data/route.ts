import { requireAdminApi } from "@/lib/admin-auth";
import { getAllScenes, getTracks } from "@/lib/data";

export async function GET() {
  const admin = await requireAdminApi();
  if (!admin.ok) return Response.json({ error: "আবার লগইন করুন" }, { status: admin.status });
  const [scenes, tracks] = await Promise.all([getAllScenes(), getTracks()]);
  return Response.json({ scenes, tracks });
}

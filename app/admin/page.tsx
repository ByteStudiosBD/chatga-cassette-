import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { hasAdminSession, isAdminOwner } from "@/lib/admin-auth";
import { AdminClient } from "./admin-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  if (!isAdminOwner(user)) {
    return <main className="admin-shell"><div className="admin-login"><h1>এই দরজাটা ব্যক্তিগত</h1><p>শুধু website owner এই dashboard খুলতে পারবেন।</p><a className="text-primary" href="/">হোমে ফিরুন</a></div></main>;
  }
  return <AdminClient initialSession={await hasAdminSession(user.userId)} ownerName={user.displayName} />;
}

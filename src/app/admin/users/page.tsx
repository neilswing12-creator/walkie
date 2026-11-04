import { getCurrentUser } from "@/lib/auth/session";
import { UsersAdmin } from "@/components/admin/UsersAdmin";
export const metadata = { title: "Users" };
export default async function Page() { const me = (await getCurrentUser())!; return <UsersAdmin myRole={me.role} myId={me.id} />; }

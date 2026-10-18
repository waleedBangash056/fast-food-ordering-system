import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/server-guard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getStaffSession();

  if (!session) {
    redirect("/admin/orders");
  }

  if (session.role === "ADMIN" || session.role === "SUPER_ADMIN") {
    redirect("/admin/menu");
  }

  if (session.role === "KITCHEN_OPERATOR") {
    redirect("/admin/kitchen");
  }

  // Front counter STAFF and branch managers default to the Orders master register
  redirect("/admin/orders");
}

import React from "react";
import { AdminShell } from "./admin-shell";
import { getStaffSession } from "@/lib/auth/server-guard";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getStaffSession();
  return <AdminShell initialSession={session}>{children}</AdminShell>;
}

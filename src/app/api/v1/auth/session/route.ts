import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decodeStaffSession, isDemoAuthEnabled } from "@/lib/auth/session";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ss_staff_session")?.value;
  const demoModeEnabled = isDemoAuthEnabled();

  if (!token) {
    return NextResponse.json({
      success: true,
      data: null,
      authenticated: false,
      demoModeEnabled,
    });
  }

  const session = decodeStaffSession(token);
  if (!session) {
    return NextResponse.json({
      success: true,
      data: null,
      authenticated: false,
      demoModeEnabled,
    });
  }

  return NextResponse.json({
    success: true,
    data: session,
    authenticated: true,
    demoModeEnabled,
  });
}


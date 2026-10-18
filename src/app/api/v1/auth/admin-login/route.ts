import { NextResponse } from "next/server";
import { authenticateStaffCredentials, encodeStaffSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors/app-error";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, secret } = body;

    if (!identifier || !secret) {
      return NextResponse.json(
        { success: false, error: { message: "Identifier and secret/PIN required" } },
        { status: 400 }
      );
    }

    const session = await authenticateStaffCredentials(identifier, secret);
    const token = encodeStaffSession(session);

    const response = NextResponse.json({
      success: true,
      data: session,
      message: `Verified and authenticated as ${session.role}`,
    });

    response.cookies.set("ss_staff_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    const err = error as AppError;
    return NextResponse.json(
      { success: false, error: { message: err.message || "Authentication failed" } },
      { status: err.statusCode || 401 }
    );
  }
}

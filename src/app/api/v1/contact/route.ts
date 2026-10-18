import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { contactService } from "@/server/domains/contact/contact-service";
import { AppError } from "@/lib/errors/app-error";

const ContactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email address"),
  message: z.string().trim().min(5, "Message must be at least 5 characters").max(2000),
});

export async function GET() {
  const supported = contactService.isSubmissionSupported();
  return NextResponse.json({
    data: {
      submissionSupported: supported,
      directChannels: {
        phone: "(555) 234-5678",
        email: "support@smashandsizzle.com",
        kitchenHours: "Mon–Thu: 11:00 AM – 10:30 PM | Fri–Sat: 11:00 AM – Midnight | Sun: 11:30 AM – 10:00 PM",
      },
      notice: supported
        ? undefined
        : "Web form submission is currently paused pending email gateway integration. Please reach out directly via email or phone.",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = ContactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid contact input.",
          },
        },
        { status: 400 }
      );
    }

    const result = await contactService.submitInquiry({
      name: parsed.data.name,
      email: parsed.data.email,
      message: parsed.data.message,
    });

    return NextResponse.json({
      data: {
        success: true,
        inquiryId: result.inquiry.id,
        message: "Thank you for reaching out. Your inquiry has been received and logged. For immediate kitchen assistance, please call (555) 234-5678.",
        provider: result.providerName,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: error.statusCode }
      );
    }

    console.error("[Contact Route Error]", error);
    return NextResponse.json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Unable to process contact inquiry. Please try again later or call our kitchen directly at (555) 234-5678.",
        },
      },
      { status: 500 }
    );
  }
}


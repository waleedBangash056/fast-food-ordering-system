export type ErrorCode =
  | "VALIDATION_ERROR"
  | "MODIFIER_RULE_VIOLATION"
  | "INVALID_COUPON"
  | "MINIMUM_ORDER_NOT_MET"
  | "DELIVERY_NOT_SERVICEABLE"
  | "BRANCH_CLOSED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "RATE_LIMITED"
  | "CONFIG_ERROR"
  | "PAYMENT_PROVIDER_DISABLED"
  | "PAYMENT_SIMULATION_FORBIDDEN"
  | "WEBHOOK_SIGNATURE_MISSING"
  | "WEBHOOK_CONFIG_ERROR"
  | "WEBHOOK_SIGNATURE_INVALID"
  | "WEBHOOK_PROVIDER_UNSUPPORTED"
  | "PAYMENT_AMOUNT_MISMATCH"
  | "PAYMENT_CURRENCY_MISMATCH"
  | "DATABASE_UNAVAILABLE"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_SERVER_ERROR";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, statusCode: number = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details || {},
      },
    };
  }
}

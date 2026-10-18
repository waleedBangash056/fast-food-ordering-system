import crypto from "node:crypto";
import { AppError } from "@/lib/errors/app-error";

export type StaffRole =
  | "GUEST"
  | "CUSTOMER"
  | "STAFF"
  | "KITCHEN_OPERATOR"
  | "BRANCH_MANAGER"
  | "CONTENT_MANAGER"
  | "ADMIN"
  | "SUPER_ADMIN";

export interface StaffSession {
  userId: string;
  fullName: string;
  email: string;
  role: StaffRole;
  branchId: string;
  branchName: string;
  expiresAt: number;
}

export interface StaffAccount {
  userId: string;
  fullName: string;
  email: string;
  password: string;
  pin: string;
  role: StaffRole;
  branchId: string;
  branchName: string;
  prodPasswordEnvKey: string;
  prodPasswordAliasEnvKey?: string;
  prodEmailEnvKey: string;
  prodEmailAliasEnvKey?: string;
}

const DEV_FALLBACK_SESSION_SECRET =
  "dev_only_smash_sizzle_hmac_secret_do_not_use_in_prod_32c";

/**
 * Unconditionally false when NODE_ENV === "production", even if ALLOW_DEMO_STAFF_LOGIN=true is set.
 */
export function isDemoAuthEnabled(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  if (process.env.ALLOW_DEMO_STAFF_LOGIN === "true") return true;
  if (process.env.ALLOW_DEMO_STAFF_LOGIN === "false") return false;
  return true;
}

function getSessionSigningSecret(): string | null {
  const configured = process.env.SESSION_SECRET?.trim();
  if (configured && configured.length >= 32) {
    return configured;
  }
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  return configured || DEV_FALLBACK_SESSION_SECRET;
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function hashPasswordScrypt(password: string, saltHex?: string): string {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifyPasswordSecret(configuredSecret: string, candidatePassword: string): boolean {
  if (configuredSecret.startsWith("scrypt$")) {
    const parts = configuredSecret.split("$");
    if (parts.length !== 3) return false;
    const [, saltHex, expectedKeyHex] = parts;
    if (!saltHex || !expectedKeyHex) return false;
    try {
      const saltBuf = Buffer.from(saltHex, "hex");
      const expectedBuf = Buffer.from(expectedKeyHex, "hex");
      const derivedBuf = crypto.scryptSync(candidatePassword, saltBuf, expectedBuf.length);
      if (derivedBuf.length !== expectedBuf.length) return false;
      return crypto.timingSafeEqual(derivedBuf, expectedBuf);
    } catch {
      return false;
    }
  }
  return timingSafeStringEqual(configuredSecret, candidatePassword);
}

export const STAFF_ACCOUNTS: StaffAccount[] = [
  {
    userId: "usr-admin-1",
    fullName: "Alex Morgan",
    email: "admin@smashsizzle.com",
    password: "admin123",
    pin: "9999",
    role: "ADMIN",
    branchId: "all",
    branchName: "All Flagship Branches",
    prodPasswordEnvKey: "ADMIN_PASSWORD",
    prodEmailEnvKey: "ADMIN_EMAIL",
  },
  {
    userId: "usr-chef-1",
    fullName: "Chef Marco",
    email: "chef@smashsizzle.com",
    password: "kitchen123",
    pin: "1111",
    role: "KITCHEN_OPERATOR",
    branchId: "branch-1",
    branchName: "Downtown Flagship",
    prodPasswordEnvKey: "KITCHEN_OPERATOR_PASSWORD",
    prodPasswordAliasEnvKey: "KITCHEN_PASSWORD",
    prodEmailEnvKey: "KITCHEN_OPERATOR_EMAIL",
    prodEmailAliasEnvKey: "KITCHEN_EMAIL",
  },
  {
    userId: "usr-mgr-1",
    fullName: "Sarah Jenkins",
    email: "manager@smashsizzle.com",
    password: "manager123",
    pin: "2222",
    role: "BRANCH_MANAGER",
    branchId: "branch-1",
    branchName: "Downtown Flagship",
    prodPasswordEnvKey: "BRANCH_MANAGER_PASSWORD",
    prodPasswordAliasEnvKey: "MANAGER_PASSWORD",
    prodEmailEnvKey: "BRANCH_MANAGER_EMAIL",
    prodEmailAliasEnvKey: "MANAGER_EMAIL",
  },
  {
    userId: "usr-staff-1",
    fullName: "Dave Wilson",
    email: "staff@smashsizzle.com",
    password: "staff123",
    pin: "3333",
    role: "STAFF",
    branchId: "branch-1",
    branchName: "Downtown Flagship",
    prodPasswordEnvKey: "STAFF_PASSWORD",
    prodEmailEnvKey: "STAFF_EMAIL",
  },
];

function resolveConfiguredEnvValue(primaryKey: string, aliasKey?: string): string | undefined {
  const primary = process.env[primaryKey]?.trim();
  if (primary && primary.length > 0) return primary;
  if (aliasKey) {
    const alias = process.env[aliasKey]?.trim();
    if (alias && alias.length > 0) return alias;
  }
  return undefined;
}

export async function authenticateStaffCredentials(
  identifier: string,
  secret: string
): Promise<StaffSession> {
  const cleanId = identifier.trim().toLowerCase();
  const cleanSecret = secret.trim();

  if (!cleanId || !cleanSecret) {
    throw new AppError(
      "UNAUTHORIZED",
      "Invalid operational credentials or PIN. Access denied.",
      401
    );
  }

  const demoAllowed = isDemoAuthEnabled();

  for (const account of STAFF_ACCOUNTS) {
    const configuredEmail = resolveConfiguredEnvValue(
      account.prodEmailEnvKey,
      account.prodEmailAliasEnvKey
    )?.toLowerCase();
    const expectedEmail = configuredEmail || account.email.toLowerCase();
    const matchesIdentity =
      expectedEmail === cleanId ||
      (demoAllowed &&
        (account.email.toLowerCase() === cleanId ||
          account.fullName.toLowerCase() === cleanId));

    if (!matchesIdentity) continue;

    const prodPassword = resolveConfiguredEnvValue(
      account.prodPasswordEnvKey,
      account.prodPasswordAliasEnvKey
    );

    if (!demoAllowed) {
      // Production mode: ONLY accept strong password or scrypt hash configured via environment variable.
      // Demo passwords ("admin123") and demo PINs ("9999") are strictly rejected.
      if (!prodPassword || prodPassword.length < 8) {
        throw new AppError(
          "UNAUTHORIZED",
          "Account credentials are not provisioned for production login. Access denied.",
          401
        );
      }

      if (verifyPasswordSecret(prodPassword, cleanSecret)) {
        return {
          userId: account.userId,
          fullName: account.fullName,
          email: expectedEmail,
          role: account.role,
          branchId: account.branchId,
          branchName: account.branchName,
          expiresAt: Date.now() + 12 * 60 * 60 * 1000,
        };
      }
    } else {
      // Non-production / explicit demo mode
      const validSecrets = [account.password, account.pin];
      if (prodPassword) validSecrets.push(prodPassword);

      if (validSecrets.some((candidate) => verifyPasswordSecret(candidate, cleanSecret))) {
        return {
          userId: account.userId,
          fullName: account.fullName,
          email: expectedEmail,
          role: account.role,
          branchId: account.branchId,
          branchName: account.branchName,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        };
      }
    }
  }

  throw new AppError(
    "UNAUTHORIZED",
    "Invalid operational credentials or PIN. Access denied.",
    401
  );
}

export const ROLE_CAPABILITIES: Record<string, StaffRole[]> = {
  MENU_WRITE: ["ADMIN", "SUPER_ADMIN"],
  MENU_READ: [
    "STAFF",
    "KITCHEN_OPERATOR",
    "BRANCH_MANAGER",
    "CONTENT_MANAGER",
    "ADMIN",
    "SUPER_ADMIN",
  ],
  KITCHEN_TERMINAL: ["KITCHEN_OPERATOR", "BRANCH_MANAGER", "ADMIN", "SUPER_ADMIN"],
  ORDER_STATUS_UPDATE: [
    "STAFF",
    "KITCHEN_OPERATOR",
    "BRANCH_MANAGER",
    "ADMIN",
    "SUPER_ADMIN",
  ],
  AUDIT_VIEW: ["BRANCH_MANAGER", "ADMIN", "SUPER_ADMIN"],
  BRANCH_MANAGE: ["BRANCH_MANAGER", "ADMIN", "SUPER_ADMIN"],
};

export function isRoleAuthorized(role: StaffRole, capability: string): boolean {
  const allowed = ROLE_CAPABILITIES[capability];
  if (!allowed) return false;
  return allowed.includes(role);
}

function computeHmacBase64Url(payloadB64Url: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payloadB64Url, "utf8")
    .digest("base64url");
}

export function encodeStaffSession(session: StaffSession): string {
  const secret = getSessionSigningSecret();
  if (!secret) {
    throw new AppError(
      "CONFIG_ERROR",
      "SESSION_SECRET (>= 32 characters) must be configured in production.",
      500
    );
  }
  const payloadB64 = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  const signatureB64 = computeHmacBase64Url(payloadB64, secret);
  return `${payloadB64}.${signatureB64}`;
}

export function decodeStaffSession(token: string): StaffSession | null {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 2) {
      // Reject unsigned legacy tokens or malformed strings
      return null;
    }

    const [payloadB64, providedSigB64] = parts;
    if (!payloadB64 || !providedSigB64) return null;

    const secret = getSessionSigningSecret();
    if (!secret) return null;

    const expectedSigB64 = computeHmacBase64Url(payloadB64, secret);
    const expectedBuf = Buffer.from(expectedSigB64, "utf8");
    const providedBuf = Buffer.from(providedSigB64, "utf8");

    if (
      expectedBuf.length !== providedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, providedBuf)
    ) {
      return null;
    }

    const raw = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const parsed = JSON.parse(raw) as StaffSession;
    if (
      !parsed ||
      typeof parsed.userId !== "string" ||
      typeof parsed.role !== "string" ||
      typeof parsed.branchId !== "string" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }

    if (parsed.expiresAt < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}


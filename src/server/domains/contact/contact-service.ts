import crypto from "node:crypto";
import { AppError } from "@/lib/errors/app-error";

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  message: string;
  status: "RECEIVED" | "ASSIGNED" | "RESPONDED";
  createdAt: string;
  sourceIp?: string;
}

export interface ContactStorageProvider {
  name: string;
  persistInquiry(inquiry: ContactInquiry): Promise<void>;
  getInquiryById(id: string): Promise<ContactInquiry | null>;
  listInquiries(): Promise<ContactInquiry[]>;
  clear?(): void;
}

export class InMemoryContactStorageProvider implements ContactStorageProvider {
  name = "IN_MEMORY_PERSISTENCE";
  private store = new Map<string, ContactInquiry>();

  async persistInquiry(inquiry: ContactInquiry): Promise<void> {
    this.store.set(inquiry.id, { ...inquiry });
  }

  async getInquiryById(id: string): Promise<ContactInquiry | null> {
    const item = this.store.get(id);
    return item ? { ...item } : null;
  }

  async listInquiries(): Promise<ContactInquiry[]> {
    return Array.from(this.store.values()).map((item) => ({ ...item }));
  }

  clear(): void {
    this.store.clear();
  }
}

export class ContactService {
  private storageProvider: ContactStorageProvider | null = null;

  constructor() {
    // In production, volatile in-memory storage must NEVER simulate persistence.
    // CONTACT_IN_MEMORY_STORAGE is only permitted in development and test environments.
    if (
      process.env.NODE_ENV !== "production" &&
      process.env.CONTACT_IN_MEMORY_STORAGE === "true"
    ) {
      this.storageProvider = new InMemoryContactStorageProvider();
    }
  }

  /**
   * Sets or clears the active storage/delivery provider.
   * Useful for dependency injection, test fixtures, and runtime adapters.
   */
  setStorageProvider(provider: ContactStorageProvider | null): void {
    this.storageProvider = provider;
  }

  getStorageProvider(): ContactStorageProvider | null {
    return this.storageProvider;
  }

  /**
   * Returns true only when a verified persistent storage provider or external delivery service is active.
   */
  isSubmissionSupported(): boolean {
    if (
      process.env.NODE_ENV === "production" &&
      this.storageProvider instanceof InMemoryContactStorageProvider
    ) {
      return false;
    }
    return this.storageProvider !== null;
  }

  /**
   * Submits a guest contact inquiry.
   * Fails closed if no verified storage or delivery service is configured,
   * guaranteeing that HTTP 200 is NEVER returned for an unpersisted or undelivered inquiry.
   */
  async submitInquiry(input: {
    name: string;
    email: string;
    message: string;
    sourceIp?: string;
  }): Promise<{ inquiry: ContactInquiry; providerName: string }> {
    if (!this.storageProvider) {
      throw new AppError(
        "SERVICE_UNAVAILABLE",
        "Web inquiry submission is temporarily disabled pending email gateway / database table provisioning. Please contact support@smashandsizzle.com or call (555) 234-5678.",
        503
      );
    }

    if (
      process.env.NODE_ENV === "production" &&
      this.storageProvider instanceof InMemoryContactStorageProvider
    ) {
      throw new AppError(
        "CONFIG_ERROR",
        "In-memory contact storage provider is strictly forbidden in production. A durable database or delivery service provider is required.",
        500
      );
    }

    const inquiry: ContactInquiry = {
      id: `inq-${crypto.randomUUID()}`,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      message: input.message.trim(),
      status: "RECEIVED",
      createdAt: new Date().toISOString(),
      sourceIp: input.sourceIp,
    };

    await this.storageProvider.persistInquiry(inquiry);

    return {
      inquiry,
      providerName: this.storageProvider.name,
    };
  }

  async getInquiryById(id: string): Promise<ContactInquiry | null> {
    if (!this.storageProvider) {
      return null;
    }
    return this.storageProvider.getInquiryById(id);
  }
}

export const contactService = new ContactService();

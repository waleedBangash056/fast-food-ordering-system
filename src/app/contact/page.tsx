"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Phone, MessageSquare, CheckCircle2 } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim() || isSubmitting) return;

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setSubmitError(data?.error?.message || "Failed to submit message. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setSubmitError("Network error. Please call our kitchen directly at (555) 234-5678.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-[var(--cream)] font-display">
          Guest Support & Feedback
        </h1>
        <p className="text-xs sm:text-sm text-[var(--cream-muted)]">
          Questions about an order or dietary accommodation? Our team responds within 15 minutes during kitchen hours.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Contact Info */}
        <div className="md:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl glass-panel-strong border border-[var(--border-glass)] space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--accent-orange)]">
              Direct Contact
            </h3>
            <div className="space-y-4 text-xs text-[var(--cream-muted)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white shrink-0">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-white">Call Support</p>
                  <a
                    href="tel:5552345678"
                    className="hover:text-[var(--accent-orange)] transition-colors focus:outline-none focus:underline"
                  >
                    (555) 234-5678
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-white">Email Us</p>
                  <a
                    href="mailto:support@smashandsizzle.com"
                    className="hover:text-[var(--accent-orange)] transition-colors focus:outline-none focus:underline"
                  >
                    support@smashandsizzle.com
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white shrink-0">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-white">Kitchen Hours</p>
                  <p>Mon–Thu: 11:00 AM – 10:30 PM</p>
                  <p>Fri–Sat: 11:00 AM – Midnight</p>
                  <p>Sun: 11:30 AM – 10:00 PM</p>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="md:col-span-7">
          <div className="p-8 rounded-3xl glass-panel-strong border border-[var(--border-glass)]">
            {submitted ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle2 className="h-12 w-12 text-[var(--success)] mx-auto" />
                <h3 className="text-xl font-bold text-white">Inquiry Submitted!</h3>
                <p className="text-xs text-[var(--cream-muted)]">
                  Thank you, {name}. Your message has been accepted by our support queue. For immediate order changes or urgent requests, please contact our kitchen directly at (555) 234-5678.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--cream)] mb-2">
                  Send A Message
                </h3>
                <Input
                  label="Your Name"
                  placeholder="Alex Rivera"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="alex@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div className="space-y-1.5 text-left">
                  <label
                    htmlFor="contact-message"
                    className="block text-xs font-semibold uppercase tracking-wider text-[var(--cream-muted)]"
                  >
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    required
                    placeholder="How can our kitchen help you today?"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full rounded-xl bg-[var(--surface-dark)] px-4 py-3 text-sm text-[var(--cream)] placeholder:text-neutral-500 border border-[var(--border-glass)] focus:outline-none focus:border-[var(--accent-orange)]"
                  />
                </div>
                {submitError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 space-y-2">
                    <p className="text-xs text-[var(--accent-red)] font-medium" role="alert">
                      {submitError}
                    </p>
                    <a
                      href={`mailto:support@smashandsizzle.com?subject=${encodeURIComponent(
                        `Guest Inquiry from ${name || "Guest"}`
                      )}&body=${encodeURIComponent(message)}`}
                      className="inline-block text-xs font-bold text-[var(--accent-orange)] hover:underline"
                    >
                      Click here to email our team directly →
                    </a>
                  </div>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  className="w-full font-bold"
                >
                  Submit Feedback
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

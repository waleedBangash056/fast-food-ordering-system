import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Dialog Portal Overlay & Stacking Context Invariants (CSS Containing Block Fix)", () => {
  it("verifies Dialog component uses React Portal to document.body with SSR hydration guard", () => {
    const dialogPath = path.resolve("./src/components/ui/dialog.tsx");
    expect(fs.existsSync(dialogPath)).toBe(true);

    const dialogContent = fs.readFileSync(dialogPath, "utf-8");

    // Must import createPortal from react-dom
    expect(dialogContent).toContain("createPortal");
    expect(dialogContent).toMatch(/import\s*\{[^}]*createPortal[^}]*\}\s*from\s*["']react-dom["']/);

    // Must target document.body to break free from ancestor CSS transforms and containing blocks
    expect(dialogContent).toContain("createPortal(dialogContent, document.body)");

    // Must have SSR hydration guard (e.g. mounted / isMounted state)
    expect(dialogContent).toMatch(/const\s*\[\s*mounted,\s*setMounted\s*\]\s*=\s*useState\(\s*false\s*\)/);
    expect(dialogContent).toMatch(/if\s*\(\s*!isOpen\s*\|\|\s*!mounted\s*\)\s*return\s*null/);
  });

  it("verifies Dialog container has high elevation (z-[100]) towering over sticky navbar (z-40)", () => {
    const dialogPath = path.resolve("./src/components/ui/dialog.tsx");
    const dialogContent = fs.readFileSync(dialogPath, "utf-8");

    // Elevation must be z-[100] to sit cleanly above sticky header (z-40) and cart drawer (z-50)
    expect(dialogContent).toContain("fixed inset-0 z-[100]");

    // Must maintain WAI-ARIA role and modal attributes
    expect(dialogContent).toContain('role="dialog"');
    expect(dialogContent).toContain('aria-modal="true"');
    expect(dialogContent).toContain('aria-labelledby="dialog-title"');
  });

  it("verifies Dialog provides WCAG-compliant focus trap, Escape key handling, and focus restoration", () => {
    const dialogPath = path.resolve("./src/components/ui/dialog.tsx");
    const dialogContent = fs.readFileSync(dialogPath, "utf-8");

    // Body scroll lock and unlock
    expect(dialogContent).toContain('document.body.style.overflow = "hidden"');
    expect(dialogContent).toMatch(/document\.body\.style\.overflow\s*=\s*originalOverflow\s*\|\|\s*"unset"/);

    // Escape key dismissal
    expect(dialogContent).toContain('e.key === "Escape"');

    // Tab key trap handling (Shift+Tab wrap-around)
    expect(dialogContent).toContain('e.key === "Tab"');
    expect(dialogContent).toContain("e.shiftKey");

    // Focus restoration to trigger element on unmount
    expect(dialogContent).toContain("previousActiveElement");

    // Stop propagation on modal surface click to prevent backdrop dismissal
    expect(dialogContent).toContain("e.stopPropagation()");
  });

  it("verifies ProductCustomizerModal and ProductCard contract integration", () => {
    const modalPath = path.resolve("./src/components/commerce/product-customizer-modal.tsx");
    const cardPath = path.resolve("./src/components/commerce/product-card.tsx");

    const modalContent = fs.readFileSync(modalPath, "utf-8");
    const cardContent = fs.readFileSync(cardPath, "utf-8");

    // ProductCustomizerModal must delegate to Dialog
    expect(modalContent).toContain('import { Dialog } from "@/components/ui/dialog"');
    expect(modalContent).toContain("<Dialog");

    // ProductCard must instantiate ProductCustomizerModal
    expect(cardContent).toContain('import { ProductCustomizerModal } from "./product-customizer-modal"');
    expect(cardContent).toContain("<ProductCustomizerModal");
  });
});

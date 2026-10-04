# Premium Fast-Food Restaurant Design System

**Document ID:** FF-DS-001  
**Version:** 1.1  
**Date:** 2026-10-04  
**Status:** BASELINED & AUDITED  

---

## 1. Design Tokens & CSS Variables

```css
:root {
  /* Core Culinary Palette */
  --ink: #0D0D0E;                          /* Deep near-black background */
  --cream: #FDFBF7;                        /* Warm white text and surfaces */
  --surface-dark: #161618;                 /* Opaque card surface */
  --surface-glass: rgba(22, 22, 24, 0.65); /* Translucent glass panels */
  --surface-glass-strong: rgba(13, 13, 14, 0.88); /* Modal & drawer backgrounds */
  --border-glass: rgba(255, 255, 255, 0.12);      /* 1px subtle stroke */

  /* Appetite & Action Accents */
  --accent-red: #E63946;                   /* Dominant primary CTA, highlights */
  --accent-orange: #F4A261;                /* Warm glow, secondary actions */
  --accent-yellow: #E9C46A;                /* Badges, stars, spice indicators */

  /* Feedback & Accessibility */
  --success: #2A9D8F;                      /* Order confirmed, ready states */
  --warning: #E76F51;                      /* Low stock, closing soon */
  --error: #D62828;                        /* Form validation errors, decline */
  --muted: #A0A0A5;                        /* Secondary descriptions, meta */
  --focus-ring: #F4A261;                   /* WCAG 2.2 focus outline (>= 3:1) */

  /* 4px Base Spacing Grid */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;

  /* Shape Language */
  --radius-sm: 8px;                        /* Badges, small tags */
  --radius-md: 16px;                       /* Form inputs, buttons */
  --radius-lg: 24px;                       /* Product cards, panels */
  --radius-xl: 32px;                       /* Modals, drawers, hero cards */
  --radius-pill: 9999px;                   /* Primary CTA buttons, category chips */
}
```

---

## 2. Color Distribution Rule (60 / 25 / 10 / 5)

The visual system enforces strict balance to maintain appetite appeal without visual noise:
- **60% Deep Neutral & Food Photography:** Near-black backgrounds (`--ink`) and full-bleed culinary photography dominate.
- **25% Warm Food Tones:** Warm neutral card backgrounds (`--surface-dark`) and warm gradients.
- **10% Glass & Highlight Surfaces:** Translucent panels (`--surface-glass`) for navigation, cart drawer, and category filters.
- **5% Action Accent:** Crisp, high-contrast `--accent-red` and `--accent-orange` strictly reserved for high-priority CTAs ("Order Now", "Checkout", "Add to Cart").

---

## 3. Typography System

### Display Headline Family (Brand Story & Hero Moments)
- **Characteristics:** Bold / Black weight (700-900), tight tracking (-0.03em), high impact.
- **Fluid Clamp Scales:**
  - Hero Display: `clamp(2.75rem, 6vw + 1rem, 5.0rem)`
  - Section Heading (H1): `clamp(2.0rem, 4vw + 1rem, 3.25rem)`
  - Card Heading (H2): `clamp(1.5rem, 2.5vw + 0.75rem, 2.25rem)`

### Interface Family (Menus, Prices, Form Controls)
- **Characteristics:** High x-height, clear differentiation of characters (e.g. `1`, `l`, `I`), tabular numerals for monetary figures.
- **Scale:**
  - Body Large: `1.125rem` (18px)
  - Body Regular: `1.0rem` (16px)
  - Caption / Meta: `0.875rem` (14px)
  - Micro / Tag: `0.75rem` (12px)

---

## 4. High-Contrast Glassmorphism Specification

```css
.glass-surface, .glass-panel {
  background: var(--surface-glass);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid var(--border-glass);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.45);
}

/* Accessible Solid Fallback for low-power devices and browsers without backdrop-filter */
@supports not (backdrop-filter: blur(14px)) {
  .glass-surface, .glass-panel {
    background: var(--surface-dark) !important;
    border: 1px solid rgba(255, 255, 255, 0.16) !important;
  }
}
```

### WCAG 2.2 AA Contrast Standard
- Text on glass panels must maintain at least **4.5:1** contrast ratio against the composite background.
- Focus outlines must be at least 2px thick with minimum **3:1** contrast against both the glass surface and adjacent page background (`outline: 2px solid var(--focus-ring); outline-offset: 2px`).

---

## 5. Core Component Contracts

### 5.1 Primary Action Button
- Pill shape (`--radius-pill`), background `--accent-red`, text `--cream`.
- Hover: Subtle scale `1.02` with brightness boost.
- Focus: 2px solid `--focus-ring` with 2px offset.
- Disabled: Opacity 0.4, cursor `not-allowed`.

### 5.2 Product Card
- Height-stable layout; top 60% dedicated to optimized food image.
- Bottom 40% contains product name, dietary badges (Spicy, Veg), short descriptor, tabular price (`$14.99`), and round "+" Add CTA.
- Border radius: 24px (`--radius-lg`).

### 5.3 Cart Drawer & Modals (WAI-ARIA Dialog Standards)
- Surface: `--surface-glass-strong` with 14px blur.
- Focus Trap: `Tab` / `Shift+Tab` strictly bound within the container.
- Keyboard Dismissal: `Escape` key immediately closes drawer/modal.
- Focus Return: Automatically returns focus to the trigger button upon close.
- Screen Reader Announcements: Dynamic updates announced via `aria-live="polite"` (cart changes) and `aria-live="assertive"` (sold-out or closure alerts).

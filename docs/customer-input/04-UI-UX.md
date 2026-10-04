# UI/UX Specification — Premium Glass + Fast-Food Visual System

**Document ID:** FF-UIUX-001  
**Version:** 1.0  
**Status:** Design Baseline  
**Experience direction:** Premium fast-food / cinematic / glassmorphism / editorial 3D  
**Primary UX objective:** Make the customer hungry, confident, and ready to order within seconds.

## 1. Experience Concept

The design should feel like a premium food brand, not a generic SaaS dashboard wearing a burger background.

The visual language combines:

- deep food-photography backgrounds
- warm red/orange/yellow accent energy
- near-black surfaces for contrast
- translucent glass panels
- soft blur and controlled glow
- large editorial typography
- tactile food cards
- subtle depth/parallax
- selective 3D scenes
- short, purposeful micro-interactions

The interface should borrow the **commerce clarity** of leading restaurant ordering experiences such as Broadway Pizza's category-led menu and deal presentation, while differentiating through a stronger brand narrative layer. citeturn569372search3turn569372search0

## 2. Visual Principles

### Principle A — Appetite before interface

Large food photography should be the first visual signal. UI chrome stays secondary.

### Principle B — Glass around content

Use glass surfaces for navigation, filters, cart, floating utility bars, and selected editorial cards. Do not place every component inside a translucent rounded rectangle.

### Principle C — Strong depth hierarchy

Use three layers:

1. **Background:** food imagery, gradients, texture, ambient motion.
2. **Glass surface:** content/control panels.
3. **Foreground:** typography, product imagery, CTA controls.

### Principle D — Motion has a narrative purpose

Every animation should answer one question: what did the user understand because this moved?

### Principle E — 3D is optional enhancement

3D never owns the information architecture. It is a storytelling layer.

## 3. Color System

Final brand colors are TBD by brand identity work. The system should use semantic tokens rather than hard-coded colors.

Recommended starting token families:

```text
ink / near-black
surface-dark
surface-glass
surface-glass-strong
cream / warm-white
accent-red
accent-orange
accent-yellow
success
warning
error
muted
border-glass
```

Recommended visual temperature:

- 60% deep neutral/food photography
- 25% warm food tones
- 10% glass/highlight surfaces
- 5% action accent

Do not use the accent color on every text element.

## 4. Typography

Use one expressive display family plus one highly readable interface family.

### Display

Purpose: brand headlines, hero statements, campaign titles.

Characteristics:

- bold/black weight
- tight headline rhythm
- large scale
- responsive clamp sizing

### UI

Purpose: navigation, prices, metadata, forms, buttons.

Characteristics:

- high x-height
- strong numeric clarity
- broad language support
- excellent rendering on mobile

Do not use more than two primary font families.

## 5. Shape Language

- Cards: 20–32px radius depending on context.
- Buttons: pill or 14–18px radius, depending on brand identity.
- Input controls: 14–18px radius.
- Glass border: 1px low-opacity stroke.
- Shadow: soft, wide, low-opacity; avoid black “floating card” shadows.

## 6. Glassmorphism Rules

Use:

```css
backdrop-filter: blur(...)
background: rgba(...)
border: 1px solid rgba(...)
```

But every glass component must also have a solid-color fallback for browsers/devices where backdrop blur is unavailable or expensive.

Requirements:

- text contrast must remain readable against the worst-case background
- focus indicators must remain visible
- do not use glass as the sole contrast mechanism
- reduce transparency on dense content screens
- use stronger opaque surfaces on checkout/admin screens

WCAG 2.2 should be treated as the accessibility baseline; focus visibility is particularly important when the visual system relies on low-opacity borders and glow. citeturn569372search9turn446940search10

## 7. Global Navigation

### Desktop

A floating/overlay navigation bar:

- logo
- Menu
- About
- Locations
- Offers
- Contact
- account icon
- cart icon with count
- primary “Order Now” CTA

The bar may begin transparent over the hero and become stronger glass/solid while scrolling.

### Mobile

Prioritize:

- logo
- cart
- compact menu button

Use a bottom utility area only where it improves ordering speed; do not overload the screen with persistent controls.

## 8. Home / Menu Screen

This is the primary customer entry experience.

### First viewport

Required:

- full-width food visual or cinematic food background
- concise brand line
- immediately visible category/menu entry
- prominent Order Now CTA
- visible location/service selector when required for pricing/availability

### Menu section

Recommended order:

1. Featured/deal rail
2. Category chips/tabs
3. Product grid/list
4. Promotional storytelling strip
5. Brand story teaser
6. Locations teaser
7. Footer

### Product card

Display:

- image
- badge/tag
- name
- short descriptor
- price
- optional old price/promotion
- add button

Avoid forcing users into a detail page for simple products.

## 9. Product Detail UX

On desktop, use a large modal/drawer or dedicated route depending on complexity.

On mobile, prefer a bottom-sheet-like detail surface or dedicated route with a persistent add-to-cart action.

Layout:

```text
[Food media]
[Name]
[Description]
[Price]
[Modifiers]
[Special note]
[Quantity stepper]
[Add to Cart — total price]
```

The final button must show the actual resulting price whenever customization changes it.

## 10. Cart UX

Use a right-side desktop drawer or dedicated route on mobile.

Required:

- items
- modifier summary
- quantity
- remove/edit
- coupon
- subtotal
- delivery fee
- tax/fees
- total
- checkout CTA

Empty cart should still feel branded and useful, with a clear return-to-menu CTA.

## 11. Checkout UX

Checkout must be visually calmer than the home page.

No unnecessary 3D.

Sections:

1. Service mode
2. Address/branch
3. Customer contact
4. Delivery timing
5. Payment
6. Order summary
7. Terms/consent where required
8. Place order

Use a sticky order summary on desktop and a collapsible summary on mobile.

## 12. Order Tracking

Visual model:

```text
Order placed
   ↓
Accepted
   ↓
Preparing
   ↓
Ready / On the way
   ↓
Delivered
```

Use a warm animated progress indicator, but never rely on animation alone. Each state must have a text label.

## 13. About Page — Signature Experience

The About page is the flagship visual page.

### Section 1 — Cinematic opening

- dark/food image background
- large statement
- slow camera/depth movement
- subtle particle/steam/noise texture

### Section 2 — “Why we exist”

Split-screen editorial panel.

One side: brand statement.  
Other side: slow food preparation imagery or 3D object.

### Section 3 — Ingredient story

As the user scrolls:

- ingredient object enters
- text reveals progressively
- camera/position shifts
- next ingredient replaces the previous

Do not create a separate 3D scene for every paragraph.

### Section 4 — Craft / preparation

Use a horizontal or pinned scroll sequence showing the preparation journey.

GSAP ScrollTrigger is suitable for scrubbed/pinned storytelling, but animation timelines must be tested against mobile interaction cost. citeturn928003search8

### Section 5 — Restaurant evolution

A vertical timeline or cinematic sequence showing milestones.

### Section 6 — Locations

Beautiful branch cards with map/location CTA.

### Section 7 — Conversion close

Large final food image + “Taste the story” / “Order Now” CTA.

## 14. 3D Design Language

3D should feel culinary rather than technological.

Good candidates:

- floating burger/pizza/sandwich
- sauce bottle
- ingredient cluster
- packaging box
- stylized restaurant emblem
- rotating plate/platter

Avoid:

- generic floating spheres
- random neon geometry
- crypto/AI-looking holograms
- excessive particle fields
- 3D menu replacement

### 3D performance rules

React Three Fiber documents performance pitfalls such as repeated object creation and unnecessary state updates; reuse scene resources and avoid React state updates in per-frame loops. citeturn905846search1

Use on-demand rendering when a scene does not need continuous animation. citeturn905846search15

## 15. Motion System

### Motion classes

**Micro:** 120–220ms  
Hover, press, icon state.

**UI transition:** 220–450ms  
Drawer, modal, filter, navigation change.

**Editorial:** 600–1200ms  
About-page reveals, image transitions.

**Hero cinematic:** 1.2–3.0s  
Only for ambient/background composition.

Do not animate every object simultaneously.

## 16. Reduced Motion

When `prefers-reduced-motion: reduce` is enabled:

- remove camera motion
- remove parallax
- disable nonessential scroll scrubbing
- simplify 3D to a still render or image
- keep opacity/fade transitions short and meaningful

## 17. Responsive Breakpoints

Use content-driven breakpoints rather than device-specific hacks.

Reference modes:

- small mobile: ~360–480px
- large mobile/small tablet: ~481–767px
- tablet: ~768–1023px
- laptop: ~1024–1439px
- large desktop: ≥1440px

Every major screen needs a designed layout for all modes, not merely CSS stacking.

## 18. Accessibility Requirements

- keyboard navigation for every interactive element
- visible focus state
- semantic headings
- labels for controls
- descriptive alternative text for meaningful images
- decorative images marked decorative
- accessible cart state announcements
- accessible validation errors
- no color-only state indicators
- motion preference support
- touch targets sized for comfortable interaction

WCAG 2.2 is the baseline standard. citeturn569372search9

## 19. UX Writing

Tone:

- confident
- appetizing
- energetic
- warm
- concise
- never childish unless a children's campaign explicitly uses that voice

Avoid:

- empty luxury clichés
- excessive exclamation marks
- unexplained food jargon
- long paragraphs inside ordering UI

## 20. Image Strategy

Images are a first-class performance asset.

Requirements:

- WebP/AVIF where supported
- explicit dimensions/aspect ratios
- responsive variants
- compressed source assets
- lazy loading outside the initial viewport
- priority loading only for true LCP candidates

Next.js's current image tooling is designed for responsive sizing, modern formats, lazy loading, and layout stability. citeturn446940search1turn446940search5

## 21. Design Acceptance Criteria

A design review fails if:

- the user cannot identify how to order within seconds
- glass surfaces reduce readability
- the homepage looks like a generic admin/product template
- 3D delays meaningful content
- checkout visually feels like a marketing page
- mobile ordering requires horizontal scrolling
- motion remains aggressive under reduced-motion settings
- important states are communicated only through color or animation

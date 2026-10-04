# Performance Budget & Core Web Vitals Standards

**Document ID:** FF-PERF-001  
**Version:** 1.0  
**Date:** 2026-10-04  
**Status:** BASELINED  

---

## 1. Core Web Vitals Targets (75th Percentile)

All user-facing routes must meet the official Google web.dev "Good" thresholds:

| Metric | Target Threshold | Scope of Measurement | Enforcement Tool |
|---|---|---|---|
| **Largest Contentful Paint (LCP)** | $\le \mathbf{2.5\text{ s}}$ | 75th percentile on simulated 4G mobile and broadband desktop | Lighthouse CI / Playwright CrUX |
| **Interaction to Next Paint (INP)** | $\le \mathbf{200\text{ ms}}$ | Modal open, category chip tap, cart stepper | Playwright interaction benchmarks |
| **Cumulative Layout Shift (CLS)** | $\le \mathbf{0.1}$ | Full session from arrival through checkout | Layout shift observer |

---

## 2. Resource & Payload Budgets

| Asset / Layer | Budget Limit | Architectural Rule |
|---|---|---|
| **Critical Route JavaScript** | $\le \mathbf{250\text{ KB}}$ (compressed gzip/brotli) | Excludes 3D and heavy animation libraries from commerce paths. |
| **Three.js & R3F Bundle** | Isolated chunk, lazy-loaded on demand | Loaded strictly on `/about`; never imported into `/` or `/checkout`. |
| **Hero Image (LCP Candidate)** | $\le \mathbf{120\text{ KB}}$ (WebP / AVIF format) | Explicit `width` and `height`, `priority={true}` via `next/image`. |
| **Product Thumbnail Images** | $\le \mathbf{40\text{ KB}}$ each | Responsive `sizes` attribute, lazy loading outside viewport. |
| **Initial HTML Response (TTFB)** | $\le \mathbf{300\text{ ms}}$ | Edge caching for public catalog; database connection pooling for dynamic routes. |
| **API Latency ($P_{95}$)** | $\le \mathbf{500\text{ ms}}$ for read queries, $\le \mathbf{800\text{ ms}}$ for order placement | Direct PostgreSQL indexed queries; Redis caching for static catalog data. |

---

## 3. 3D & Graphics Performance Contract

1. **Rendering Loop:** The 3D canvas must use `frameloop="demand"`. Continuous 60fps requestAnimationFrame loops while idle are prohibited.
2. **GPU Resource Disposal:** Textures, geometries, and materials must be explicitly disposed on component unmount to prevent GPU memory leaks:
   ```ts
   useEffect(() => {
     return () => {
       geometry.dispose();
       material.dispose();
       renderer.dispose();
     };
   }, []);
   ```
3. **Hardware & Power Degradation:** Detect hardware concurrency and mobile low-power mode: if WebGL context creation fails or device memory $\le 2$ GB, automatically unmount 3D canvas and serve static WebP photography.

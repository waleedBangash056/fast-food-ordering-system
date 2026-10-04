# Factory Baseline — Project Initial State

**Project:** Premium Fast-Food Restaurant Ordering & Brand Website  
**Baseline Date:** 2026-10-04  
**Factory Version:** 7.4.0  

## 1. Repository & Workspace State
- **Workspace Path:** `d:\My Projects\Fast-Food`
- **Operating System:** Windows (PowerShell shell environment)
- **Source Control:** Initialized clean Git repository (`.git/`)
- **Factory Distribution Safety:** Confirmed NOT inside `.website-factory-package`. Preflight script check: PASS (`allow`).
- **Control Directory:** `C:\Users\wbang\.website-factory-control`

## 2. Customer Specification Pack
- Customer specification documents located in `docs/customer-input/` (7 documents, total ~80 KB markdown).
- Integrity confirmed: Strictly read-only, all 7 documents fully ingested.
- Documents ingested:
  1. `01-PRD.md` (FF-PRD-001 v1.0)
  2. `02-Architecture-and-Design.md` (FF-ARCH-001 v1.0)
  3. `03-Backend-Schema.md` (FF-DB-001 v1.0)
  4. `04-UI-UX.md` (FF-UIUX-001 v1.0)
  5. `05-TRD.md` (FF-TRD-001 v1.0)
  6. `06-App-Flow.md` (FF-FLOW-001 v1.0)
  7. `07-Implementation-Plan.md` (FF-PLAN-001 v1.0)

## 3. Technology & Runtime Toolchain Baseline
- **Node.js:** Node.js v20.x+ runtime available
- **Framework:** Next.js 16.x (App Router, Turbopack, Cache Components)
- **Language:** TypeScript 5.x (Strict mode)
- **UI Styling:** Tailwind CSS tokenized design system
- **Motion & 3D:** GSAP + ScrollTrigger, Three.js, React Three Fiber (R3F)
- **Persistence & ORM:** PostgreSQL 18.x with Drizzle ORM
- **Cache/Rate Limiting:** Redis / In-memory adapter for development
- **Validation:** Zod schemas for all external inputs and contracts
- **Testing Frameworks:** Vitest (unit/integration), Playwright (E2E / visual regression / accessibility)

## 4. Current Repository File Tree
```text
Fast-Food/
├── docs/
│   ├── customer-input/
│   │   ├── 01-PRD.md
│   │   ├── 02-Architecture-and-Design.md
│   │   ├── 03-Backend-Schema.md
│   │   ├── 04-UI-UX.md
│   │   ├── 05-TRD.md
│   │   ├── 06-App-Flow.md
│   │   └── 07-Implementation-Plan.md
│   ├── factory/
│   ├── ASSUMPTIONS.md
│   ├── CUSTOMER-ARTIFACT-MAP.md
│   ├── CUSTOMER-SOURCE-REGISTER.md
│   ├── FACTORY_BASELINE.md
│   └── PROJECT-RISK-PROFILE.md
├── scripts/
│   ├── check-toolchain.ps1
│   ├── preflight-project.ps1
│   ├── record-human-approval.ps1
│   ├── validate-browser-evidence.ps1
│   └── validate-factory-state.ps1
└── FACTORY_STATE.json
```

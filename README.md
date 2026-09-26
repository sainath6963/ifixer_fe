# Rich Culture Web

React + TypeScript frontend for the Rich Culture customer storefront and admin operations UI.

Phase F1 includes:

- Vite application and production build
- React Router customer/admin route trees with lazy page modules
- Redux Toolkit store with typed hooks
- RTK Query base API and tag model
- cookie-authenticated requests using `credentials: include`
- in-memory customer/admin CSRF acquisition, expiry, deduplication, and one safe retry
- isolated session and UI slices
- global render and route error boundaries
- responsive Rich Culture design tokens and accessible reduced-motion behavior
- Vitest and Testing Library foundation

Phase F2 adds the customer commerce surface:

- featured products and category-led home content from the public catalog API
- searchable, filterable, sortable and paginated catalog with URL-owned filters
- responsive product cards and catalog loading, empty and retry states
- product gallery, live variant selection, stock state and quantity selection
- guest or authenticated cart retrieval, add, exact quantity update, remove and clear actions
- server-authoritative cart totals with version-aware mutation requests
- same-origin and separate API-origin media URL support

The customer account phase adds:

- register, sign in, current-session sign out and sign out on every device
- HttpOnly-cookie session restoration with a single refresh rotation under React Strict Mode
- automatic guest-cart claim after successful registration or sign in
- protected account routing and safe post-login return paths
- profile display and password change with all-session revocation

The saved-address phase adds:

- customer address create, edit, default selection and deletion from the account page
- bounded server-owned address books with optimistic version conflict recovery
- automatic default-address selection and editable one-off delivery details at checkout
- browser acceptance coverage from saving the first address through checkout prefill

The customer account-recovery phase adds:

- email verification status and authenticated resend controls on the account page
- forgot-password requests with enumeration-safe success messaging
- one-time verification and password-reset pages with URL token scrubbing
- explicit click-to-verify behavior so email scanners cannot consume links through a GET
- password confirmation, session clearing, safe sign-in return messaging and browser acceptance coverage

The checkout and payments phase adds:

- authenticated shipping-address collection and server-repriced checkout preview
- cart-version conflict handling and idempotent internal order creation
- inventory reservation countdown, order history, detail and unpaid-order cancellation
- Razorpay Standard Checkout loaded only when the customer chooses to pay
- backend-only payment signature verification and captured/authorised recovery states
- single-flight access-token refresh for long-running authenticated checkout requests

The admin operations phase adds:

- owner/staff sign-in, protected admin routing, session restoration and single-flight refresh
- responsive operations shell and live catalog, order and notification summaries
- product/category listing, search, status filtering, publishing and featured-product controls
- order search, fulfilment transitions, courier tracking fields and private admin notes
- delivery/outbox inspection with owner-only retries for failed or dead jobs
- optimistic-concurrency versions on catalog and order mutations

The admin catalog and finance phase adds:

- draft product creation and full product/category editing with archive safeguards
- variant creation/editing, deactivation, exact paise-safe pricing and attributes
- idempotent audited inventory adjustments with live on-hand/reserved/available counts
- local VPS image upload, normalized media library, safe unused-asset deletion and collection artwork
- ordered product galleries with primary-image and accessible alt-text controls
- OWNER-only full or partial Razorpay refunds with available-balance validation, explicit confirmation and stable retry keys

The storefront content and discoverability phase adds:

- a complete responsive Rich Culture story/manifesto experience with reduced-motion support
- route-specific titles, descriptions and Open Graph/Twitter product metadata
- no-index protection for account, checkout, order, admin, error and search-result screens
- browser scroll restoration, Escape-to-close mobile navigation and consistent menu state on navigation
- high-priority decoding hints for the product hero image

The admin security and queue-navigation phase adds:

- self-service admin password changes with automatic all-device revocation
- explicitly confirmed all-session revocation for missing or untrusted devices
- URL-owned order search, lifecycle/payment/fulfilment filters and inclusive local date ranges
- URL-owned notification/outbox search, status and template filters
- reusable server pagination with visible record ranges and refresh-safe list state
- transparent admin token refresh before protected password/session operations

The production-readiness phase adds:

- a global offline warning with explicit no-auto-retry payment behavior
- live MongoDB, Redis and media-storage readiness on the admin dashboard
- a multi-stage frontend container with Nginx SPA fallback and same-origin API proxying
- immutable fingerprinted-asset caching, no-store HTML and baseline security headers
- web app metadata, a brand icon, crawler exclusions for private/transactional routes and production source-map protection
- a production release, smoke-test, monitoring and rollback runbook in [`../DEPLOYMENT.md`](../DEPLOYMENT.md)

The browser acceptance phase adds:

- deterministic Playwright coverage for storefront entry, catalog search and metadata
- protected customer/admin deep-link boundaries and mobile menu keyboard behavior
- browser-level offline/payment-safety verification
- a separate read-only HTTPS staging suite for API readiness, SPA routing and public metadata
- retained traces, screenshots and video only when browser checks fail

The returns and exchanges phase adds:

- delivered-order eligibility with a configurable deadline and remaining item quantities
- customer return/exchange forms with reason details, active replacement variants and stable retry keys
- customer-visible request history, cancellation, status messages and replacement tracking
- a searchable admin returns queue with status/type filters and optimistic request versions
- guarded approve/reject, warehouse inspection and resaleable-only restock controls
- owner-only completion using a settled Razorpay refund or replacement courier tracking

The return evidence and lifecycle phase adds:

- customer evidence upload, private thumbnail viewing and removal while a request is pending review
- bounded JPEG/PNG/WebP/AVIF selection with explicit upload progress and API error feedback
- authenticated admin evidence previews with original dimensions and normalized file size
- browser acceptance coverage for attaching and viewing evidence on a submitted exchange

The exchange reservation phase adds:

- customer-visible replacement hold state and approval deadline
- admin queue/detail visibility for active, committed, expired and legacy exchange holds
- an explicit expired request state after automatic stock release
- browser coverage for the transition from pending evidence upload to an approved stock hold

The coupon promotions phase adds:

- optional customer promotion-code validation during server-authoritative checkout review
- visible applied savings and immutable coupon details on customer/admin order screens
- an admin promotions workspace for draft creation, scheduling, activation, pausing and archival
- live held/paid/remaining usage counters with OWNER mutation and STAFF read-only behavior
- browser coverage for customer application and OWNER campaign activation

The verified product-reviews phase adds:

- a product-page rating summary and paginated published-review grid
- delivered-order eligibility with customer submit, revise, resubmit and withdraw controls
- clear pending/published/rejected/withdrawn states with moderator feedback
- a searchable admin moderation queue with rating/status filters and verified-order links
- publish and reject-with-feedback actions backed by optimistic versions
- browser coverage for customer submission and admin publication

The wishlist and stock-alert phase adds:

- signed-in product saving with idempotent wishlist controls on product detail
- a protected, paginated wishlist with item removal and active-alert management
- verified-email back-in-stock controls for each sold-out product option
- clear sign-in, email-verification, non-reservation, loading and retry states
- an admin stock-demand workspace ranked by subscribers with live available inventory
- browser coverage for save/subscribe, wishlist/cancel and admin demand flows

The customer profile-management phase adds:

- optimistic customer name editing and explicit communication preferences
- password-confirmed email change with one-time confirmation and forced re-login
- hashed mobile OTP challenge UI with development-only code visibility
- safe account deactivation with explicit confirmation and active-order/return protection
- searchable read-only customer profiles and recent activity for admins

The admin business-analytics phase adds:

- India business-day date ranges stored in the URL with 7/30/90-day presets
- captured sales, settled refunds, net revenue, paid-order, AOV and customer-growth KPIs
- equal preceding-period comparisons without fabricated zero-base percentages
- responsive accessible revenue trends, top products and current low-stock panels
- authenticated CSV export and deterministic Chromium acceptance coverage

The shipment-tracking phase adds:

- manual courier/AWB booking for paid orders already moved to processing
- guarded shipment state updates separated from basic fulfillment preparation
- admin courier facts, estimated delivery, external HTTPS tracking and event timeline
- customer-owned order tracking with courier-safe messages and locations
- delivery-exception visibility on the operations dashboard
- deterministic Chromium coverage from admin booking through customer tracking

Repository-level continuous integration is documented in [`../CI.md`](../CI.md). It runs frontend
unit/browser checks, backend unit/integration checks, dependency audits and both production container
builds without deploying or accessing production secrets.

## Local development

The backend should run on `http://127.0.0.1:4000`. Vite proxies `/api` to that origin, so browser cookies remain same-origin during development.

```bash
cp .env.example .env
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Environment

```dotenv
VITE_APP_NAME=Rich Culture
VITE_API_BASE_URL=/api/v1
VITE_DEV_API_TARGET=http://127.0.0.1:4000
```

Only variables prefixed with `VITE_` are exposed to frontend code. Never place Razorpay secrets, JWT secrets, SMTP credentials, or MongoDB credentials here. The frontend will receive only the public Razorpay key ID from the backend payment-initiation response.

Production should serve the SPA and API from one HTTPS site when possible. If separate origins are used, the exact frontend origin must be in backend CORS configuration and every API request must retain credentials. The web server must rewrite non-file storefront/admin paths to `index.html` for React Router deep links.

The included `Dockerfile` and `nginx/default.conf.template` implement the recommended same-origin setup. Pass the private NestJS address through `BACKEND_ORIGIN` at container runtime. Add the production sitemap to `public/robots.txt` after the canonical public domain is finalized.

## Verification

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Install the Playwright browser once on a new machine with `npx playwright install chromium`.
The local suite builds and serves the production SPA and stubs only the API boundary, making UI
acceptance deterministic without changing database state.

After deploying to a non-production HTTPS environment, run the read-only staging smoke suite:

```bash
E2E_BASE_URL=https://staging.example.com npm run test:e2e:staging
```

`E2E_BASE_URL` must be an HTTPS origin. The staging suite checks real liveness/readiness, storefront
and admin entry points, deep SPA navigation, the manifest and crawler rules; it does not create
customers, orders, payments or admin mutations.

Catalog, product, cart, account, checkout and admin operations pages use backend data and do not mock business state locally. Razorpay secrets, media processing, inventory enforcement and refund execution remain backend-only.

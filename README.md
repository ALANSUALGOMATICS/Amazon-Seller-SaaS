# Amazon Seller Workspace — Milestone 1

React frontend for the existing Amazon Seller SaaS backend. Only authentication,
current customer/profile, protected navigation, and a basic shell are implemented.

## Develop and validate

Requires Node.js 22.12+ or 24 and npm.

    npm ci
    npm run dev
    npm run lint
    npm test
    npm run build

Production assets are generated in dist/. No backend deployment is performed.

## Configuration and deployment

Configuration lives in src/config.js, with the production API values and requested hosting domain as
defaults. Copy .env.example to .env.local to override public VITE_* settings.
Vite embeds settings at build time: rebuild after changes. Never put secrets in
VITE_* variables.

The production frontend origin is https://www.indexspikerider.com. Deploy the
contents of dist/ to the existing frontend hosting origin, retaining index.html
at its root. Hash routes avoid server-side SPA rewrites.

Before using this build in production, configure the following in AWS:

1. Issue or reuse an ACM certificate covering www.indexspikerider.com in
   us-east-1 (CloudFront requires certificates in this region). Complete DNS
   validation if needed.
2. Add www.indexspikerider.com as an alternate domain name on the frontend
   CloudFront distribution and attach that certificate. Enable HTTPS redirection.
3. In the authoritative DNS zone, create an alias A record for www pointing to
   that CloudFront distribution (and an alias AAAA record if IPv6 is enabled).
   Check any existing www record before replacing it.
4. For the existing Cognito app client, add exactly
   https://www.indexspikerider.com to both allowed callback URLs and allowed
   sign-out URLs. Keep existing URLs during migration. No secret, flow, scope,
   user pool, or API changes are needed. This repository does not apply these
   AWS configuration changes.
5. Rebuild, deploy dist/, and invalidate outdated CloudFront assets as needed.
   Validate sign-in, GET /customers, refresh, and sign-out on the custom domain.

An OAuth attempt must begin and finish on the same origin and browser tab:
sessionStorage holds its verifier/state. Sign-in started on the custom domain
cannot return to the cloudfront.net hostname. Test production sign-in on
https://www.indexspikerider.com after deployment; localhost tests use mocks.
The apex indexspikerider.com is not configured by this frontend; if desired,
configure a separate HTTPS redirect to www rather than serving both origins.

## Authentication

Login generates a cryptographically random verifier and state, sends S256 to
Cognito, validates callback state and its ten-minute lifetime, and exchanges the
code without a client secret. Callback parameters and temporary PKCE values are
removed. Only the ID token and expiry are retained in sessionStorage; refresh and
access tokens are not retained. Expiry (with a 30-second safety margin), a backend
401, or logout clears application authentication. Expiry requires a new sign-in.

The API client sends the raw ID token, with no Bearer prefix. GET /customers has
no customer-ID query: the backend resolves identity. The success envelope data
must be the current customer object containing customer_id. Customer state is held
in memory and reloaded after a refresh. Errors preserve backend code/message;
404 displays Customer profile not found, and 403 displays Access denied.

Admin navigation requires customer.admin === "Y"; direct admin navigation is
also guarded. Backend authorization remains authoritative. The admin page is
only a shell, with no management actions.

## Validation boundaries

Automated tests cover PKCE, state rejection, code exchange deduplication, session
cleanup, raw ID-token requests, error handling, protected routes, customer display,
and Y/N admin behavior. Live Cognito authentication and customer API integration
require a browser on the configured CloudFront origin and an existing linked
customer. They are not established by mock tests.

No payments, RFQ, quotations, product/supplier writes, SP-API, subscription
enforcement, transactions, or financial analytics are implemented.

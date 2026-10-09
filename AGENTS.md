# AGENTS.md

# Amazon Seller SaaS — Codex Working Instructions

## 1. Project Mission

Build and integrate the React frontend for an India-focused Amazon Seller SaaS platform.

The backend is already substantially implemented on AWS using API Gateway, Lambda, DynamoDB, Cognito, Razorpay, OpenAI, and related services.

The frontend must integrate with the existing backend contracts. Do not redesign backend APIs, DynamoDB schemas, authentication, or workflow semantics unless explicitly instructed.

Before making architectural changes, read:

- `docs/PROJECT_CONTEXT.md`

Treat that file as the project source of truth.

---

## 2. Non-Negotiable Rules

1. Preserve existing working backend behavior.
2. Do not change backend API contracts unless explicitly approved.
3. Do not create duplicate DynamoDB data across tables.
4. Do not introduce PUT, PATCH, or DELETE APIs.
5. Production API methods are GET and POST only, plus OPTIONS for CORS.
6. Use production route names only.
7. Do not create test routes, test Lambda names, or test-only production endpoints.
8. Do not hard-code secrets.
9. Do not expose AWS credentials, Razorpay secrets, SMTP passwords, Twilio credentials, OpenAI keys, Amazon SP-API refresh tokens, Cognito passwords, or other secrets.
10. All DynamoDB application values are stored as Strings, including counters and numeric values.
11. Nested/list values are stored as JSON strings where required by the backend schema.
12. Frontend authorization visibility is not security. Backend authorization remains authoritative.
13. Avoid broad refactors unrelated to the requested task.
14. Make the smallest safe change that satisfies the requirement.
15. Keep existing route ownership intact.
16. Do not move customer-facing writes into tables/services that are owned by another backend service.
17. Do not use `amazon_seller_monthly_profit` for product/supplier/RFQ workflow tracking.
18. `amazon_seller_transactions` is the workflow/history table.

---

## 3. Technology Stack

Frontend:
- React
- JavaScript/JSX unless the existing repository already uses TypeScript
- AWS-hosted frontend / CloudFront
- Cognito Authorization Code + PKCE

Backend:
- AWS API Gateway
- AWS Lambda
- DynamoDB
- Cognito
- Razorpay
- OpenAI
- n8n may be used later for RFQ workflow support

AWS Region:
- `ap-south-1`

Primary API base:
- `https://88fqh6z4la.execute-api.ap-south-1.amazonaws.com/prod`

---

## 4. Frontend Authentication

Use Amazon Cognito Authorization Code + PKCE.

Cognito configuration:

- User pool: `ap-south-1_2BHzdJOCJ`
- App client: `amazon-seller-web`
- App client ID: `6druffm4vrngf5hvsu2l00o7sb`
- Domain: `https://ap-south-12bhzdjocj.auth.ap-south-1.amazoncognito.com`
- Redirect / return URL: `https://d84l1y8p4kdic.cloudfront.net`
- Scopes: `openid email`
- No client secret
- No phone scope

Frontend behavior:

1. Login using Authorization Code + PKCE.
2. Store tokens securely for the browser session.
3. Send the Cognito ID token in the `Authorization` header for Cognito-protected API calls.
4. Load current customer using `GET /customers`.
5. Resolve the current `customer_id` from the authenticated customer response.
6. Read the customer `admin` field.
7. `admin == "Y"` may enable admin navigation/screens.
8. `admin != "Y"` must hide admin-only UI.
9. Never rely on frontend admin checks as the only security boundary.

---

## 5. API Authorization Model

Cognito-protected frontend routes include:

- `GET /customers`
- `POST /customers`
- `GET /products`
- `GET /products/{product_id}`
- `GET /suppliers`
- `GET /suppliers/{supplier_id}`
- `GET /suppliers/{supplier_id}/{product_id}`
- `GET /products/{product_id}/suppliers`
- `GET /payments`
- `POST /payments/create-order`
- `POST /payments/verify`
- `GET /transactions`
- `GET /usage`
- `GET /rfq/context`
- `POST /rfq/start`
- `POST /rfq/generate`
- `GET /quotation/context`
- `POST /quotation/response`
- `POST /quotation/select`
- `POST /quotation/order`
- `POST /quotation/close`
- `GET /subscription-plans`
- `POST /subscription-plans`
- `GET /monthly-profit`
- `POST /monthly-profit`

AWS_IAM backend-only writes:

- `POST /products`
- `POST /suppliers`

Unauthenticated / NONE:

- `GET /health`
- all OPTIONS routes

Do not make normal frontend code directly call AWS_IAM backend-only product/supplier write routes unless a specifically approved backend/admin mechanism is introduced.

---

## 6. Frontend Implementation Priority

Implement in this order unless explicitly told otherwise:

1. Cognito login/logout
2. PKCE token handling
3. Authenticated API client
4. Current customer/profile state
5. `admin = Y/N` handling
6. Protected routes
7. Subscription plan display
8. Product discovery/list/details
9. Supplier discovery/list/details
10. Supplier selection workflow
11. RFQ workflow
12. Quotation workflow
13. Transaction/history UI
14. Razorpay subscription/payment UI
15. Usage UI
16. Admin module
17. Monthly profit analytics

Do not prematurely wire payment, RFQ, or quotation actions before their prerequisite frontend state is in place.

---

## 7. UI/UX Direction

Use a professional light-theme SaaS interface.

Preferred qualities:

- Clean light background
- Strong spacing hierarchy
- Accessible contrast
- Professional form controls
- Clear primary/secondary button hierarchy
- Consistent cards and data tables
- Responsive desktop-first layouts
- Avoid visual clutter
- Avoid unnecessary gradients or excessive decoration
- Preserve existing brand/layout choices when already implemented unless asked to redesign them

---

## 8. Product and Supplier Physical/Logistics Fields

These exact fields are finalized and exist in both products and suppliers:

- `item_dimensions`
- `item_weight`
- `is_expiration_dated_product`
- `item_dimensions_source`
- `item_weight_source`
- `item_data_confidence`
- `package_dimensions`
- `package_weight`

All are Strings.

For products, these generally represent Amazon/catalog product data.

For suppliers, these represent supplier-specific offered item/packaging data and must not automatically be treated as Amazon-authoritative.

Do not rename these fields.

---

## 9. Data Ownership Principles

- Customers table owns current customer/subscription/account profile state.
- Products table owns reusable product intelligence/catalog data.
- Suppliers table owns supplier master/intelligence data linked to a product.
- Transactions table owns sourcing/RFQ/quotation/order workflow history.
- Usage table owns monthly usage counters.
- Payments table is payment/subscription audit history.
- Subscription plans table owns available subscription plan definitions.
- Monthly profit table owns customer monthly financial analytics.

Do not duplicate complete records between tables when a snapshot/reference is sufficient.

---

## 10. Transaction Workflow

Allowed transaction stages:

- `PRODUCT_SELECTED`
- `SUPPLIERS_SELECTED`
- `RFQ_GENERATED`
- `RFQ_SENT`
- `QUOTATIONS_RECEIVED`
- `AI_ANALYZED`
- `SUPPLIER_SELECTED`
- `ORDER_PLACED`
- `CLOSED`

Transaction status:

- `ACTIVE`
- `CLOSED`
- `CANCELLED`

Use `product_snapshot_json` and `supplier_snapshot_json` for historical snapshots.

Do not replace transaction workflow with monthly-profit records.

---

## 11. Subscription and Admin Rules

Customer field:

- `admin = "Y"` or `"N"`
- default is `"N"`
- normal customer APIs must not allow the browser to arbitrarily promote itself to admin

Admin frontend screens may be shown only when the current customer response has:

- `admin == "Y"`

Admin-only backend actions must still be enforced by backend authorization.

---

## 12. Coding Expectations

When modifying code:

1. Read the existing implementation first.
2. Reuse existing components/services/hooks before adding duplicates.
3. Centralize API calls.
4. Centralize authentication/token behavior.
5. Centralize configuration such as API base URL and Cognito settings.
6. Keep route-specific API functions small and explicit.
7. Handle loading, success, empty, 401, 403, 404, and generic error states.
8. Do not silently swallow backend errors.
9. Do not invent fields not present in `PROJECT_CONTEXT.md`.
10. Do not assume numeric DynamoDB values; backend returns application data as Strings.
11. Parse numbers in the frontend only when needed for calculation/display.
12. Preserve original String values when sending backend payloads.

---

## 13. Testing Expectations

For frontend changes:

- Verify login redirect.
- Verify PKCE exchange.
- Verify authenticated API call to `GET /customers`.
- Verify logout clears local auth state.
- Verify protected route behavior.
- Verify 401/403 display behavior.
- Verify `admin = "Y"` and `"N"` UI behavior.
- Verify product and supplier detail rendering.
- Do not create production test endpoints.

Where feasible, use local mocks/unit tests for frontend-only logic rather than writing fake production data.

---

## 14. Security

Never commit:

- AWS access key ID
- AWS secret access key
- AWS session tokens
- Razorpay secret
- SMTP password
- Twilio credentials
- OpenAI API key
- Amazon SP-API refresh token
- customer passwords
- Cognito user passwords
- private signing keys

Environment variable names and public identifiers may be committed.

If a secret is discovered in code, stop and report it before committing.

---

## 15. First Codex Task

When starting the frontend work:

1. Read this file.
2. Read `docs/PROJECT_CONTEXT.md`.
3. Inspect the existing React application.
4. Do not alter backend Lambda/API contracts.
5. Implement only:
   - Cognito Authorization Code + PKCE
   - login/logout
   - token handling
   - authenticated API wrapper
   - `GET /customers`
   - current customer state
   - `admin = Y/N`
   - protected routes
6. Show the files changed and summarize the flow.
7. Do not proceed to payments/RFQ/quotations until the authentication foundation is working.

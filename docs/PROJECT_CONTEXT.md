# PROJECT_CONTEXT.md

# Amazon Seller SaaS — Project Context

## 1. Purpose

This repository supports an India-focused Amazon Seller SaaS platform.

Primary capabilities:

- Customer onboarding/profile
- Subscription plans and Razorpay payments
- Amazon product discovery/intelligence
- Supplier discovery/intelligence
- Supplier selection
- RFQ workflow
- Quotation workflow
- AI-assisted supplier analysis
- Transaction/order workflow history
- Usage tracking
- Monthly profit analytics
- Admin functionality

The backend is substantially implemented and validated. The current priority is React frontend creation and integration.

---

## 2. Architecture

### Frontend

- React
- Hosted on AWS / CloudFront
- Cognito Authorization Code + PKCE
- Light-theme professional SaaS UI

### Backend

- AWS API Gateway
- AWS Lambda
- DynamoDB
- Cognito
- Razorpay
- OpenAI
- n8n may be used for later workflow automation

### AWS

Region:

`ap-south-1`

AWS account currently used by the project:

`534605604855`

Production API base:

`https://88fqh6z4la.execute-api.ap-south-1.amazonaws.com/prod`

---

## 3. Global Backend Rules

- Production API methods are GET and POST only.
- OPTIONS is used for CORS.
- No PUT/PATCH/DELETE APIs.
- Production route names only.
- Avoid test-only production routes and test Lambda names.
- All DynamoDB application values are Strings.
- Counters are Strings.
- Numeric prices/scores are Strings.
- Nested/list JSON values are stored as JSON strings where appropriate.
- Do not duplicate data across tables.
- Preserve existing working behavior.
- Product/supplier backend ingestion writes are AWS_IAM protected.
- Customer-facing reads/actions generally use Cognito.

---

# 4. Cognito Authentication

Dedicated Cognito user pool:

- User pool ID: `ap-south-1_2BHzdJOCJ`
- App client name: `amazon-seller-web`
- App client ID: `6druffm4vrngf5hvsu2l00o7sb`
- Domain: `https://ap-south-12bhzdjocj.auth.ap-south-1.amazoncognito.com`
- Redirect URL: `https://d84l1y8p4kdic.cloudfront.net`
- Flow: Authorization Code + PKCE
- Scopes: `openid email`
- No client secret
- No phone scope

API Gateway Cognito authorizer:

`amazon-seller-cognito`

Frontend sends the Cognito ID token in the `Authorization` header.

Current customer identity is resolved through:

`GET /customers`

The backend maps the Cognito `sub` to `amazon_seller_customers.cognito_user_id`.

---

# 5. Admin Model

`amazon_seller_customers` contains:

`admin`

Values:

- `Y`
- `N`

Default:

`N`

Rules:

- Frontend may show admin UI only when `admin == "Y"`.
- Frontend visibility is not sufficient authorization.
- Backend admin APIs independently verify `admin == "Y"`.
- Normal customer APIs must not allow a customer to arbitrarily write/modify the `admin` field.

A previous non-admin security test was parked because the same Cognito identity was being used for the admin account. Do not resume that test unless explicitly requested.

---

# 6. Backend Lambda Services

Current production Lambda/service responsibilities:

1. `amazon-seller-data-api`
2. `amazon-seller-payment-api`
3. `amazon-seller-rfq-engine-api`
4. `amazon-seller-quotation-engine-api`
5. `amazon-seller-products-api`
6. `amazon-seller-suppliers-api`

Notifications are currently embedded in the payment Lambda using SMTP/Twilio-related logic; there is no separate notification Lambda.

---

# 7. API Route Ownership

## amazon-seller-data-api

- `GET /health`
- `GET /customers`
- `POST /customers`
- `GET /payments`
- `GET /transactions`
- `GET /usage`
- `GET /subscription-plans`
- `POST /subscription-plans`
- `GET /monthly-profit`
- `POST /monthly-profit`

## amazon-seller-products-api

- `GET /products`
- `POST /products`
- `GET /products/{product_id}`

## amazon-seller-suppliers-api

- `GET /suppliers`
- `POST /suppliers`
- `GET /suppliers/{supplier_id}`
- `GET /suppliers/{supplier_id}/{product_id}`
- `GET /products/{product_id}/suppliers`

## amazon-seller-payment-api

- `POST /payments/create-order`
- `POST /payments/verify`

## amazon-seller-rfq-engine-api

- `GET /rfq/context`
- `POST /rfq/start`
- `POST /rfq/generate`

## amazon-seller-quotation-engine-api

- `GET /quotation/context`
- `POST /quotation/response`
- `POST /quotation/select`
- `POST /quotation/order`
- `POST /quotation/close`

---

# 8. API Authorization Matrix

## Cognito

- `GET /products`
- `GET /products/{product_id}`
- `GET /products/{product_id}/suppliers`
- `GET /suppliers`
- `GET /suppliers/{supplier_id}`
- `GET /suppliers/{supplier_id}/{product_id}`
- `GET /customers`
- `POST /customers`
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

## AWS_IAM

- `POST /products`
- `POST /suppliers`

## NONE

- `GET /health`
- all OPTIONS routes

---

# 9. CORS

Gateway response CORS has been configured for unauthorized/access-denied responses.

Static values:

- `Access-Control-Allow-Origin`: `'*'`
- `Access-Control-Allow-Headers`: `'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'`
- `Access-Control-Allow-Methods`: `'GET,POST,OPTIONS'`

API Gateway static mapping values require single quotes.

---

# 10. DynamoDB Tables

## 10.1 amazon_seller_customers

Primary key:

- PK: `customer_id`

All values are Strings.

Fields:

- `customer_id`
- `customer_name`
- `company_name`
- `email`
- `phone`
- `cognito_user_id`
- `subscription_plan`
- `subscription_status`
- `subscription_start_date`
- `subscription_end_date`
- `gstin`
- `pan`
- `address_line1`
- `address_line2`
- `city`
- `state`
- `postal_code`
- `country`
- `currency`
- `timezone`
- `status`
- `admin`
- `created_at`
- `updated_at`

Defaults:

- `country = IN`
- `currency = INR`
- `timezone = Asia/Kolkata`
- `status = ACTIVE`
- `admin = N`

No password is stored.

No Amazon account connection fields are currently part of this table.

---

## 10.2 amazon_seller_products

Primary key:

- PK: `product_id`

No sort key.

No `customer_id`.

Fields:

- `product_id`
- `asin`
- `sku`
- `product_title`
- `brand`
- `category`
- `subcategory`
- `product_url`
- `image_url`
- `selling_price`
- `mrp`
- `discount_percent`
- `coupon_details`
- `rating`
- `review_count`
- `bsr`
- `seller_count`
- `fulfillment_type`
- `amazon_seller_present`
- `estimated_monthly_sales`
- `estimated_monthly_revenue`
- `demand_score`
- `competition_score`
- `opportunity_score`
- `overall_rating`
- `demand_level`
- `competition_level`
- `seasonality_level`
- `competitor_count`
- `competitor_data_json`
- `key_positive_points_json`
- `key_negative_points_json`
- `customer_complaints_json`
- `product_improvement_opportunities_json`
- `ai_summary`
- `ai_recommendation`
- `product_status`
- `data_source`
- `last_market_checked_at`
- `last_competitor_checked_at`
- `last_ai_analyzed_at`
- `item_dimensions`
- `item_weight`
- `is_expiration_dated_product`
- `item_dimensions_source`
- `item_weight_source`
- `item_data_confidence`
- `package_dimensions`
- `package_weight`
- `created_at`
- `updated_at`

The eight physical/logistics fields above have been production-tested successfully through POST and GET.

### Meaning of physical/logistics fields

- `item_dimensions`: item/product dimensions
- `item_weight`: item/product weight
- `is_expiration_dated_product`: String boolean such as `true` / `false`
- `item_dimensions_source`: source identifier such as `AMAZON_CATALOG_API`
- `item_weight_source`: source identifier such as `AMAZON_CATALOG_API`
- `item_data_confidence`: e.g. `HIGH`, `MEDIUM`, `LOW`, `NOT_AVAILABLE`
- `package_dimensions`: package dimensions when available
- `package_weight`: package weight when available

Do not rename these fields.

---

## 10.3 amazon_seller_suppliers

Keys:

- PK: `supplier_id`
- SK: `product_id`

Confirmed GSI:

- Index name: `product_id-index`
- PK: `product_id`
- SK: `supplier_id`
- Projection: All

Fields:

- `supplier_id`
- `product_id`
- `supplier_name`
- `supplier_type`
- `contact_name`
- `email`
- `phone`
- `website`
- `gstin`
- `address_line1`
- `address_line2`
- `city`
- `state`
- `postal_code`
- `country`
- `source`
- `source_supplier_id`
- `source_profile_url`
- `supplier_rating`
- `supplier_verified`
- `supplier_status`
- `years_in_business`
- `business_description`
- `manufacturer_status`
- `private_label_available`
- `customization_available`
- `sample_available`
- `payment_terms`
- `typical_lead_time_days`
- `communication_status`
- `last_contacted_at`
- `last_response_at`
- `ai_supplier_rating`
- `ai_reliability_score`
- `ai_quality_score`
- `ai_response_score`
- `ai_business_score`
- `ai_risk_score`
- `ai_strengths_json`
- `ai_weaknesses_json`
- `ai_risks_json`
- `ai_insights_json`
- `ai_summary`
- `ai_recommendation`
- `ai_confidence_score`
- `last_ai_analyzed_at`
- `last_verified_at`
- `last_checked_at`
- `item_dimensions`
- `item_weight`
- `is_expiration_dated_product`
- `item_dimensions_source`
- `item_weight_source`
- `item_data_confidence`
- `package_dimensions`
- `package_weight`
- `created_at`
- `updated_at`

The eight physical/logistics fields have been production-tested successfully through POST and exact supplier/product GET.

For suppliers, these fields represent supplier-specific item/packaging information. They must not automatically be treated as Amazon catalog truth.

---

## 10.4 amazon_seller_usage

Keys:

- PK: `customer_id`
- SK: `usage_period`

`usage_period` format:

`YYYY-MM`

Fields:

- `customer_id`
- `usage_period`
- `rfq_request_count`
- `supplier_message_count`
- `quotation_response_count`
- `ai_request_count`
- `openai_request_count`
- `openai_input_tokens`
- `openai_output_tokens`
- `openai_estimated_cost`
- `created_at`
- `updated_at`

All counters are Strings.

No `gemini_request_count`.

No `n8n_workflow_count`.

---

## 10.5 amazon_seller_transactions

Keys:

- PK: `customer_id`
- SK: `transaction_id`

Fields:

- `customer_id`
- `transaction_id`
- `product_id`
- `product_snapshot_json`
- `selected_supplier_ids`
- `supplier_snapshot_json`
- `requested_quantity`
- `rfq_details_json`
- `rfq_status`
- `rfq_started_at`
- `response_status`
- `response_count`
- `last_response_checked_at`
- `next_response_check_at`
- `quotations_json`
- `ai_quotation_rating`
- `ai_quotation_analysis_json`
- `ai_recommended_supplier_id`
- `ai_recommendation`
- `ai_confidence_score`
- `last_ai_analyzed_at`
- `user_selected_supplier_id`
- `user_final_decision`
- `final_order_quantity`
- `final_order_price`
- `final_order_value`
- `external_order_reference`
- `order_placed_at`
- `transaction_stage`
- `transaction_status`
- `customer_status`
- `closure_reason`
- `closed_at`
- `last_activity_at`
- `created_at`
- `updated_at`

Transaction stages:

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

`product_snapshot_json` and `supplier_snapshot_json` preserve historical state.

Active transaction UI should show `transaction_status = ACTIVE`.

History should use CLOSED/CANCELLED plus stage/closure reason.

Do not assume a `customer_status` GSI exists.

---

## 10.6 amazon_seller_payments

Keys:

- PK: `customer_id`
- SK: `payment_id`

Fields:

- `customer_id`
- `payment_id`
- `subscription_id`
- `razorpay_order_id`
- `razorpay_payment_id`
- `razorpay_subscription_id`
- `subscription_plan`
- `amount`
- `currency`
- `payment_status`
- `payment_method`
- `subscription_start_date`
- `subscription_end_date`
- `invoice_number`
- `razorpay_signature_verified`
- `email_sent`
- `whatsapp_sent`
- `payment_date`
- `created_at`
- `updated_at`

Payments are audit/compliance records.

Customer table holds current subscription state.

---

## 10.7 amazon_seller_subscriptionPlans

Exact table name:

`amazon_seller_subscriptionPlans`

Primary key:

- PK: `plan_id`

No sort key.

Fields currently supported:

- `plan_id`
- `plan_name`
- `audience`
- `features`
- `duration_days`
- `currency`
- `discount_100`
- `discount_25`
- `discount_50`
- `discount_75`
- `discount_90`
- `discount_default`
- `final_price`
- `gst_percent`
- `original_price`
- `price_includes_gst` (supported but currently optional)
- `status`
- `created_at`
- `updated_at`

### Live BASIC plan

- `plan_id = BASIC`
- `plan_name = Monthly`
- `duration_days = 30`
- `currency = INR`
- `final_price = 999`
- `original_price = 1999`
- `gst_percent = 18`
- `discount_default = 50`
- `status = ACTIVE`
- features: `5 Sellers selection per day | 5 suppliers connection per day | Limited access`

### Live PLATINUM plan

- `plan_id = PLATINUM`
- `plan_name = Quarterly`
- `duration_days = 90`
- `currency = INR`
- `final_price = 9999`
- `original_price = 19999`
- `gst_percent = 18`
- `discount_default = 50`
- `status = ACTIVE`
- features: `unlimited Sellers selection per day | unlimited suppliers connection per day | Unlimited access`

GET is authenticated.

POST is admin-only.

---

## 10.8 amazon_seller_monthly_profit

Keys:

- PK: `customer_id`
- SK: `profit_period`

`profit_period` format:

`YYYY-MM`

Fields:

- `customer_id`
- `profit_period`
- `gross_sales`
- `refunds`
- `net_sales`
- `product_cost`
- `amazon_fees`
- `advertising_cost`
- `shipping_cost`
- `storage_cost`
- `other_costs`
- `net_profit`
- `net_margin_percent`
- `orders_count`
- `units_sold`
- `profit_status`
- `data_source`
- `last_calculated_at`
- `created_at`
- `updated_at`

All are Strings.

Semantics:

`net_sales = gross_sales - refunds`

`net_profit = net_sales - product_cost - amazon_fees - advertising_cost - shipping_cost - storage_cost - other_costs`

`net_margin_percent = net_profit / net_sales * 100`

`profit_status`:

- `ESTIMATED`
- `FINAL`

Current API accepts calculated values supplied by the authorized writer. Automatic calculation ownership may be refined later.

Monthly profit is for financial analytics only.

Do not use it for product/supplier/RFQ workflow tracking.

---

# 11. Subscription API Behavior

`GET /subscription-plans`

- Cognito-authenticated
- exact `plan_id` or active-plan listing
- active list uses `status = ACTIVE`

`POST /subscription-plans`

- Cognito-authenticated
- backend admin-only
- new plans require:
  - `plan_name`
  - `duration_days`
  - `currency`
  - `final_price`
- `status` defaults to `ACTIVE`

---

# 12. Payment Service Behavior

The payment service reads plan configuration from:

`amazon_seller_subscriptionPlans`

It no longer uses the old `SUBSCRIPTION_PLANS_JSON` runtime configuration.

Environment:

`SUBSCRIPTION_PLANS_TABLE = amazon_seller_subscriptionPlans`

Plan mapping:

- `final_price` -> amount
- `currency` -> currency
- `duration_days` -> subscription duration
- `plan_name` -> display name

Create-order behavior:

- frontend sends `customer_id`
- frontend sends `subscription_plan`
- backend verifies Cognito ownership
- Razorpay order notes snapshot trusted plan fields

Order-note snapshot fields include:

- `plan_amount`
- `plan_currency`
- `plan_duration_days`
- `plan_display_name`

Verify behavior uses the order snapshot so later admin plan-price changes do not invalidate an already-created checkout.

Renewal behavior:

- same active plan may extend
- different active plan is blocked
- fresh/inactive customer may subscribe

Successful browser payment must reach `/payments/verify` before activation.

Actual full Razorpay frontend validation is intentionally parked until frontend integration reaches payment work.

---

# 13. Products Service Behavior

`amazon-seller-products-api`

Table environment:

`TABLE_NAME = amazon_seller_products`

Production routes:

- `GET /products`
- `GET /products/{product_id}`
- `POST /products`
- OPTIONS

POST is AWS_IAM.

GET is Cognito at API Gateway.

POST behavior:

- `product_id` may be supplied
- if missing, backend generates a `PROD-...` ID
- supplied fields update existing record
- omitted existing fields remain untouched
- `created_at` is preserved
- `updated_at` refreshes
- product_id cannot be changed
- all application values are converted to Strings

The new eight physical/logistics fields have already passed production POST + GET validation.

---

# 14. Suppliers Service Behavior

`amazon-seller-suppliers-api`

Table environment:

`TABLE_NAME = amazon_seller_suppliers`

Product index environment:

`PRODUCT_INDEX_NAME = product_id-index`

Production routes:

- `GET /suppliers`
- `GET /suppliers/{supplier_id}`
- `GET /suppliers/{supplier_id}/{product_id}`
- `GET /products/{product_id}/suppliers`
- `POST /suppliers`
- OPTIONS

POST is AWS_IAM.

GET is Cognito at API Gateway.

POST behavior:

- requires `supplier_id`
- requires `product_id`
- supplied fields update existing record
- omitted fields remain untouched
- `created_at` is preserved
- `updated_at` refreshes
- keys cannot be changed
- values are Strings

The new eight physical/logistics fields have already passed production POST + exact GET validation.

---

# 15. RFQ Engine

Production routes:

- `GET /rfq/context`
- `POST /rfq/start`
- `POST /rfq/generate`

Ownership:

JWT Cognito `sub` must match the target customer `cognito_user_id`.

Typical RFQ context includes:

- customer
- product
- suppliers
- supplier count

Runtime POST validation is intentionally parked until the frontend is ready.

---

# 16. Quotation Engine

Production routes:

- `GET /quotation/context`
- `POST /quotation/response`
- `POST /quotation/select`
- `POST /quotation/order`
- `POST /quotation/close`

Cognito ownership protection is implemented.

Runtime workflow validation is intentionally parked until frontend integration reaches this stage.

---

# 17. Usage API

Current usage API supports authenticated GET.

Usage data is monthly per customer.

Fields are listed in the `amazon_seller_usage` schema above.

Do not restore public/customer POST usage writes.

Usage writes should remain backend-owned.

---

# 18. Customer Ownership and Security

Authenticated customer access is mapped by:

`Cognito sub -> amazon_seller_customers.cognito_user_id`

Customer-facing APIs must enforce ownership.

Known successful ownership behavior has previously been validated for authenticated customer access.

Admin endpoints must independently verify:

`admin == "Y"`

The frontend must not attempt to bypass these backend rules.

---

# 19. Frontend State Model Recommendation

Recommended top-level frontend state:

```text
auth
  idToken
  accessToken (if retained)
  expiresAt
  authenticated

customer
  customer_id
  customer_name
  email
  subscription_plan
  subscription_status
  subscription_start_date
  subscription_end_date
  admin

selectedProduct
selectedSuppliers
activeTransaction
subscriptionPlans
usage
```

Do not duplicate complete backend datasets unnecessarily in multiple frontend stores.

---

# 20. Recommended Frontend Screens

## Public / Auth

- Login
- Auth callback
- Logout handling

## Customer

- Dashboard
- Profile
- Subscription
- Products
- Product detail
- Suppliers for product
- Supplier detail
- Supplier selection
- RFQ
- Quotations
- Transactions
- Usage
- Payments

## Admin

Visible only when `admin == "Y"`:

- Admin dashboard
- Subscription plan management
- Customer overview where supported by backend authorization
- Monthly profit analytics
- Other admin analytics added later

Backend remains authoritative for every admin operation.

---

# 21. Product Discovery UI

Use:

- `GET /products`
- `GET /products/{product_id}`

Display useful attributes such as:

- product title
- brand
- image
- category/subcategory
- selling price
- MRP
- rating
- review count
- BSR
- seller count
- demand/competition/opportunity indicators
- AI summary/recommendation
- item dimensions
- item weight
- expiration-dated flag
- package dimensions
- package weight
- data confidence/source where useful

Do not assume package dimensions always exist.

---

# 22. Supplier UI

Use:

- `GET /products/{product_id}/suppliers`
- `GET /suppliers/{supplier_id}/{product_id}`

Potential display fields:

- supplier name/type
- location
- rating/verification
- years in business
- manufacturer/private-label/customization/sample flags
- lead time
- payment terms
- AI scores
- AI strengths/weaknesses/risks
- item dimensions/weight
- package dimensions/weight
- data source/confidence

Supplier physical/logistics values can differ from Amazon product values.

---

# 23. API Client Requirements

Create one centralized API layer.

Requirements:

- API base URL from environment/config
- add `Authorization` ID token automatically for Cognito routes
- JSON request/response helpers
- centralized error parsing
- handle 401
- handle 403
- handle 404
- preserve backend error code/message
- support GET query parameters
- support POST JSON
- do not call AWS_IAM product/supplier write endpoints from ordinary customer browser code

Recommended examples:

```text
getCurrentCustomer()
getProducts()
getProduct(productId)
getSuppliers()
getSupplier(supplierId, productId)
getSuppliersForProduct(productId)
getSubscriptionPlans()
getTransactions(customerId)
getUsage(customerId, usagePeriod)
getMonthlyProfit(customerId, profitPeriod)
createPaymentOrder(...)
verifyPayment(...)
getRfqContext(...)
startRfq(...)
generateRfq(...)
getQuotationContext(...)
...
```

---

# 24. Frontend Authentication Flow

Expected sequence:

1. User clicks Login.
2. Generate PKCE verifier/challenge.
3. Redirect to Cognito authorization endpoint.
4. Cognito redirects back with authorization code.
5. Validate state.
6. Exchange code for tokens.
7. Save session auth state.
8. Send ID token as Authorization header.
9. Call `GET /customers`.
10. Store current customer.
11. Use `customer_id` from backend response.
12. Evaluate `admin`.
13. Load customer dashboard.

Logout must clear local auth state and return user to an unauthenticated route.

---

# 25. Backend Validation Status

Already validated successfully in production:

- Cognito Authorization Code + PKCE token acquisition
- authenticated `GET /customers`
- customer ownership behavior
- subscription-plan POST/GET
- monthly-profit admin POST
- monthly-profit exact GET
- monthly-profit history GET
- products POST
- products exact GET
- all 8 new product physical/logistics fields
- suppliers POST
- suppliers exact supplier/product GET
- supplier/product key matching
- all 8 new supplier physical/logistics fields

Do not repeat backend schema redesign for these working areas.

---

# 26. Parked Items

Do not resume unless explicitly requested or reached naturally during frontend implementation:

1. CUST789 non-admin monthly-profit security test
2. Actual Razorpay browser payment flow validation
3. RFQ POST runtime validation
4. Quotation workflow runtime validation
5. n8n RFQ webhook integration

Keep the future n8n configuration concept on radar:

`N8N_RFQ_WEBHOOK_URL`

---

# 27. Secrets and Configuration

Do not commit any actual secret.

Allowed to commit:

- public API base URL
- Cognito app client ID
- Cognito domain
- Cognito pool ID
- public redirect URL
- environment variable names

Never commit:

- AWS access key
- AWS secret key
- AWS session token
- Razorpay secret
- Amazon SP-API refresh token
- SMTP password
- Twilio credentials
- OpenAI API key
- customer password
- Cognito user password

Use environment variables / AWS secrets mechanisms where appropriate.

---

# 28. Suggested Repository Layout

```text
amazon-seller-saas/
|
|-- AGENTS.md
|-- docs/
|   `-- PROJECT_CONTEXT.md
|
|-- frontend/
|   |-- src/
|   |-- public/
|   |-- package.json
|   `-- ...
|
`-- backend/
    |-- amazon-seller-data-api/
    |-- amazon-seller-products-api/
    |-- amazon-seller-suppliers-api/
    |-- amazon-seller-payment-api/
    |-- amazon-seller-rfq-engine-api/
    `-- amazon-seller-quotation-engine-api/
```

Do not move live backend code arbitrarily if the repository already has a stable layout. This is a recommended structure, not a mandatory refactor.

---

# 29. First Frontend Milestone

The first Codex frontend milestone should implement only:

- Cognito login
- Authorization Code + PKCE
- callback handling
- token/session handling
- logout
- authenticated API wrapper
- `GET /customers`
- current customer state
- `admin = Y/N`
- protected routes
- basic authenticated shell/navigation

Acceptance criteria:

1. Unauthenticated user is redirected to login when opening protected pages.
2. Successful Cognito login returns to frontend.
3. Token exchange succeeds.
4. `GET /customers` succeeds with ID token.
5. Current customer renders.
6. Admin navigation appears only for `admin == "Y"`.
7. Logout clears authentication.
8. No backend contract changes were required.

---

# 30. Recommended First Codex Prompt

Use this after the repository is connected:

```text
Read AGENTS.md and docs/PROJECT_CONTEXT.md completely.

Review the existing React frontend and existing backend API contracts.

Do not modify backend API contracts.

Implement the first frontend milestone only:
1. Amazon Cognito Authorization Code + PKCE login
2. callback/token exchange
3. logout
4. session token handling
5. centralized authenticated API client
6. GET /customers
7. current customer state
8. admin Y/N detection
9. protected routes
10. authenticated application shell

Use the existing UI where possible and keep the interface professional and light themed.

Do not implement payments, RFQ, quotations, or new backend routes yet.

Before editing, summarize the files you plan to change. After editing, run the available frontend checks/tests and summarize exactly what changed.
```

---

# 31. Current Development Direction

The backend is not the current bottleneck.

The next priority is:

`React frontend + Cognito + API integration`

Once the authentication foundation is working, proceed in this order:

1. subscription plans
2. products
3. suppliers
4. supplier selection
5. RFQ
6. quotations
7. transactions
8. payments
9. usage
10. admin/monthly-profit analytics

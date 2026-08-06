# Provider Setup

## Identity

The generated identity module uses server-side OpenID Connect authorization-code flow, anti-forgery state, nonce, ID-token signature/issuer/audience/expiry validation, hashed server sessions, and provider-subject account keys.

- Google: create OAuth credentials, register `/api/auth/google/callback`, and set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
- Kakao: enable Kakao Login and OpenID Connect, register `/api/auth/kakao/callback`, enable the client secret, and set `KAKAO_CLIENT_ID` / `KAKAO_CLIENT_SECRET`.

The first production admin can be bootstrapped through `ADMIN_BOOTSTRAP_USER_ID`; move permanent role ownership into the database after initial setup.

## Payment

- Global default: Stripe Checkout. Configure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
- KR default: Toss Payments. Configure `TOSS_CLIENT_KEY` and `TOSS_SECRET_KEY`.
- Payment and entitlement state is written through the billing module only.
- Stripe webhooks are HMAC-verified against the raw request body.
- General Toss payment webhooks are re-verified through the Payment Query API and de-duplicated by transmission ID.
- All POST provider calls use stable idempotency keys.
- Toss recurring billing-key support is not generated yet; a KR subscription product must select and validate a recurring-capable adapter before production.

## Database and environments

Replace the placeholder D1 database IDs and example origins in `wrangler.jsonc`. Apply migrations locally first, then preview/staging/production through the generated release workflow. Production credentials belong in Cloudflare secrets, never in committed files.

## Required sandbox evidence before production

- Google/Kakao login and account linking;
- session creation, expiry, logout, and account deletion;
- Stripe/Toss success, failure, duplicate, replay, delayed webhook, and refund/recovery;
- concurrent credit spend and idempotent replay;
- Admin/CS lookup and audited adjustment;
- Preview → Staging migration and recovery rehearsal.

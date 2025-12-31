# Environment Variables Documentation

This document provides comprehensive documentation for all environment variables used in the Open Event platform. Environment variables are organized by category and include descriptions, examples, and whether they are required.

## Table of Contents

- [Overview](#overview)
- [Client-Side Variables (VITE\_\*)](#client-side-variables-vite_)
- [Backend Variables (Convex)](#backend-variables-convex)
  - [Authentication](#authentication)
  - [AI Providers](#ai-providers)
  - [Payment Processing](#payment-processing)
  - [Email Services](#email-services)
  - [Error Monitoring](#error-monitoring)
  - [Security & Admin](#security--admin)
  - [CORS Configuration](#cors-configuration)
- [Build & Deployment Variables](#build--deployment-variables)
- [Environment-Specific Configuration](#environment-specific-configuration)
- [Security Best Practices](#security-best-practices)

---

## Overview

Open Event uses two types of environment variables:

1. **Client-Side Variables** (prefixed with `VITE_`): Exposed to the browser, bundled into the frontend application
2. **Backend Variables**: Server-side only, set in the Convex Dashboard under Settings > Environment Variables

> ⚠️ **Important**: Never commit `.env` files containing secrets to version control. Use `.env.example` as a template.

---

## Client-Side Variables (VITE\_\*)

These variables are exposed to the browser and must be prefixed with `VITE_`.

### VITE_CONVEX_URL

| Property          | Value                                      |
| ----------------- | ------------------------------------------ |
| **Required**      | ✅ Yes                                     |
| **Type**          | URL                                        |
| **Description**   | The Convex deployment URL for your project |
| **Example**       | `https://your-project.convex.cloud`        |
| **Where to Find** | Convex Dashboard > Project Settings        |

```bash
VITE_CONVEX_URL=https://your-project.convex.cloud
```

### VITE_SENTRY_DSN

| Property          | Value                                               |
| ----------------- | --------------------------------------------------- |
| **Required**      | ⚠️ Recommended for production                       |
| **Type**          | URL                                                 |
| **Description**   | Sentry Data Source Name for frontend error tracking |
| **Example**       | `https://xxx@xxx.ingest.sentry.io/xxx`              |
| **Where to Find** | Sentry Dashboard > Project Settings > Client Keys   |

```bash
VITE_SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/1234567
```

### VITE_STRIPE_PUBLIC_KEY

| Property          | Value                                                      |
| ----------------- | ---------------------------------------------------------- |
| **Required**      | ⚠️ Required for payments                                   |
| **Type**          | String                                                     |
| **Description**   | Stripe publishable key for client-side payment integration |
| **Example**       | `pk_test_...` or `pk_live_...`                             |
| **Where to Find** | Stripe Dashboard > Developers > API Keys                   |

```bash
VITE_STRIPE_PUBLIC_KEY=pk_test_51ABC123...
```

---

## Backend Variables (Convex)

Set these in the **Convex Dashboard** under Settings > Environment Variables. These run on Convex's servers and are never exposed to the client.

### Authentication

#### SITE_URL

| Property        | Value                                                                  |
| --------------- | ---------------------------------------------------------------------- |
| **Required**    | ✅ Yes (for production)                                                |
| **Type**        | URL                                                                    |
| **Description** | Base URL of your application, used for OAuth redirects and magic links |
| **Default**     | `http://localhost:5173` (development)                                  |
| **Example**     | `https://your-domain.com`                                              |

```bash
SITE_URL=https://openevent.app
```

#### CONVEX_SITE_URL

| Property        | Value                                  |
| --------------- | -------------------------------------- |
| **Required**    | ⚠️ Auto-configured by Convex           |
| **Type**        | URL                                    |
| **Description** | Convex site URL for auth configuration |
| **Example**     | `https://your-project.convex.site`     |

#### JWT_PRIVATE_KEY

| Property        | Value                                                                              |
| --------------- | ---------------------------------------------------------------------------------- |
| **Required**    | ✅ Yes                                                                             |
| **Type**        | PEM-encoded RSA private key                                                        |
| **Description** | Private key for signing JWT tokens                                                 |
| **Format**      | Must include `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` markers |

```bash
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASC...
-----END PRIVATE KEY-----"
```

#### JWKS

| Property        | Value                                 |
| --------------- | ------------------------------------- |
| **Required**    | ✅ Yes                                |
| **Type**        | JSON                                  |
| **Description** | JSON Web Key Set for JWT verification |
| **Format**      | JSON object with `keys` array         |

```bash
JWKS='{"keys":[{"kty":"RSA","n":"...","e":"AQAB","alg":"RS256","use":"sig"}]}'
```

#### AUTH_GOOGLE_ID

| Property          | Value                                                                     |
| ----------------- | ------------------------------------------------------------------------- |
| **Required**      | ⚠️ Required for Google OAuth                                              |
| **Type**          | String                                                                    |
| **Description**   | Google OAuth 2.0 Client ID                                                |
| **Where to Find** | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |

```bash
AUTH_GOOGLE_ID=123456789-abc123.apps.googleusercontent.com
```

#### AUTH_GOOGLE_SECRET

| Property          | Value                                                                     |
| ----------------- | ------------------------------------------------------------------------- |
| **Required**      | ⚠️ Required for Google OAuth                                              |
| **Type**          | String                                                                    |
| **Description**   | Google OAuth 2.0 Client Secret                                            |
| **Where to Find** | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |

```bash
AUTH_GOOGLE_SECRET=GOCSPX-abc123...
```

---

### AI Providers

#### OPENAI_API_KEY

| Property          | Value                                                   |
| ----------------- | ------------------------------------------------------- |
| **Required**      | ⚠️ Required for AI features                             |
| **Type**          | String                                                  |
| **Description**   | OpenAI API key for GPT-4o-mini powered AI assistant     |
| **Where to Find** | [OpenAI Platform](https://platform.openai.com/api-keys) |
| **Prefix**        | `sk-`                                                   |

```bash
OPENAI_API_KEY=sk-proj-abc123...
```

#### ANTHROPIC_API_KEY

| Property          | Value                                                      |
| ----------------- | ---------------------------------------------------------- |
| **Required**      | ❌ Optional (alternative AI provider)                      |
| **Type**          | String                                                     |
| **Description**   | Anthropic API key for Claude models (fallback/alternative) |
| **Where to Find** | [Anthropic Console](https://console.anthropic.com/)        |
| **Prefix**        | `sk-ant-`                                                  |

```bash
ANTHROPIC_API_KEY=sk-ant-api03-abc123...
```

---

### Payment Processing

#### STRIPE_SECRET_KEY

| Property          | Value                                                |
| ----------------- | ---------------------------------------------------- |
| **Required**      | ⚠️ Required for payments                             |
| **Type**          | String                                               |
| **Description**   | Stripe secret key for server-side payment operations |
| **Where to Find** | Stripe Dashboard > Developers > API Keys             |
| **Prefix**        | `sk_test_` or `sk_live_`                             |

```bash
STRIPE_SECRET_KEY=sk_test_51ABC123...
```

#### STRIPE_PUBLISHABLE_KEY

| Property        | Value                                      |
| --------------- | ------------------------------------------ |
| **Required**    | ⚠️ Required for payments                   |
| **Type**        | String                                     |
| **Description** | Stripe publishable key (backend reference) |
| **Prefix**      | `pk_test_` or `pk_live_`                   |

```bash
STRIPE_PUBLISHABLE_KEY=pk_test_51ABC123...
```

#### STRIPE_WEBHOOK_SECRET

| Property          | Value                                                          |
| ----------------- | -------------------------------------------------------------- |
| **Required**      | ⚠️ Required for payment webhooks                               |
| **Type**          | String                                                         |
| **Description**   | Stripe webhook signing secret for verifying webhook signatures |
| **Where to Find** | Stripe Dashboard > Developers > Webhooks > Signing secret      |
| **Prefix**        | `whsec_`                                                       |

```bash
STRIPE_WEBHOOK_SECRET=whsec_abc123...
```

---

### Email Services

#### AUTH_RESEND_KEY

| Property          | Value                                                                        |
| ----------------- | ---------------------------------------------------------------------------- |
| **Required**      | ⚠️ Required for email features                                               |
| **Type**          | String                                                                       |
| **Description**   | Resend API key for sending transactional emails (magic links, notifications) |
| **Where to Find** | [Resend Dashboard](https://resend.com/api-keys)                              |
| **Prefix**        | `re_`                                                                        |

```bash
AUTH_RESEND_KEY=re_abc123...
```

#### EMAIL_FROM

| Property        | Value                                |
| --------------- | ------------------------------------ |
| **Required**    | ❌ Optional                          |
| **Type**        | Email address with name              |
| **Description** | "From" address for outgoing emails   |
| **Default**     | `Open Event <noreply@openevent.com>` |

```bash
EMAIL_FROM="Your App <noreply@yourdomain.com>"
```

---

### Error Monitoring

#### SENTRY_DSN

| Property          | Value                                             |
| ----------------- | ------------------------------------------------- |
| **Required**      | ⚠️ Recommended for production                     |
| **Type**          | URL                                               |
| **Description**   | Sentry DSN for backend error tracking             |
| **Where to Find** | Sentry Dashboard > Project Settings > Client Keys |

```bash
SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/1234567
```

---

### Security & Admin

#### SUPERADMIN_SETUP_KEY

| Property        | Value                                                |
| --------------- | ---------------------------------------------------- |
| **Required**    | ⚠️ One-time setup                                    |
| **Type**        | String                                               |
| **Description** | Secret key for promoting the first superadmin user   |
| **Usage**       | Used once during initial setup, can be removed after |
| **Security**    | Generate a secure random string (32+ characters)     |

```bash
SUPERADMIN_SETUP_KEY=your-secure-random-string-here-abc123xyz789
```

#### NODE_ENV

| Property        | Value                               |
| --------------- | ----------------------------------- |
| **Required**    | ❌ Optional                         |
| **Type**        | String                              |
| **Description** | Environment mode                    |
| **Values**      | `development`, `production`, `test` |
| **Default**     | `development`                       |

```bash
NODE_ENV=production
```

---

### CORS Configuration

#### ALLOWED_ORIGINS

| Property            | Value                                                               |
| ------------------- | ------------------------------------------------------------------- |
| **Required**        | ❌ Optional                                                         |
| **Type**            | Comma-separated URLs                                                |
| **Description**     | Additional allowed origins for CORS                                 |
| **Default Origins** | `localhost:5173`, `localhost:3000`, `openevent.my`, `openevent.app` |

```bash
ALLOWED_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com
```

---

### Alerting (Optional)

#### ALERT_EMAIL

| Property        | Value                                     |
| --------------- | ----------------------------------------- |
| **Required**    | ❌ Optional                               |
| **Type**        | Email address                             |
| **Description** | Email address for receiving system alerts |

```bash
ALERT_EMAIL=alerts@yourdomain.com
```

#### SLACK_WEBHOOK_URL

| Property        | Value                                     |
| --------------- | ----------------------------------------- |
| **Required**    | ❌ Optional                               |
| **Type**        | URL                                       |
| **Description** | Slack webhook URL for alert notifications |

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR_WORKSPACE/YOUR_CHANNEL/YOUR_TOKEN
```

#### PAGERDUTY_API_KEY

| Property        | Value                                 |
| --------------- | ------------------------------------- |
| **Required**    | ❌ Optional                           |
| **Type**        | String                                |
| **Description** | PagerDuty API key for incident alerts |

```bash
PAGERDUTY_API_KEY=your-pagerduty-api-key
```

#### PAGERDUTY_ROUTING_KEY

| Property        | Value                                   |
| --------------- | --------------------------------------- |
| **Required**    | ❌ Optional                             |
| **Type**        | String                                  |
| **Description** | PagerDuty routing key for event routing |

```bash
PAGERDUTY_ROUTING_KEY=your-routing-key
```

---

## Build & Deployment Variables

These variables are used during the build process and CI/CD.

### SENTRY_AUTH_TOKEN

| Property          | Value                                       |
| ----------------- | ------------------------------------------- |
| **Required**      | ⚠️ Required for source maps                 |
| **Type**          | String                                      |
| **Description**   | Sentry auth token for uploading source maps |
| **Where to Find** | Sentry Dashboard > Settings > Auth Tokens   |
| **Prefix**        | `sntryu_`                                   |

```bash
SENTRY_AUTH_TOKEN=sntryu_abc123...
```

### SENTRY_ORG

| Property        | Value                              |
| --------------- | ---------------------------------- |
| **Required**    | ⚠️ Required with SENTRY_AUTH_TOKEN |
| **Type**        | String                             |
| **Description** | Sentry organization slug           |

```bash
SENTRY_ORG=your-org-slug
```

### SENTRY_PROJECT

| Property        | Value                              |
| --------------- | ---------------------------------- |
| **Required**    | ⚠️ Required with SENTRY_AUTH_TOKEN |
| **Type**        | String                             |
| **Description** | Sentry project slug                |

```bash
SENTRY_PROJECT=javascript-react
```

### CI

| Property        | Value                               |
| --------------- | ----------------------------------- |
| **Required**    | ❌ Auto-set by CI systems           |
| **Type**        | Boolean string                      |
| **Description** | Indicates running in CI environment |

```bash
CI=true
```

---

## Environment-Specific Configuration

### Development (.env.local)

```bash
# Minimal development setup
VITE_CONVEX_URL=https://your-dev-project.convex.cloud

# Optional: Enable AI features locally
OPENAI_API_KEY=sk-...

# Optional: Test payments
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

### Staging

```bash
# Full staging configuration
VITE_CONVEX_URL=https://your-staging-project.convex.cloud
VITE_SENTRY_DSN=https://...@sentry.io/...
VITE_STRIPE_PUBLIC_KEY=pk_test_...

# Backend (set in Convex Dashboard)
SITE_URL=https://staging.yourdomain.com
NODE_ENV=staging
```

### Production

```bash
# Full production configuration
VITE_CONVEX_URL=https://your-prod-project.convex.cloud
VITE_SENTRY_DSN=https://...@sentry.io/...
VITE_STRIPE_PUBLIC_KEY=pk_live_...

# Backend (set in Convex Dashboard)
SITE_URL=https://yourdomain.com
NODE_ENV=production
STRIPE_SECRET_KEY=sk_live_...
```

---

## Security Best Practices

### Do's ✅

1. **Use `.env.example`** as a template without real values
2. **Set backend variables in Convex Dashboard** - never in code
3. **Rotate secrets regularly** - especially after team member departures
4. **Use different keys per environment** - dev, staging, production
5. **Validate environment variables on startup** - fail fast with clear errors
6. **Use strong, random values** for secrets like `SUPERADMIN_SETUP_KEY`

### Don'ts ❌

1. **Never commit `.env` files** to version control
2. **Never expose backend secrets** in client-side code
3. **Never share API keys** in chat, email, or tickets
4. **Never use production keys** in development
5. **Never hardcode secrets** in source code

### Generating Secure Keys

```bash
# Generate a secure random string (Linux/macOS)
openssl rand -base64 32

# Generate a secure random string (Node.js)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Quick Reference

| Variable                 | Required    | Environment | Description             |
| ------------------------ | ----------- | ----------- | ----------------------- |
| `VITE_CONVEX_URL`        | ✅          | Client      | Convex deployment URL   |
| `VITE_SENTRY_DSN`        | ⚠️ Prod     | Client      | Frontend error tracking |
| `VITE_STRIPE_PUBLIC_KEY` | ⚠️ Payments | Client      | Stripe publishable key  |
| `SITE_URL`               | ✅ Prod     | Backend     | Application base URL    |
| `JWT_PRIVATE_KEY`        | ✅          | Backend     | JWT signing key         |
| `JWKS`                   | ✅          | Backend     | JWT verification keys   |
| `AUTH_GOOGLE_ID`         | ⚠️ OAuth    | Backend     | Google OAuth client ID  |
| `AUTH_GOOGLE_SECRET`     | ⚠️ OAuth    | Backend     | Google OAuth secret     |
| `OPENAI_API_KEY`         | ⚠️ AI       | Backend     | OpenAI API key          |
| `ANTHROPIC_API_KEY`      | ❌          | Backend     | Anthropic API key       |
| `STRIPE_SECRET_KEY`      | ⚠️ Payments | Backend     | Stripe secret key       |
| `STRIPE_WEBHOOK_SECRET`  | ⚠️ Payments | Backend     | Stripe webhook secret   |
| `AUTH_RESEND_KEY`        | ⚠️ Email    | Backend     | Resend API key          |
| `EMAIL_FROM`             | ❌          | Backend     | Email sender address    |
| `SENTRY_DSN`             | ⚠️ Prod     | Backend     | Backend error tracking  |
| `SUPERADMIN_SETUP_KEY`   | ⚠️ Setup    | Backend     | Initial admin setup     |
| `ALLOWED_ORIGINS`        | ❌          | Backend     | Additional CORS origins |

**Legend:**

- ✅ Required
- ⚠️ Conditionally required
- ❌ Optional

---

## Troubleshooting

### Common Issues

1. **"Convex URL not configured"**
   - Ensure `VITE_CONVEX_URL` is set in your `.env` file
   - Restart the dev server after changing environment variables

2. **"AI service authentication failed"**
   - Verify `OPENAI_API_KEY` is set in Convex Dashboard
   - Check the API key is valid and has sufficient credits

3. **"OAuth redirect failed"**
   - Ensure `SITE_URL` matches your application URL
   - Verify Google OAuth credentials are configured correctly

4. **"Payment processing unavailable"**
   - Check both `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` are set
   - Verify you're using matching test/live keys

5. **"Email sending failed"**
   - Verify `AUTH_RESEND_KEY` is set in Convex Dashboard
   - Check your Resend account has verified sending domains

### Validation

Use the health check endpoint to verify configuration:

```bash
curl https://your-project.convex.site/api/health/config
```

This returns the status of all required environment variables.

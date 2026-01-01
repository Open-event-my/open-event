# Open Event Public API Documentation

The Open Event API allows you to programmatically manage events, access vendor/sponsor directories, and receive real-time notifications via webhooks.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Response Format](#response-format)
5. [Endpoints](#endpoints)
   - [Events](#events)
   - [Vendors](#vendors)
   - [Sponsors](#sponsors)
   - [Webhooks](#webhooks)
   - [Public Endpoints](#public-endpoints)
6. [Webhooks](#webhooks-system)
7. [Error Codes](#error-codes)
8. [SDKs & Examples](#sdks--examples)

---

## Getting Started

### Base URL

```
https://your-project.convex.site/api/v1
```

### Quick Start

1. **Get an API Key** from your dashboard settings
2. **Make your first request:**

```bash
curl -H "X-API-Key: oe_live_your_key_here" \
  https://your-project.convex.site/api/v1/events
```

---

## Authentication

All API requests (except public endpoints) require an API key.

### Obtaining an API Key

1. Log in to Open Event
2. Go to Settings → API Keys
3. Click "Create New API Key"
4. Select the permissions you need
5. **Save the key immediately** - you won't be able to see it again!

### Using Your API Key

Include your API key in requests using one of these methods:

**Option 1: X-API-Key Header (Recommended)**

```bash
curl -H "X-API-Key: oe_live_abc123..." \
  https://your-project.convex.site/api/v1/events
```

**Option 2: Authorization Header**

```bash
curl -H "Authorization: Bearer oe_live_abc123..." \
  https://your-project.convex.site/api/v1/events
```

### API Key Format

```
oe_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
│  │    └──────────────────────────┴── 32 random characters
│  └─────────────────────────────────── Environment (live/test)
└────────────────────────────────────── Prefix (Open Event)
```

### Permission Scopes

| Permission      | Description              |
| --------------- | ------------------------ |
| `events:read`   | Read events              |
| `events:write`  | Create and update events |
| `events:delete` | Delete events            |
| `vendors:read`  | Read vendor directory    |
| `sponsors:read` | Read sponsor directory   |
| `tasks:read`    | Read event tasks         |
| `tasks:write`   | Create and update tasks  |
| `budget:read`   | Read budget items        |
| `budget:write`  | Create and update budget |
| `*`             | Full access (admin)      |

---

## Rate Limiting

API requests are rate limited to protect the service.

### Default Limits

| Tier    | Limit               |
| ------- | ------------------- |
| Default | 1,000 requests/hour |

### Rate Limit Headers

Every response includes rate limit information:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1699900000000
```

### Exceeding Limits

When rate limited, you'll receive:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 1832 seconds."
  }
}
```

**HTTP Status:** `429 Too Many Requests`

---

## Response Format

All responses follow a consistent JSON envelope.

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "meta": {
    // Optional metadata (pagination, etc.)
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [] // Optional additional details
  }
}
```

### Pagination

List endpoints support pagination:

```
GET /api/v1/events?page=1&limit=20
```

Paginated responses include:

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasMore": true
  }
}
```

---

## Endpoints

### Events

#### List Events

```
GET /api/v1/events
```

**Query Parameters:**

| Parameter | Type   | Description                                                               |
| --------- | ------ | ------------------------------------------------------------------------- |
| `page`    | number | Page number (default: 1)                                                  |
| `limit`   | number | Items per page (default: 20, max: 100)                                    |
| `status`  | string | Filter by status: `draft`, `planning`, `active`, `completed`, `cancelled` |

**Example:**

```bash
curl -H "X-API-Key: oe_live_xxx" \
  "https://your-project.convex.site/api/v1/events?status=active&limit=10"
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "abc123",
      "title": "Tech Conference 2025",
      "description": "Annual technology conference",
      "startDate": 1735689600000,
      "endDate": 1735776000000,
      "status": "active",
      "eventType": "conference",
      "locationType": "in-person",
      "venueName": "Convention Center",
      "expectedAttendees": 500,
      "budget": 50000,
      "createdAt": 1699900000000
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3,
    "hasMore": true
  }
}
```

---

#### Get Event

```
GET /api/v1/events/:id
```

**Example:**

```bash
curl -H "X-API-Key: oe_live_xxx" \
  https://your-project.convex.site/api/v1/events/abc123
```

---

#### Create Event

```
POST /api/v1/events
```

**Required Permission:** `events:write`

**Request Body:**

| Field               | Type   | Required | Description                                                 |
| ------------------- | ------ | -------- | ----------------------------------------------------------- |
| `title`             | string | ✅       | Event title (max 200 chars)                                 |
| `startDate`         | number | ✅       | Unix timestamp (milliseconds)                               |
| `description`       | string |          | Event description (max 10,000 chars)                        |
| `eventType`         | string |          | Type: `conference`, `hackathon`, `workshop`, `meetup`, etc. |
| `status`            | string |          | Status: `draft` (default), `planning`, `active`             |
| `locationType`      | string |          | `in-person`, `virtual`, `hybrid`                            |
| `venueName`         | string |          | Venue name                                                  |
| `venueAddress`      | string |          | Venue address                                               |
| `virtualPlatform`   | string |          | Virtual platform URL                                        |
| `expectedAttendees` | number |          | Expected number of attendees                                |
| `budget`            | number |          | Event budget                                                |
| `budgetCurrency`    | string |          | Currency code (e.g., `USD`)                                 |
| `endDate`           | number |          | End date (Unix timestamp)                                   |
| `timezone`          | string |          | Timezone (e.g., `America/New_York`)                         |

**Example:**

```bash
curl -X POST \
  -H "X-API-Key: oe_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Tech Conference 2025",
    "startDate": 1735689600000,
    "eventType": "conference",
    "locationType": "in-person",
    "venueName": "Convention Center",
    "expectedAttendees": 500,
    "budget": 50000,
    "budgetCurrency": "USD"
  }' \
  https://your-project.convex.site/api/v1/events
```

**Response:**

```json
{
  "success": true,
  "data": {
    "eventId": "abc123"
  },
  "meta": {
    "created": true
  }
}
```

---

#### Update Event

```
PATCH /api/v1/events/:id
```

**Required Permission:** `events:write`

**Request Body:** Any fields from the create endpoint (all optional)

**Example:**

```bash
curl -X PATCH \
  -H "X-API-Key: oe_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "planning",
    "budget": 75000
  }' \
  https://your-project.convex.site/api/v1/events/abc123
```

**Status Transitions:**

Events follow a state machine:

```
draft → planning → active → completed
  ↓        ↓         ↓
cancelled ← ← ← ← ← ←
```

---

#### Delete Event

```
DELETE /api/v1/events/:id
```

**Required Permission:** `events:delete`

**Note:** Cannot delete active events with confirmed vendors/sponsors.

**Example:**

```bash
curl -X DELETE \
  -H "X-API-Key: oe_live_xxx" \
  https://your-project.convex.site/api/v1/events/abc123
```

---

### Vendors

#### List Vendors

```
GET /api/v1/vendors
```

**Required Permission:** `vendors:read`

**Query Parameters:**

| Parameter  | Type   | Description                |
| ---------- | ------ | -------------------------- |
| `page`     | number | Page number                |
| `limit`    | number | Items per page             |
| `category` | string | Filter by category         |
| `search`   | string | Search by name/description |

**Example:**

```bash
curl -H "X-API-Key: oe_live_xxx" \
  "https://your-project.convex.site/api/v1/vendors?category=catering"
```

---

#### Get Vendor Categories

```
GET /api/v1/vendors/categories
```

Returns list of available vendor categories.

---

### Sponsors

#### List Sponsors

```
GET /api/v1/sponsors
```

**Required Permission:** `sponsors:read`

**Query Parameters:**

| Parameter  | Type   | Description                |
| ---------- | ------ | -------------------------- |
| `page`     | number | Page number                |
| `limit`    | number | Items per page             |
| `industry` | string | Filter by industry         |
| `search`   | string | Search by name/description |

---

### Webhooks

#### List Webhooks

```
GET /api/v1/webhooks
```

**Required Permission:** `*` (admin)

---

#### Create Webhook

```
POST /api/v1/webhooks
```

**Required Permission:** `*` (admin)

**Request Body:**

| Field    | Type     | Required | Description            |
| -------- | -------- | -------- | ---------------------- |
| `name`   | string   | ✅       | Webhook name           |
| `url`    | string   | ✅       | HTTPS endpoint URL     |
| `events` | string[] | ✅       | Events to subscribe to |

**Example:**

```bash
curl -X POST \
  -H "X-API-Key: oe_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My App Webhook",
    "url": "https://example.com/webhook",
    "events": ["event.created", "event.updated"]
  }' \
  https://your-project.convex.site/api/v1/webhooks
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "webhook123",
    "secret": "whsec_abc123...",
    "message": "Save this secret securely. You will not be able to see it again."
  }
}
```

---

#### Get Available Webhook Events

```
GET /api/v1/webhooks/events
```

Returns list of available webhook events (no auth required).

---

#### Update Webhook

```
PATCH /api/v1/webhooks/:id
```

**Request Body:**

| Field    | Type     | Description             |
| -------- | -------- | ----------------------- |
| `name`   | string   | New name                |
| `url`    | string   | New URL                 |
| `events` | string[] | New event subscriptions |
| `status` | string   | `active` or `paused`    |

---

#### Delete Webhook

```
DELETE /api/v1/webhooks/:id
```

---

### Public Endpoints

These endpoints don't require authentication.

#### Public Events

```
GET /api/v1/public/events
```

Lists events marked as public.

**Query Parameters:**

| Parameter         | Type    | Description                  |
| ----------------- | ------- | ---------------------------- |
| `eventType`       | string  | Filter by event type         |
| `locationType`    | string  | Filter by location type      |
| `seekingVendors`  | boolean | Only events seeking vendors  |
| `seekingSponsors` | boolean | Only events seeking sponsors |
| `search`          | string  | Search query                 |

---

#### Public Vendors

```
GET /api/v1/public/vendors
```

Lists approved vendors (limited fields, no contact info).

**Query Parameters:**

| Parameter  | Type   | Description        |
| ---------- | ------ | ------------------ |
| `category` | string | Filter by category |
| `search`   | string | Search query       |

---

#### Public Vendor Categories

```
GET /api/v1/public/vendors/categories
```

Lists available vendor categories.

---

## Webhooks System

Webhooks allow you to receive real-time notifications when events occur.

### Available Events

| Event                  | Description                |
| ---------------------- | -------------------------- |
| `event.created`        | New event created          |
| `event.updated`        | Event details updated      |
| `event.deleted`        | Event deleted              |
| `event.status_changed` | Event status changed       |
| `vendor.applied`       | Vendor applied to event    |
| `vendor.confirmed`     | Vendor confirmed for event |
| `vendor.declined`      | Vendor declined            |
| `sponsor.applied`      | Sponsor applied to event   |
| `sponsor.confirmed`    | Sponsor confirmed          |
| `sponsor.declined`     | Sponsor declined           |
| `task.created`         | Task created               |
| `task.completed`       | Task completed             |

### Webhook Payload

```json
{
  "id": "wh_1699900000_abc123",
  "event": "event.created",
  "timestamp": 1699900000000,
  "data": {
    "eventId": "abc123",
    "title": "Tech Conference 2025",
    "status": "draft"
  }
}
```

### Verifying Signatures

Webhooks are signed with your webhook secret. Verify signatures to ensure authenticity:

```javascript
const crypto = require('crypto')

function verifyWebhookSignature(payload, signature, timestamp, secret) {
  const signedPayload = `${timestamp}.${payload}`
  const expectedSignature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex')

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
}
```

### Headers

Webhook requests include:

| Header                    | Description           |
| ------------------------- | --------------------- |
| `X-OpenEvent-Signature`   | HMAC-SHA256 signature |
| `X-OpenEvent-Timestamp`   | Request timestamp     |
| `X-OpenEvent-Event`       | Event type            |
| `X-OpenEvent-Delivery-Id` | Unique delivery ID    |

### Retry Policy

Failed deliveries are retried with exponential backoff:

- 1st retry: 1 minute
- 2nd retry: 5 minutes
- 3rd retry: 30 minutes
- 4th retry: 1 hour

After 5 consecutive failures, the webhook is automatically disabled.

---

## Error Codes

| Code                  | HTTP Status | Description                |
| --------------------- | ----------- | -------------------------- |
| `UNAUTHORIZED`        | 401         | Invalid or missing API key |
| `FORBIDDEN`           | 403         | Insufficient permissions   |
| `NOT_FOUND`           | 404         | Resource not found         |
| `BAD_REQUEST`         | 400         | Invalid request            |
| `VALIDATION_ERROR`    | 400         | Request validation failed  |
| `RATE_LIMIT_EXCEEDED` | 429         | Too many requests          |
| `INTERNAL_ERROR`      | 500         | Server error               |

---

## SDKs & Examples

### JavaScript/TypeScript

```javascript
// Using fetch
async function listEvents(apiKey) {
  const response = await fetch('https://your-project.convex.site/api/v1/events', {
    headers: {
      'X-API-Key': apiKey,
    },
  })

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error.message)
  }

  return data.data
}

// Create event
async function createEvent(apiKey, eventData) {
  const response = await fetch('https://your-project.convex.site/api/v1/events', {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventData),
  })

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error.message)
  }

  return data.data
}
```

### Python

```python
import requests

API_KEY = 'oe_live_xxx'
BASE_URL = 'https://your-project.convex.site/api/v1'

def list_events():
    response = requests.get(
        f'{BASE_URL}/events',
        headers={'X-API-Key': API_KEY}
    )
    data = response.json()

    if not data['success']:
        raise Exception(data['error']['message'])

    return data['data']

def create_event(event_data):
    response = requests.post(
        f'{BASE_URL}/events',
        headers={
            'X-API-Key': API_KEY,
            'Content-Type': 'application/json'
        },
        json=event_data
    )
    data = response.json()

    if not data['success']:
        raise Exception(data['error']['message'])

    return data['data']

# Usage
events = list_events()
new_event = create_event({
    'title': 'My Event',
    'startDate': 1735689600000,
    'eventType': 'conference'
})
```

### cURL

```bash
# List events
curl -H "X-API-Key: oe_live_xxx" \
  https://your-project.convex.site/api/v1/events

# Create event
curl -X POST \
  -H "X-API-Key: oe_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"title": "My Event", "startDate": 1735689600000}' \
  https://your-project.convex.site/api/v1/events

# Update event
curl -X PATCH \
  -H "X-API-Key: oe_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"status": "planning"}' \
  https://your-project.convex.site/api/v1/events/EVENT_ID

# Delete event
curl -X DELETE \
  -H "X-API-Key: oe_live_xxx" \
  https://your-project.convex.site/api/v1/events/EVENT_ID
```

---

## Support

- **GitHub Issues:** [Report bugs or request features](https://github.com/hazlijohar95/open-event/issues)
- **Documentation:** [Full documentation](https://github.com/hazlijohar95/open-event)

---

## Changelog

### v1.0.0 (Initial Release)

- Events API (CRUD)
- Vendors API (read)
- Sponsors API (read)
- Webhooks API
- API key authentication
- Rate limiting
- Public endpoints

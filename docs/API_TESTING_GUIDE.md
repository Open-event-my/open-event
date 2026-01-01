# API Testing Guide

This guide walks you through testing the Open Event Public API locally.

## Prerequisites

- Node.js 18+
- A Convex account ([convex.dev](https://convex.dev))
- Your Convex deployment URL in `.env`

---

## Step 1: Start the Development Servers

Open a terminal and run:

```bash
npm run dev:all
```

This starts:

- Frontend at `http://localhost:5173`
- Convex backend (your API)

Your API base URL will be:

```
https://your-project.convex.site/api/v1
```

You can find your exact Convex URL in:

- `.env` file (`VITE_CONVEX_URL`)
- Or Convex Dashboard → Settings → Deployment URL

---

## Step 2: Create a User Account

1. Open `http://localhost:5173` in your browser
2. Sign up for an account
3. Complete the onboarding flow

---

## Step 3: Create an API Key

### Option A: Via Convex Dashboard (Easiest for Testing)

1. Go to [dashboard.convex.dev](https://dashboard.convex.dev)
2. Select your project
3. Go to **Data** tab
4. Click on **Functions** → **apiKeys** → **create**
5. Run the mutation with:

```json
{
  "name": "Test API Key",
  "permissions": ["*"],
  "environment": "live"
}
```

6. **Copy the returned `key` value** - you'll need this!

### Option B: Via Code (Create a Test Script)

Create a file `scripts/create-api-key.ts`:

```typescript
// This is for testing only
// In production, users create keys via the dashboard UI

import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api'

const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL!)

async function createTestKey() {
  // Note: This requires authentication
  // For testing, use the Convex Dashboard instead
  const result = await client.mutation(api.apiKeys.create, {
    name: 'Test Key',
    permissions: ['*'],
  })

  console.log('API Key created!')
  console.log('Key:', result.key)
  console.log("Save this key - you won't see it again!")
}
```

---

## Step 4: Test the API Endpoints

Replace `YOUR_CONVEX_URL` with your actual Convex deployment URL (e.g., `https://happy-animal-123.convex.site`).

Replace `YOUR_API_KEY` with the API key you created.

### Health Check (No Auth)

```bash
curl https://YOUR_CONVEX_URL/api/health
```

Expected response:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": 1699900000000,
    "version": "1.0.0"
  }
}
```

### API Info (No Auth)

```bash
curl https://YOUR_CONVEX_URL/api/v1
```

### Public Events (No Auth)

```bash
curl https://YOUR_CONVEX_URL/api/v1/public/events
```

### Public Vendors (No Auth)

```bash
curl https://YOUR_CONVEX_URL/api/v1/public/vendors
```

---

## Step 5: Test Authenticated Endpoints

### List Your Events

```bash
curl -H "X-API-Key: YOUR_API_KEY" \
  https://YOUR_CONVEX_URL/api/v1/events
```

### Create an Event

```bash
curl -X POST \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Conference 2025",
    "startDate": 1735689600000,
    "eventType": "conference",
    "locationType": "in-person",
    "venueName": "Test Venue",
    "expectedAttendees": 100,
    "budget": 10000
  }' \
  https://YOUR_CONVEX_URL/api/v1/events
```

Expected response:

```json
{
  "success": true,
  "data": {
    "eventId": "abc123..."
  },
  "meta": {
    "created": true
  }
}
```

### Get Event by ID

```bash
curl -H "X-API-Key: YOUR_API_KEY" \
  https://YOUR_CONVEX_URL/api/v1/events/EVENT_ID
```

### Update Event

```bash
curl -X PATCH \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "planning", "budget": 15000}' \
  https://YOUR_CONVEX_URL/api/v1/events/EVENT_ID
```

### Delete Event

```bash
curl -X DELETE \
  -H "X-API-Key: YOUR_API_KEY" \
  https://YOUR_CONVEX_URL/api/v1/events/EVENT_ID
```

---

## Step 6: Test Error Handling

### Missing API Key

```bash
curl https://YOUR_CONVEX_URL/api/v1/events
```

Expected:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "API key required. Provide via X-API-Key header or Authorization: Bearer token."
  }
}
```

### Invalid API Key

```bash
curl -H "X-API-Key: oe_live_invalid_key" \
  https://YOUR_CONVEX_URL/api/v1/events
```

Expected:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired API key"
  }
}
```

### Missing Required Fields

```bash
curl -X POST \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' \
  https://YOUR_CONVEX_URL/api/v1/events
```

Expected:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "title is required"
  }
}
```

---

## Step 7: Test Webhooks

### List Available Webhook Events

```bash
curl https://YOUR_CONVEX_URL/api/v1/webhooks/events
```

### Create a Webhook

```bash
curl -X POST \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Webhook",
    "url": "https://webhook.site/your-unique-url",
    "events": ["event.created", "event.updated"]
  }' \
  https://YOUR_CONVEX_URL/api/v1/webhooks
```

> 💡 **Tip:** Use [webhook.site](https://webhook.site) to get a free test URL that shows incoming webhook payloads!

### List Your Webhooks

```bash
curl -H "X-API-Key: YOUR_API_KEY" \
  https://YOUR_CONVEX_URL/api/v1/webhooks
```

---

## Testing Tools

### Using Postman

1. Download [Postman](https://www.postman.com/downloads/)
2. Create a new collection "Open Event API"
3. Set a collection variable: `baseUrl` = your Convex URL
4. Set a collection variable: `apiKey` = your API key
5. Add requests with header: `X-API-Key: {{apiKey}}`

### Using VS Code REST Client

Install the [REST Client extension](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) and create `test.http`:

```http
@baseUrl = https://YOUR_CONVEX_URL
@apiKey = YOUR_API_KEY

### Health Check
GET {{baseUrl}}/api/health

### List Events
GET {{baseUrl}}/api/v1/events
X-API-Key: {{apiKey}}

### Create Event
POST {{baseUrl}}/api/v1/events
X-API-Key: {{apiKey}}
Content-Type: application/json

{
  "title": "Test Event",
  "startDate": 1735689600000,
  "eventType": "conference"
}

### Public Events
GET {{baseUrl}}/api/v1/public/events

### Public Vendors
GET {{baseUrl}}/api/v1/public/vendors
```

### Using HTTPie (Alternative to curl)

```bash
# Install: pip install httpie

# Health check
http GET YOUR_CONVEX_URL/api/health

# List events
http GET YOUR_CONVEX_URL/api/v1/events X-API-Key:YOUR_API_KEY

# Create event
http POST YOUR_CONVEX_URL/api/v1/events \
  X-API-Key:YOUR_API_KEY \
  title="Test Event" \
  startDate:=1735689600000
```

---

## Troubleshooting

### "UNAUTHORIZED" Error

- Check your API key is correct
- Ensure the key starts with `oe_live_` or `oe_test_`
- Verify the key hasn't been revoked
- Check the key has the required permissions

### "NOT_FOUND" Error

- Verify the event/resource ID is correct
- Make sure you own the resource (can't access others' events)

### "RATE_LIMIT_EXCEEDED" Error

- Wait for the rate limit to reset (check `X-RateLimit-Reset` header)
- Default: 1000 requests per hour

### CORS Errors (from browser)

- API is designed for server-to-server use
- For browser testing, use a tool like Postman or curl
- Public endpoints (`/api/v1/public/*`) allow CORS

### Connection Refused

- Make sure `npm run dev:all` is running
- Check your Convex deployment URL is correct
- Try accessing the Convex Dashboard to verify your project is running

---

## Quick Test Script

Save this as `test-api.sh`:

```bash
#!/bin/bash

BASE_URL="https://YOUR_CONVEX_URL"
API_KEY="YOUR_API_KEY"

echo "=== Testing Open Event API ==="
echo ""

echo "1. Health Check..."
curl -s "$BASE_URL/api/health" | jq .
echo ""

echo "2. API Info..."
curl -s "$BASE_URL/api/v1" | jq .
echo ""

echo "3. Public Events..."
curl -s "$BASE_URL/api/v1/public/events" | jq .
echo ""

echo "4. Public Vendors..."
curl -s "$BASE_URL/api/v1/public/vendors" | jq .
echo ""

echo "5. My Events (Authenticated)..."
curl -s -H "X-API-Key: $API_KEY" "$BASE_URL/api/v1/events" | jq .
echo ""

echo "6. Creating Test Event..."
RESULT=$(curl -s -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title": "API Test Event", "startDate": 1735689600000, "eventType": "conference"}' \
  "$BASE_URL/api/v1/events")
echo "$RESULT" | jq .

EVENT_ID=$(echo "$RESULT" | jq -r '.data.eventId')
echo "Created Event ID: $EVENT_ID"
echo ""

echo "7. Getting Created Event..."
curl -s -H "X-API-Key: $API_KEY" "$BASE_URL/api/v1/events/$EVENT_ID" | jq .
echo ""

echo "8. Deleting Test Event..."
curl -s -X DELETE -H "X-API-Key: $API_KEY" "$BASE_URL/api/v1/events/$EVENT_ID" | jq .
echo ""

echo "=== Testing Complete ==="
```

Run with:

```bash
chmod +x test-api.sh
./test-api.sh
```

---

## Next Steps

1. ✅ Test all endpoints work correctly
2. 📝 Build a sample integration
3. 🔗 Set up webhooks for real-time updates
4. 📊 Monitor API usage in Convex Dashboard

Happy testing! 🎉

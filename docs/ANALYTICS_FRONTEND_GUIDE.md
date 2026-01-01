# Analytics API - Frontend Integration Guide

This guide shows you how to integrate the Open Event Analytics API into your frontend application.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [Endpoints Overview](#endpoints-overview)
4. [Code Examples](#code-examples)
5. [Response Types](#response-types)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

---

## Quick Start

### 1. Get Your API Key

1. Log in to Open Event
2. Go to Settings → API Keys
3. Create a new API key with `analytics:read` permission
4. **Save the key immediately** - you won't see it again!

### 2. Base URL

```
https://your-project.convex.site/api/v1
```

### 3. Make Your First Request

```javascript
const API_KEY = 'oe_live_your_key_here'
const BASE_URL = 'https://your-project.convex.site/api/v1'

async function getEventTrends() {
  const response = await fetch(`${BASE_URL}/analytics/events/trends?period=month`, {
    headers: {
      'X-API-Key': API_KEY,
    },
  })

  const data = await response.json()
  return data
}
```

---

## Authentication

All analytics endpoints require an API key. Include it in one of two ways:

### Option 1: X-API-Key Header (Recommended)

```javascript
headers: {
  'X-API-Key': 'oe_live_your_key_here'
}
```

### Option 2: Authorization Header

```javascript
headers: {
  'Authorization': 'Bearer oe_live_your_key_here'
}
```

### Security Best Practice

**Never expose your API key in client-side code!** Instead:

1. **Use environment variables:**

   ```javascript
   const API_KEY = import.meta.env.VITE_API_KEY
   ```

2. **Or use a backend proxy** (recommended for production):
   ```javascript
   // Call your own backend endpoint
   const response = await fetch('/api/analytics/trends')
   // Your backend adds the API key server-side
   ```

---

## Endpoints Overview

| Endpoint                        | Description                 | Use Case                             |
| ------------------------------- | --------------------------- | ------------------------------------ |
| `/analytics/events/trends`      | Event trends over time      | Show charts/graphs of event creation |
| `/analytics/events/performance` | Overall performance metrics | Dashboard summary cards              |
| `/analytics/events/comparative` | Period comparisons          | "This month vs last month" widgets   |
| `/analytics/budget`             | Budget analytics            | Budget tracking dashboard            |
| `/analytics/engagement`         | Vendor/sponsor engagement   | Engagement metrics table             |

---

## Code Examples

### 1. Event Trends

Get event trends grouped by time period.

```javascript
/**
 * Get event trends over time
 * @param {string} period - 'day' | 'week' | 'month' | 'year'
 * @param {number} startDate - Unix timestamp (optional)
 * @param {number} endDate - Unix timestamp (optional)
 */
async function getEventTrends(period = 'month', startDate, endDate) {
  const params = new URLSearchParams({ period })
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)

  const response = await fetch(`${BASE_URL}/analytics/events/trends?${params}`, {
    headers: {
      'X-API-Key': API_KEY,
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error.message)
  }

  return result.data
}

// Usage
const trends = await getEventTrends('month')
console.log(trends)
// [
//   {
//     period: 1699900000000,
//     periodLabel: "2024-01-01T00:00:00.000Z",
//     totalEvents: 5,
//     totalBudget: 150000,
//     totalAttendees: 2500,
//     averageBudget: 30000,
//     averageAttendees: 500,
//     byStatus: { draft: 1, planning: 2, active: 1, completed: 1, cancelled: 0 }
//   },
//   ...
// ]
```

**React Example:**

```jsx
import { useState, useEffect } from 'react'

function EventTrendsChart() {
  const [trends, setTrends] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTrends() {
      try {
        const data = await getEventTrends('month')
        setTrends(data)
      } catch (error) {
        console.error('Failed to fetch trends:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchTrends()
  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <h2>Event Trends</h2>
      {trends.map((trend) => (
        <div key={trend.period}>
          <h3>{new Date(trend.period).toLocaleDateString()}</h3>
          <p>Total Events: {trend.totalEvents}</p>
          <p>Total Budget: ${trend.totalBudget.toLocaleString()}</p>
        </div>
      ))}
    </div>
  )
}
```

---

### 2. Event Performance

Get comprehensive performance metrics.

```javascript
/**
 * Get event performance metrics
 * @param {number} startDate - Unix timestamp (optional)
 * @param {number} endDate - Unix timestamp (optional)
 */
async function getEventPerformance(startDate, endDate) {
  const params = new URLSearchParams()
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)

  const url = `${BASE_URL}/analytics/events/performance`
  const queryString = params.toString()
  const fullUrl = queryString ? `${url}?${queryString}` : url

  const response = await fetch(fullUrl, {
    headers: {
      'X-API-Key': API_KEY,
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error.message)
  }

  return result.data
}

// Usage
const performance = await getEventPerformance()
console.log(performance)
// {
//   totalEvents: 25,
//   completedEvents: 15,
//   completionRate: 60.0,
//   averageBudget: 30000,
//   vendorMetrics: { totalApplications: 50, confirmed: 35, conversionRate: 70.0 },
//   ...
// }
```

**React Example:**

```jsx
function PerformanceDashboard() {
  const [metrics, setMetrics] = useState(null)

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const data = await getEventPerformance()
        setMetrics(data)
      } catch (error) {
        console.error('Failed to fetch performance:', error)
      }
    }
    fetchMetrics()
  }, [])

  if (!metrics) return <div>Loading...</div>

  return (
    <div className="dashboard">
      <div className="metric-card">
        <h3>Total Events</h3>
        <p className="big-number">{metrics.totalEvents}</p>
      </div>
      <div className="metric-card">
        <h3>Completion Rate</h3>
        <p className="big-number">{metrics.completionRate}%</p>
      </div>
      <div className="metric-card">
        <h3>Vendor Conversion</h3>
        <p className="big-number">{metrics.vendorMetrics.conversionRate}%</p>
      </div>
    </div>
  )
}
```

---

### 3. Comparative Analytics

Compare current period with previous period.

```javascript
/**
 * Get comparative analytics
 * @param {string} period - 'week' | 'month' | 'year'
 */
async function getComparativeAnalytics(period = 'month') {
  const response = await fetch(`${BASE_URL}/analytics/events/comparative?period=${period}`, {
    headers: {
      'X-API-Key': API_KEY,
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error.message)
  }

  return result.data
}

// Usage
const comparison = await getComparativeAnalytics('month')
console.log(comparison)
// {
//   period: "month",
//   current: { totalEvents: 5, totalBudget: 150000, ... },
//   previous: { totalEvents: 4, totalBudget: 120000, ... },
//   changes: { totalEvents: 25.0, totalBudget: 25.0, ... }
// }
```

**React Example:**

```jsx
function ComparisonWidget() {
  const [comparison, setComparison] = useState(null)

  useEffect(() => {
    async function fetchComparison() {
      try {
        const data = await getComparativeAnalytics('month')
        setComparison(data)
      } catch (error) {
        console.error('Failed to fetch comparison:', error)
      }
    }
    fetchComparison()
  }, [])

  if (!comparison) return <div>Loading...</div>

  const { current, previous, changes } = comparison

  return (
    <div>
      <h2>This Month vs Last Month</h2>
      <div className="comparison-grid">
        <div>
          <h3>Events</h3>
          <p>
            {current.totalEvents} vs {previous.totalEvents}
          </p>
          <span className={changes.totalEvents > 0 ? 'positive' : 'negative'}>
            {changes.totalEvents > 0 ? '+' : ''}
            {changes.totalEvents}%
          </span>
        </div>
        <div>
          <h3>Budget</h3>
          <p>
            ${current.totalBudget.toLocaleString()} vs ${previous.totalBudget.toLocaleString()}
          </p>
          <span className={changes.totalBudget > 0 ? 'positive' : 'negative'}>
            {changes.totalBudget > 0 ? '+' : ''}
            {changes.totalBudget}%
          </span>
        </div>
      </div>
    </div>
  )
}
```

---

### 4. Budget Analytics

Get budget allocation and spending analytics.

```javascript
/**
 * Get budget analytics
 * @param {number} startDate - Unix timestamp (optional)
 * @param {number} endDate - Unix timestamp (optional)
 */
async function getBudgetAnalytics(startDate, endDate) {
  const params = new URLSearchParams()
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)

  const url = `${BASE_URL}/analytics/budget`
  const queryString = params.toString()
  const fullUrl = queryString ? `${url}?${queryString}` : url

  const response = await fetch(fullUrl, {
    headers: {
      'X-API-Key': API_KEY,
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error.message)
  }

  return result.data
}

// Usage
const budget = await getBudgetAnalytics()
console.log(budget)
// {
//   totalBudget: 750000,
//   totalSpent: 600000,
//   budgetUtilization: 80.0,
//   byCurrency: { USD: { budget: 750000, spent: 600000, count: 20 } },
//   ...
// }
```

---

### 5. Engagement Analytics

Get vendor and sponsor engagement metrics.

```javascript
/**
 * Get engagement analytics
 * @param {number} startDate - Unix timestamp (optional)
 * @param {number} endDate - Unix timestamp (optional)
 */
async function getEngagementAnalytics(startDate, endDate) {
  const params = new URLSearchParams()
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)

  const url = `${BASE_URL}/analytics/engagement`
  const queryString = params.toString()
  const fullUrl = queryString ? `${url}?${queryString}` : url

  const response = await fetch(fullUrl, {
    headers: {
      'X-API-Key': API_KEY,
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error.message)
  }

  return result.data
}

// Usage
const engagement = await getEngagementAnalytics()
console.log(engagement)
// {
//   vendors: {
//     totalApplications: 50,
//     confirmed: 35,
//     conversionRate: 70.0,
//     ...
//   },
//   sponsors: { ... }
// }
```

---

## Response Types

All endpoints return data in this format:

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown[]
  }
}
```

### Success Response

```json
{
  "success": true,
  "data": {
    // Endpoint-specific data
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing API key"
  }
}
```

---

## Error Handling

### Common Error Codes

| Code                  | HTTP Status | Description                                      |
| --------------------- | ----------- | ------------------------------------------------ |
| `UNAUTHORIZED`        | 401         | Invalid or missing API key                       |
| `FORBIDDEN`           | 403         | API key doesn't have `analytics:read` permission |
| `RATE_LIMIT_EXCEEDED` | 429         | Too many requests                                |
| `BAD_REQUEST`         | 400         | Invalid query parameters                         |
| `INTERNAL_ERROR`      | 500         | Server error                                     |

### Error Handling Example

```javascript
async function fetchAnalytics(endpoint, params = {}) {
  try {
    const queryString = new URLSearchParams(params).toString()
    const url = `${BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url, {
      headers: {
        'X-API-Key': API_KEY,
      },
    })

    const result = await response.json()

    if (!result.success) {
      // Handle API errors
      switch (result.error.code) {
        case 'UNAUTHORIZED':
          console.error('Invalid API key')
          // Redirect to login or show error
          break
        case 'FORBIDDEN':
          console.error('Missing analytics:read permission')
          break
        case 'RATE_LIMIT_EXCEEDED':
          console.error('Rate limit exceeded. Please try again later.')
          break
        default:
          console.error('API Error:', result.error.message)
      }
      throw new Error(result.error.message)
    }

    return result.data
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError) {
      console.error('Network error:', error.message)
      throw new Error('Failed to connect to API. Please check your internet connection.')
    }
    throw error
  }
}
```

---

## Best Practices

### 1. Create a Reusable API Client

```javascript
class AnalyticsClient {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  async request(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString()
    const url = `${this.baseUrl}${endpoint}${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url, {
      headers: {
        'X-API-Key': this.apiKey,
      },
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error.message)
    }

    return result.data
  }

  getEventTrends(period, startDate, endDate) {
    return this.request('/analytics/events/trends', {
      period,
      startDate,
      endDate,
    })
  }

  getEventPerformance(startDate, endDate) {
    return this.request('/analytics/events/performance', {
      startDate,
      endDate,
    })
  }

  getComparativeAnalytics(period) {
    return this.request('/analytics/events/comparative', { period })
  }

  getBudgetAnalytics(startDate, endDate) {
    return this.request('/analytics/budget', { startDate, endDate })
  }

  getEngagementAnalytics(startDate, endDate) {
    return this.request('/analytics/engagement', { startDate, endDate })
  }
}

// Usage
const client = new AnalyticsClient(API_KEY, BASE_URL)
const trends = await client.getEventTrends('month')
```

### 2. Use React Query for Caching

```jsx
import { useQuery } from '@tanstack/react-query'

function useEventTrends(period = 'month') {
  return useQuery({
    queryKey: ['analytics', 'trends', period],
    queryFn: () => getEventTrends(period),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })
}

// Usage
function TrendsChart() {
  const { data: trends, isLoading, error } = useEventTrends('month')

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return <Chart data={trends} />
}
```

### 3. Date Handling

```javascript
// Convert dates to Unix timestamps
function dateToTimestamp(date) {
  return Math.floor(date.getTime())
}

// Get last 30 days
const endDate = new Date()
const startDate = new Date()
startDate.setDate(startDate.getDate() - 30)

const trends = await getEventTrends('day', dateToTimestamp(startDate), dateToTimestamp(endDate))
```

### 4. TypeScript Support

```typescript
interface EventTrend {
  period: number
  periodLabel: string
  totalEvents: number
  totalBudget: number
  totalAttendees: number
  averageBudget: number
  averageAttendees: number
  byStatus: {
    draft: number
    planning: number
    active: number
    completed: number
    cancelled: number
  }
}

interface PerformanceMetrics {
  totalEvents: number
  completedEvents: number
  completionRate: number
  averageBudget: number
  averageAttendees: number
  totalBudget: number
  totalAttendees: number
  vendorMetrics: {
    totalApplications: number
    confirmed: number
    conversionRate: number
  }
  sponsorMetrics: {
    totalApplications: number
    confirmed: number
    conversionRate: number
  }
  byEventType: Record<string, number>
  byLocationType: Record<string, number>
}

async function getEventTrends(
  period: 'day' | 'week' | 'month' | 'year' = 'month',
  startDate?: number,
  endDate?: number
): Promise<EventTrend[]> {
  // ... implementation
}
```

---

## Complete Example: Analytics Dashboard

```jsx
import { useState, useEffect } from 'react'

const API_KEY = import.meta.env.VITE_API_KEY
const BASE_URL = 'https://your-project.convex.site/api/v1'

function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState(null)
  const [trends, setTrends] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      try {
        // Fetch in parallel
        const [metricsData, trendsData] = await Promise.all([
          fetch(`${BASE_URL}/analytics/events/performance`, {
            headers: { 'X-API-Key': API_KEY },
          }).then((r) => r.json()),
          fetch(`${BASE_URL}/analytics/events/trends?period=month`, {
            headers: { 'X-API-Key': API_KEY },
          }).then((r) => r.json()),
        ])

        if (metricsData.success) setMetrics(metricsData.data)
        if (trendsData.success) setTrends(trendsData.data)
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [])

  if (loading) return <div>Loading analytics...</div>
  if (!metrics) return <div>No data available</div>

  return (
    <div className="analytics-dashboard">
      <h1>Analytics Dashboard</h1>

      <div className="metrics-grid">
        <MetricCard title="Total Events" value={metrics.totalEvents} />
        <MetricCard title="Completion Rate" value={`${metrics.completionRate}%`} />
        <MetricCard title="Vendor Conversion" value={`${metrics.vendorMetrics.conversionRate}%`} />
        <MetricCard
          title="Sponsor Conversion"
          value={`${metrics.sponsorMetrics.conversionRate}%`}
        />
      </div>

      <div className="trends-section">
        <h2>Event Trends</h2>
        <TrendsChart data={trends} />
      </div>
    </div>
  )
}

function MetricCard({ title, value }) {
  return (
    <div className="metric-card">
      <h3>{title}</h3>
      <p className="metric-value">{value}</p>
    </div>
  )
}

function TrendsChart({ data }) {
  return (
    <div className="chart">
      {data.map((trend) => (
        <div key={trend.period} className="trend-bar">
          <div className="trend-label">{new Date(trend.period).toLocaleDateString()}</div>
          <div className="trend-value">{trend.totalEvents} events</div>
        </div>
      ))}
    </div>
  )
}

export default AnalyticsDashboard
```

---

## Need Help?

- **API Documentation:** See `docs/API.md` for full API reference
- **Issues:** Report bugs or request features on GitHub
- **Support:** Contact the backend team for API key issues

---

**Happy coding! 🚀**

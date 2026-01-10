# Build & Deployment Skills

## Vite Configuration

### Build Optimization

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    sourcemap: true, // For Sentry error tracking
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Code splitting strategies
          if (id.includes('tldraw')) return 'vendor-tldraw'
          if (id.includes('recharts')) return 'vendor-charts'
          if (id.includes('react-dom')) return 'vendor-react'
          // ... more chunking
        },
      },
    },
  },
})
```

### Code Splitting Strategy

- **Vendor Chunks**: Large dependencies separated by category
- **Feature Chunks**: Route-based code splitting with lazy loading
- **Shared Chunks**: Common code extracted to shared chunks

## PWA Configuration

### Service Worker Setup

```typescript
// vite.config.ts - PWA plugin
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'Open Event',
    short_name: 'OpenEvent',
    theme_color: '#000000',
    background_color: '#000000',
    display: 'standalone',
    icons: [
      /* ... */
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    runtimeCaching: [
      // Cache strategies for different resources
      {
        urlPattern: /^https:\/\/.*\.convex\.cloud\/.*/i,
        handler: 'NetworkFirst',
        options: { cacheName: 'convex-api-cache' },
      },
      // ... more caching strategies
    ],
  },
})
```

### Caching Strategies

1. **CacheFirst**: Static assets (images, fonts)
2. **NetworkFirst**: API calls with cache fallback
3. **StaleWhileRevalidate**: Dynamic content
4. **NetworkOnly**: Payment data, AI responses

## Security Headers

### Content Security Policy

```typescript
// vite.config.ts
server: {
  headers: {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.convex.cloud https://api.openai.com",
      // ... more directives
    ].join('; '),
  },
}
```

### Security Headers

- **CSP**: Content Security Policy
- **X-Frame-Options**: Prevent clickjacking
- **X-Content-Type-Options**: Prevent MIME sniffing
- **Referrer-Policy**: Control referrer information
- **HSTS**: Force HTTPS (production)

## Environment Configuration

### Environment Variables

```typescript
// .env.example
VITE_CONVEX_URL=https://your-project.convex.cloud
VITE_OPENAI_API_KEY=sk-...
VITE_STRIPE_PUBLISHABLE_KEY=pk_...
VITE_SENTRY_DSN=https://...
```

### Environment Usage

```typescript
// Using environment variables
const convexUrl = import.meta.env.VITE_CONVEX_URL
const openaiKey = import.meta.env.VITE_OPENAI_API_KEY
```

## Build Scripts

### Development

```bash
npm run dev          # Start frontend dev server
npm run dev:backend  # Start Convex backend
npm run dev:all      # Start both (recommended)
```

### Production

```bash
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

### Testing

```bash
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:coverage # Generate coverage report
npm run test:e2e     # Run E2E tests
npm run test:e2e:ui  # Run E2E tests with UI
```

## Deployment

### Cloudflare Pages

```yaml
# cloudflare-pages.yml
build:
  command: npm run build
  output: dist
env:
  VITE_CONVEX_URL: $CONVEX_URL
  VITE_OPENAI_API_KEY: $OPENAI_API_KEY
```

### Build Output

- **dist/**: Production build output
- **Static Assets**: HTML, CSS, JS bundles
- **Source Maps**: For error tracking (Sentry)

## Error Tracking (Sentry)

### Sentry Integration

```typescript
// vite.config.ts - Sentry plugin
process.env.SENTRY_AUTH_TOKEN &&
  sentryVitePlugin({
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    sourcemaps: {
      assets: './dist/**',
    },
  })
```

### Error Capture

```typescript
// Error tracking
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
})
```

## Key Skills to Master

1. **Vite Configuration**: Build optimization, code splitting, plugins
2. **PWA Setup**: Service workers, caching strategies, offline support
3. **Security Headers**: CSP, security headers, HTTPS enforcement
4. **Environment Management**: Environment variables, secrets, configuration
5. **Build Optimization**: Code splitting, tree shaking, minification
6. **Deployment**: Cloudflare Pages, build process, environment setup
7. **Error Tracking**: Sentry integration, source maps, error monitoring
8. **Performance**: Bundle analysis, optimization strategies, monitoring

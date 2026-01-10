import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
// Sentry removed due to React 19 incompatibility
// import { sentryVitePlugin } from '@sentry/vite-plugin'

// https://vite.dev/config/
export default defineConfig({
  server: {
    headers: {
      // Content Security Policy - Restrict resource loading to trusted sources
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data:",
        "connect-src 'self' http://localhost:* http://127.0.0.1:* https://*.convex.cloud https://api.openai.com https://api.stripe.com wss://*.convex.cloud",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
      // Prevent clickjacking attacks
      'X-Frame-Options': 'DENY',
      // Prevent MIME type sniffing
      'X-Content-Type-Options': 'nosniff',
      // Control referrer information
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      // Control browser features and APIs
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      // Force HTTPS connections (production only, commented for dev)
      // 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    },
  },
  preview: {
    headers: {
      // Same security headers for preview builds
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data:",
        "connect-src 'self' https://*.convex.cloud https://api.openai.com https://api.stripe.com wss://*.convex.cloud",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      // Enable HSTS for preview/production
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    },
  },
  build: {
    sourcemap: true, // Enable source maps for Sentry error tracking
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Create vendor chunks for large dependencies
          if (id.includes('node_modules')) {
            // TLDraw - largest dependency (PlaygroundPage)
            if (id.includes('tldraw') || id.includes('@tldraw/')) {
              return 'vendor-tldraw'
            }
            // Charts library (AnalyticsPage)
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'vendor-charts'
            }
            // Core React
            if (id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react'
            }
            // Radix UI components
            if (id.includes('@radix-ui/')) {
              return 'vendor-radix'
            }
            // Icons
            if (id.includes('@phosphor-icons/')) {
              return 'vendor-icons'
            }
            // Convex (backend client)
            if (id.includes('convex')) {
              return 'vendor-convex'
            }
            // Markdown rendering
            if (
              id.includes('react-markdown') ||
              id.includes('remark') ||
              id.includes('unified') ||
              id.includes('mdast') ||
              id.includes('micromark')
            ) {
              return 'vendor-markdown'
            }
            // PDF generation
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-pdf'
            }
          }
          return undefined
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'og-image.png'],
      manifest: {
        name: 'Open Event',
        short_name: 'OpenEvent',
        description: 'The open-source event operations platform',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/',
        orientation: 'portrait-primary',
        categories: ['productivity', 'business'],
        icons: [
          {
            src: '/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache static assets - these are cached during service worker installation
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webp,jpg,jpeg,gif}'],
        // Allow precaching of larger main bundle produced by Vite
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        // Use index.html as fallback for SPA routing - this ensures the React app
        // loads properly for all routes. Offline detection is handled in-app via usePWA hook.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api/, // API routes
          /^\/__/, // Internal routes
          /^\/.*\.[^/]+$/, // Files with extensions (assets, etc.)
        ],
        // Skip waiting to activate new service worker immediately
        skipWaiting: true,
        // Claim clients immediately after activation
        clientsClaim: true,
        // Clean up old caches from previous versions
        cleanupOutdatedCaches: true,
        // Runtime caching strategies for dynamic content
        runtimeCaching: [
          // Google Fonts stylesheets - cache first, long TTL
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Google Fonts webfonts - cache first, long TTL
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // CDN resources (jsdelivr) - cache first for immutable assets
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // GitHub avatars - cache first with moderate TTL
          {
            urlPattern: /^https:\/\/avatars\.githubusercontent\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'github-avatars-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // External images - stale while revalidate for balance of freshness and speed
          {
            urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|gif|webp|svg)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'external-images-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 14, // 14 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Convex API calls - network first with fallback (real-time data should be fresh)
          {
            urlPattern: /^https:\/\/.*\.convex\.cloud\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'convex-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutes - short TTL for API data
              },
              networkTimeoutSeconds: 10, // Fallback to cache after 10s
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Stripe API - network only (payment data should never be cached)
          {
            urlPattern: /^https:\/\/.*\.stripe\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          // OpenAI API - network only (AI responses should be fresh)
          {
            urlPattern: /^https:\/\/api\.openai\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          // Local static assets in /assets folder - cache first
          {
            urlPattern: /\/assets\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'local-assets-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Fallback for any other same-origin requests - stale while revalidate
          {
            urlPattern: ({ sameOrigin }) => sameOrigin,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'same-origin-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // Disable in dev to avoid caching issues
      },
    }),
    // Sentry plugin disabled due to React 19 incompatibility
    // TODO: Re-enable when @sentry/react supports React 19
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

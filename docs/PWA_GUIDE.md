# Progressive Web App (PWA) Guide

Open Event is a Progressive Web App, meaning you can install it on your device for a native app-like experience with offline support.

## Features

### Installable

Install Open Event on your home screen for quick access without opening a browser.

### Offline Support

The app caches essential assets so you can access previously viewed content even without an internet connection.

### Auto-Updates

The app automatically checks for updates and prompts you when a new version is available.

### Native Feel

Runs in its own window without browser UI, providing a seamless app experience.

---

## How to Install

### Desktop (Chrome/Edge)

1. Visit [openevent.my](https://openevent.my)
2. Look for the install icon in the address bar (or click the install banner)
3. Click "Install" when prompted
4. The app will be added to your desktop/applications

### Android (Chrome)

1. Visit [openevent.my](https://openevent.my) in Chrome
2. Tap the install banner that appears, or:
   - Tap the three-dot menu (⋮)
   - Select "Add to Home Screen" or "Install App"
3. Confirm the installation
4. Find the app on your home screen

### iOS (Safari)

iOS doesn't support automatic install prompts, but you can still add the app:

1. Visit [openevent.my](https://openevent.my) in Safari
2. Tap the Share button (box with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Customize the name if desired and tap "Add"
5. Find the app on your home screen

---

## Settings

You can manage PWA settings from the **Settings** page in your dashboard:

- **Network Status**: View your current connection status
- **Install App**: Install the app directly from settings (if not already installed)

---

## Troubleshooting

### The install prompt doesn't appear

- Make sure you're using a supported browser (Chrome, Edge, Safari, Firefox)
- You may have already dismissed the prompt - check Settings to install manually
- Clear your browser cache and try again

### The app isn't updating

- Close and reopen the app
- Check if an update toast appears
- If stuck, uninstall and reinstall the app

### Offline mode shows an error

- Some features require an internet connection (like real-time data)
- Previously cached pages should still be accessible
- Connect to the internet to refresh content

---

## Technical Details

### Caching Strategy

- **Static Assets**: Pre-cached during installation (JS, CSS, images)
- **API Responses**: Cached with network-first strategy for real-time data
- **Images/Fonts**: Cached with stale-while-revalidate strategy

### Service Worker

The service worker is registered automatically and handles:

- Asset caching and retrieval
- Offline fallback page
- Background sync (when available)
- Update notifications

### Browser Support

| Browser          | Install | Offline | Updates |
| ---------------- | ------- | ------- | ------- |
| Chrome (Desktop) | ✅      | ✅      | ✅      |
| Chrome (Android) | ✅      | ✅      | ✅      |
| Edge             | ✅      | ✅      | ✅      |
| Safari (iOS)     | Manual  | ✅      | ✅      |
| Firefox          | Limited | ✅      | ✅      |

---

## For Developers

### Architecture

```
src/
├── hooks/
│   └── use-pwa.ts          # PWA state management hook
├── components/
│   └── pwa/
│       ├── InstallPrompt.tsx   # Install banner component
│       ├── UpdatePrompt.tsx    # Update toast component
│       └── index.ts            # Exports
├── main.tsx                    # Service worker registration
└── vite-env.d.ts              # PWA type declarations

public/
├── offline.html               # Offline fallback page
└── manifest.json              # Web app manifest (via vite-plugin-pwa)

vite.config.ts                 # PWA plugin configuration
```

### usePWA Hook

```typescript
const {
  isInstalled, // boolean - Is running as installed PWA
  isInstallable, // boolean - Can be installed
  isOnline, // boolean - Network connection status
  showPrompt, // boolean - Should show install banner
  promptInstall, // () => Promise<boolean> - Trigger native install
  dismissPrompt, // () => void - Dismiss banner for 7 days
  getPlatform, // () => 'ios' | 'android' | 'desktop' | 'unknown'
} = usePWA()
```

### Testing PWA Locally

1. Build the production version:

   ```bash
   npm run build
   ```

2. Serve the build:

   ```bash
   npx serve dist
   ```

3. Open in Chrome and use DevTools > Application > Service Workers to inspect

### Forcing Update

During development, you can force clear the service worker:

```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then((registrations) => {
  registrations.forEach((registration) => registration.unregister())
})
```

Then refresh the page.

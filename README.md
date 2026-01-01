<div align="center">

<!-- Hero Section -->
<img src="https://raw.githubusercontent.com/hazlijohar95/open-event/main/.github/assets/logo.svg" alt="Open Event" width="80" height="80" />

# Open Event

### The Open-Source Event Operations Platform

**Create • Manage • Connect** — All in one place

[![MIT License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Convex](https://img.shields.io/badge/Convex-Backend-f97316?style=flat-square)](https://convex.dev/)
[![PWA](https://img.shields.io/badge/PWA-Ready-8b5cf6?style=flat-square&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Stars](https://img.shields.io/github/stars/hazlijohar95/open-event?style=flat-square&color=fbbf24)](https://github.com/hazlijohar95/open-event/stargazers)
[![CI](https://img.shields.io/github/actions/workflow/status/hazlijohar95/open-event/ci.yml?style=flat-square&label=CI)](https://github.com/hazlijohar95/open-event/actions/workflows/ci.yml)
[![codecov](https://img.shields.io/codecov/c/github/hazlijohar95/open-event?style=flat-square&color=22c55e)](https://codecov.io/gh/hazlijohar95/open-event)

[Live Demo](https://openevent.my) · [Report Bug](https://github.com/hazlijohar95/open-event/issues) · [Request Feature](https://github.com/hazlijohar95/open-event/issues)

---

<img src="https://raw.githubusercontent.com/hazlijohar95/open-event/main/.github/assets/dashboard-preview.png" alt="Dashboard Preview" width="100%" style="border-radius: 12px; margin: 20px 0;" />

</div>

## 🎯 What is Open Event?

Open Event is a **comprehensive event management platform** that connects three key players in the event ecosystem:

<table>
<tr>
<td align="center" width="33%">

### 🎪 Organizers

Create and manage events with AI assistance, track budgets, coordinate vendors, and find sponsors.

</td>
<td align="center" width="33%">

### 🛠️ Vendors

Showcase your services, discover event opportunities, and get hired by organizers.

</td>
<td align="center" width="33%">

### 💎 Sponsors

Find events to support, manage sponsorship tiers, and track your brand investments.

</td>
</tr>
</table>

<br />

## ✨ Features

<details open>
<summary><b>🤖 AI Event Assistant</b> — Create events through natural conversation</summary>
<br />

> _"I want to create a tech conference for 200 developers next month"_

The AI assistant understands your intent and creates events, finds vendors, and discovers sponsors automatically.

- 🔧 **13 integrated tools** for event management
- ✅ **Confirmation dialogs** for important actions
- 🎯 **Smart recommendations** based on your event profile

</details>

<details>
<summary><b>📊 Event Dashboard</b> — Everything at a glance</summary>
<br />

- Real-time event analytics and metrics
- Quick actions for common tasks
- Status workflow: `Draft` → `Planning` → `Active` → `Completed`
- Budget tracking with visual breakdowns

</details>

<details>
<summary><b>✅ Task Management</b> — Kanban-style task boards</summary>
<br />

- Organize tasks by category (Venue, Marketing, Logistics)
- Priority levels: `Low` → `Medium` → `High` → `Urgent`
- Due date tracking with visual indicators
- Link tasks to vendors and budget items

</details>

<details>
<summary><b>💰 Budget Tracking</b> — Full financial control</summary>
<br />

- Track estimated vs actual expenses
- Categorize spending by type
- Visual budget progress indicators
- Export reports for stakeholders

</details>

<details>
<summary><b>🔍 Vendor & Sponsor Discovery</b> — Find the right partners</summary>
<br />

- Search by category, location, price range
- AI-powered matching and recommendations
- Verification badges for trusted partners
- Direct inquiry system

</details>

<details>
<summary><b>📱 Progressive Web App</b> — Works everywhere</summary>
<br />

- Install on any device (iOS, Android, Desktop)
- Works offline with smart caching
- Push notification ready
- Auto-updates in background

</details>

<br />

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **npm** 9+ or **pnpm**
- [Convex](https://convex.dev) account (free)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/hazlijohar95/open-event.git
cd open-event

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Add your VITE_CONVEX_URL from Convex dashboard

# 4. Start development servers
npm run dev:all
```

**That's it!** Open [localhost:5173](http://localhost:5173) 🎉

<br />

## 🏗️ Tech Stack

<table>
<tr>
<td align="center" width="100">
<img src="https://skillicons.dev/icons?i=react" width="48" height="48" alt="React" />
<br /><sub><b>React 19</b></sub>
</td>
<td align="center" width="100">
<img src="https://skillicons.dev/icons?i=ts" width="48" height="48" alt="TypeScript" />
<br /><sub><b>TypeScript</b></sub>
</td>
<td align="center" width="100">
<img src="https://skillicons.dev/icons?i=vite" width="48" height="48" alt="Vite" />
<br /><sub><b>Vite 7</b></sub>
</td>
<td align="center" width="100">
<img src="https://skillicons.dev/icons?i=tailwind" width="48" height="48" alt="Tailwind" />
<br /><sub><b>Tailwind 4</b></sub>
</td>
<td align="center" width="100">
<img src="https://avatars.githubusercontent.com/u/108468352?s=200&v=4" width="48" height="48" alt="Convex" style="border-radius: 8px;" />
<br /><sub><b>Convex</b></sub>
</td>
<td align="center" width="100">
<img src="https://skillicons.dev/icons?i=openai" width="48" height="48" alt="OpenAI" style="border-radius: 8px;" />
<br /><sub><b>OpenAI</b></sub>
</td>
</tr>
</table>

| Layer        | Technologies                                                     |
| ------------ | ---------------------------------------------------------------- |
| **Frontend** | React 19, TypeScript, Vite 7, TailwindCSS 4, ShadCN UI, Radix UI |
| **Backend**  | Convex (real-time database + serverless functions)               |
| **Auth**     | Convex Auth (Google OAuth, Email/Password)                       |
| **AI**       | OpenAI GPT-4o-mini with function calling                         |
| **Testing**  | Vitest, React Testing Library, Playwright                        |
| **Icons**    | Phosphor Icons (duotone)                                         |
| **Fonts**    | Geist Sans & Geist Mono                                          |

<br />

## 📁 Project Structure

```
open-event/
├── 📂 convex/                    # Backend
│   ├── schema.ts                # Database schema
│   ├── events.ts                # Event management
│   ├── vendors.ts               # Vendor operations
│   ├── sponsors.ts              # Sponsor operations
│   ├── eventTasks.ts            # Task management
│   ├── budgetItems.ts           # Budget tracking
│   ├── auth.ts                  # Authentication
│   └── lib/agent/               # AI Agent System
│       ├── tools.ts             # 13 AI tools
│       └── handlers.ts          # Tool execution
│
├── 📂 src/
│   ├── 📂 components/
│   │   ├── ui/                  # ShadCN components
│   │   ├── app/                 # App shell & navigation
│   │   ├── agentic/             # AI chat interface
│   │   ├── landing/             # Marketing pages
│   │   └── admin/               # Admin panel
│   │
│   ├── 📂 pages/
│   │   ├── dashboard/           # Main app pages
│   │   ├── admin/               # Admin pages
│   │   ├── auth/                # Auth pages
│   │   ├── onboarding/          # User onboarding
│   │   └── public/              # Public pages
│   │
│   ├── 📂 hooks/                # Custom hooks
│   ├── 📂 lib/                  # Utilities
│   └── 📂 types/                # TypeScript types
│
└── 📂 e2e/                      # E2E tests
```

<br />

## 🤖 AI Agent System

The AI assistant uses **OpenAI function calling** for a truly agentic experience:

```
┌─────────────────────────────────────────────────────────────┐
│  User: "Create a hackathon for 100 people in March"        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │   🧠 AI Agent           │
              │   (GPT-4o-mini)         │
              │                         │
              │   Analyzes intent →     │
              │   Selects tools →       │
              │   Prepares action       │
              └─────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │   ⚡ Tool Execution     │
              │                         │
              │   createEvent {         │
              │     title: "Hackathon"  │
              │     attendees: 100      │
              │     date: "March 2025"  │
              │   }                     │
              └─────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │   ✅ Confirmation       │
              │                         │
              │   [Create Event]        │
              │   [Cancel]              │
              └─────────────────────────┘
```

### Available Tools (13)

| Category     | Tools                                                                                  |
| ------------ | -------------------------------------------------------------------------------------- |
| **Events**   | `createEvent` · `updateEvent` · `getEventDetails` · `getUpcomingEvents`                |
| **Vendors**  | `searchVendors` · `addVendorToEvent` · `getRecommendedVendors` · `getEventVendors`     |
| **Sponsors** | `searchSponsors` · `addSponsorToEvent` · `getRecommendedSponsors` · `getEventSponsors` |
| **Profile**  | `getUserProfile`                                                                       |

<br />

## 📊 Database Schema

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   users     │──────▶│   events    │◀──────│  eventTasks │
└─────────────┘       └─────────────┘       └─────────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
   │eventVendors │   │eventSponsors│   │ budgetItems │
   └─────────────┘   └─────────────┘   └─────────────┘
           │                 │
           ▼                 ▼
   ┌─────────────┐   ┌─────────────┐
   │  vendors    │   │  sponsors   │
   └─────────────┘   └─────────────┘
```

<br />

## 🧪 Testing

```bash
# Unit tests (watch mode)
npm run test

# Run once
npm run test:run

# With coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

<br />

## 📜 Scripts

| Command               | Description               |
| --------------------- | ------------------------- |
| `npm run dev`         | Start frontend dev server |
| `npm run dev:backend` | Start Convex backend      |
| `npm run dev:all`     | Start both (recommended)  |
| `npm run build`       | Production build          |
| `npm run lint`        | Run ESLint                |
| `npm run test`        | Run tests                 |

<br />

## 🗺️ Roadmap

- [x] 🤖 AI Event Assistant
- [x] 📊 Event Dashboard
- [x] ✅ Task Management
- [x] 💰 Budget Tracking
- [x] 🔍 Vendor/Sponsor Discovery
- [x] 📱 PWA Support
- [x] 🌙 Dark Mode
- [x] 🔐 Role-based Access
- [ ] 📧 Email Notifications
- [ ] 📅 Calendar Integration
- [ ] 📲 Native Mobile App
- [ ] 📋 Event Templates
- [ ] 📈 Advanced Analytics

<br />

## 🤝 Contributing

We love contributions! Here's how to get started:

```bash
# 1. Fork & clone
git clone https://github.com/YOUR_USERNAME/open-event.git

# 2. Create a branch
git checkout -b feature/amazing-feature

# 3. Make changes & test
npm run test:run && npm run lint

# 4. Commit & push
git commit -m "feat: add amazing feature"
git push origin feature/amazing-feature

# 5. Open a Pull Request 🎉
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

<br />

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

<br />

## 🙏 Acknowledgments

<table>
<tr>
<td align="center">
<a href="https://convex.dev">
<img src="https://avatars.githubusercontent.com/u/108468352?s=200&v=4" width="40" style="border-radius: 8px;" />
<br /><sub><b>Convex</b></sub>
</a>
</td>
<td align="center">
<a href="https://ui.shadcn.com">
<img src="https://avatars.githubusercontent.com/u/139895814?s=200&v=4" width="40" style="border-radius: 8px;" />
<br /><sub><b>ShadCN</b></sub>
</a>
</td>
<td align="center">
<a href="https://phosphoricons.com">
<img src="https://phosphoricons.com/favicon-512.png" width="40" style="border-radius: 8px;" />
<br /><sub><b>Phosphor</b></sub>
</a>
</td>
<td align="center">
<a href="https://vercel.com/font">
<img src="https://assets.vercel.com/image/upload/front/favicon/vercel/favicon.ico" width="40" style="border-radius: 8px;" />
<br /><sub><b>Geist Font</b></sub>
</a>
</td>
<td align="center">
<a href="https://openai.com">
<img src="https://seeklogo.com/images/O/openai-logo-8B9FEDE59D-seeklogo.com.png" width="40" style="border-radius: 8px;" />
<br /><sub><b>OpenAI</b></sub>
</a>
</td>
</tr>
</table>

---

<div align="center">

**Researched & designed by [Hazli](https://github.com/hazlijohar95) · Built by [Azmir](https://github.com/azmir32)**

<br />

<a href="https://github.com/hazlijohar95/open-event/stargazers">⭐ Star us on GitHub</a> — it helps!

<br />

[![Twitter Follow](https://img.shields.io/twitter/follow/openevent?style=social)](https://twitter.com/openevent)

</div>

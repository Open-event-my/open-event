# Open Event Design System

> A comprehensive guide to our visual language, design tokens, and component patterns.
> Built with intention. Designed for clarity. Made for events.

---

## Table of Contents

1. [Philosophy](#philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing](#spacing)
5. [Border Radius](#border-radius)
6. [Iconography](#iconography)
7. [Animation System](#animation-system)
8. [Component Patterns](#component-patterns)
9. [Landing Page Sections](#landing-page-sections)
10. [Dark Mode](#dark-mode)
11. [Accessibility](#accessibility)

---

## Philosophy

Our design system is built on three principles:

### 1. Clarity Over Decoration

Every element serves a purpose. We avoid decorative clutter in favor of clear hierarchy and scannable layouts. Whitespace is a feature, not empty space.

### 2. Balanced Color Palette

We use a **diverse accent palette** rather than monotone theming:

- **Amber/Orange** for warmth and energy (CTAs, highlights)
- **Emerald/Teal** for growth and AI features
- **Indigo** for trust and professionalism (forms, organizer tools)
- **Slate** for neutral, sophisticated headlines

### 3. Honest Personality

We're a new product and we embrace it. Our copy is authentic ("hopefully, soon"), our animations are playful but not distracting, and our footer credits the real people behind the project.

---

## Color System

We use **OKLCH** color space for perceptually uniform colors that look great across devices.

### Semantic Colors

| Token                | Light Mode               | Dark Mode               | Usage              |
| -------------------- | ------------------------ | ----------------------- | ------------------ |
| `--background`       | `oklch(0.995 0 0)`       | `oklch(0.12 0.005 300)` | Page background    |
| `--foreground`       | `oklch(0.13 0 0)`        | `oklch(0.97 0 0)`       | Primary text       |
| `--card`             | `oklch(1 0 0)`           | `oklch(0.16 0.008 300)` | Card surfaces      |
| `--muted`            | `oklch(0.965 0.005 300)` | `oklch(0.22 0.01 300)`  | Subtle backgrounds |
| `--muted-foreground` | `oklch(0.45 0 0)`        | `oklch(0.65 0 0)`       | Secondary text     |
| `--border`           | `oklch(0.91 0 0)`        | `oklch(1 0 0 / 12%)`    | Borders            |
| `--destructive`      | `oklch(0.577 0.245 27)`  | `oklch(0.704 0.191 22)` | Error states       |

### Accent Color Palette

Rather than a single primary color, we use contextual accents:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   AMBER/ORANGE           EMERALD/TEAL          INDIGO           │
│   ─────────────          ────────────          ──────           │
│   Warmth & Energy        Growth & AI           Trust & Pro      │
│                                                                 │
│   • CTAs                 • AI features         • Organizers     │
│   • Highlights           • Success states      • Forms          │
│   • Logo cloud           • Capability cards    • Dashboard      │
│                                                                 │
│   amber-500/600          emerald-500/600       indigo-500/600   │
│   orange-500/600         teal-500/600          violet-500/600   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Stakeholder Colors

Each user type has an assigned color for easy recognition:

| Stakeholder | Color   | Tailwind Classes                               |
| ----------- | ------- | ---------------------------------------------- |
| Sponsors    | Amber   | `amber-500`, `from-amber-500 to-orange-600`    |
| Vendors     | Emerald | `emerald-500`, `from-emerald-500 to-green-600` |
| Organizers  | Indigo  | `indigo-500`, `from-indigo-500 to-violet-600`  |

### Usage Examples

```tsx
// Headlines - Use slate for sophistication
<span className="bg-gradient-to-r from-slate-800 via-slate-600 to-slate-800
                 dark:from-slate-200 dark:via-slate-400 dark:to-slate-200
                 bg-clip-text text-transparent">
  reimagined.
</span>

// CTA sections - Use amber for warmth
<span className="bg-gradient-to-r from-amber-600 to-orange-600
                 dark:from-amber-400 dark:to-orange-400
                 bg-clip-text text-transparent">
  event operations?
</span>

// AI features - Use emerald for growth
<span className="bg-gradient-to-r from-emerald-600 to-teal-600
                 dark:from-emerald-400 dark:to-teal-400
                 bg-clip-text text-transparent">
  helps.
</span>
```

---

## Typography

### Font Family

We use **Geist** by Vercel - a modern, highly legible font family.

```css
--font-sans: 'Geist', system-ui, sans-serif;
--font-mono: 'Geist Mono', ui-monospace, monospace;
```

### Font Loading

Fonts are loaded via CDN with `font-display: swap` for performance:

```css
@font-face {
  font-family: 'Geist';
  src: url('https://cdn.jsdelivr.net/npm/geist@1.5.1/dist/fonts/geist-sans/Geist-Variable.woff2')
    format('woff2');
  font-weight: 100 900;
  font-display: swap;
}
```

### Type Scale

| Element       | Size                     | Weight          | Letter Spacing   |
| ------------- | ------------------------ | --------------- | ---------------- |
| Hero H1       | `text-4xl` to `text-7xl` | `font-semibold` | `tracking-tight` |
| Section H2    | `text-3xl` to `text-5xl` | `font-semibold` | `tracking-tight` |
| Card H3       | `text-lg` to `text-xl`   | `font-semibold` | default          |
| Body          | `text-base` to `text-lg` | `font-normal`   | default          |
| Small/Caption | `text-sm` to `text-xs`   | `font-medium`   | default          |
| Mono/Code     | `text-xs`                | `font-mono`     | default          |

### Typography Patterns

```tsx
// Hero headline
<h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl
               font-semibold tracking-tight leading-[1.1]">

// Section headline
<h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">

// Body text
<p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">

// Small labels
<span className="text-sm font-medium text-muted-foreground">
```

---

## Spacing

We use an **8px base unit** for consistent spacing:

| Token        | Value     | Pixels | Usage           |
| ------------ | --------- | ------ | --------------- |
| `--space-1`  | `0.25rem` | 4px    | Tight spacing   |
| `--space-2`  | `0.5rem`  | 8px    | Base unit       |
| `--space-3`  | `0.75rem` | 12px   | Small gaps      |
| `--space-4`  | `1rem`    | 16px   | Default padding |
| `--space-5`  | `1.5rem`  | 24px   | Medium gaps     |
| `--space-6`  | `2rem`    | 32px   | Section padding |
| `--space-8`  | `3rem`    | 48px   | Large gaps      |
| `--space-10` | `4rem`    | 64px   | XL gaps         |
| `--space-12` | `6rem`    | 96px   | Section margins |
| `--space-16` | `8rem`    | 128px  | Hero spacing    |

### Section Spacing

```tsx
// Standard section
<section className="py-24 sm:py-32 px-6">

// Hero section
<section className="min-h-screen flex flex-col">

// Compact section
<section className="py-12 lg:py-16">
```

---

## Border Radius

Consistent rounded corners for a polished look:

| Token          | Value            | Usage                      |
| -------------- | ---------------- | -------------------------- |
| `--radius-sm`  | `0.375rem` (6px) | Small buttons, badges      |
| `--radius-md`  | `0.5rem` (8px)   | Inputs, small cards        |
| `--radius-lg`  | `0.75rem` (12px) | Cards, dropdowns           |
| `--radius-xl`  | `1rem` (16px)    | Large cards, modals        |
| `--radius-2xl` | `1.5rem` (24px)  | Hero cards, feature blocks |

```tsx
// Button
<button className="rounded-xl">

// Card
<div className="rounded-2xl">

// Badge
<span className="rounded-full">
```

---

## Iconography

### Icon Library: Phosphor Icons

We use [Phosphor Icons](https://phosphoricons.com/) with the **duotone** weight for visual depth.

```tsx
import { Calendar, Storefront, Handshake } from '@phosphor-icons/react'
;<Calendar size={24} weight="duotone" className="text-amber-500" />
```

### Icon Sizes

| Context     | Size    | Usage           |
| ----------- | ------- | --------------- |
| Inline text | `14-16` | Labels, buttons |
| Cards       | `18-24` | Feature cards   |
| Hero        | `24-32` | Large displays  |

### Common Icons

| Purpose  | Icon                       | Notes              |
| -------- | -------------------------- | ------------------ |
| Events   | `Calendar`                 | Primary event icon |
| Vendors  | `Storefront`               | Vendor/marketplace |
| Sponsors | `Handshake`                | Partnerships       |
| AI       | `Robot`, `Sparkle`         | AI features        |
| Success  | `CheckCircle`              | Confirmation       |
| Close    | `X`                        | Dismiss actions    |
| Navigate | `ArrowRight`, `CaretRight` | CTAs, links        |

---

## Animation System

### Duration Tokens

```css
--duration-instant: 100ms; /* Immediate feedback */
--duration-fast: 150ms; /* Quick transitions */
--duration-normal: 200ms; /* Standard animations */
--duration-slow: 300ms; /* Deliberate motion */
--duration-slower: 400ms; /* Dramatic entrances */
```

### Easing Curves

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1); /* Smooth deceleration */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1); /* Balanced */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Bouncy, playful */
--ease-bounce: cubic-bezier(0.68, -0.6, 0.32, 1.6); /* Exaggerated */
```

### Animation Classes

#### Floating Elements

```css
.animate-float-slow    /* 4s cycle, 6px travel */
.animate-float-medium  /* 3s cycle, 4px travel */
.animate-float-fast    /* 3.5s cycle, 5px travel */
```

#### Entrances

```css
.message-entrance      /* Spring physics entrance */
.menu-entrance         /* Dropdown appear */
.chip-entrance         /* Staggered chip entry */
.tool-success          /* Pop effect for success */
```

#### Interactive

```css
.spring-press          /* Button press with spring */
.chip-hover            /* Lift on hover */
.input-glow            /* Focus glow effect */
```

### Scroll Animations

We use a custom `useScrollAnimation` hook for reveal-on-scroll:

```tsx
import { useScrollAnimation } from '@/hooks/use-scroll-animation'

function Component() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      )}
    >
      Content reveals on scroll
    </div>
  )
}
```

---

## Component Patterns

### Wavy Underlines

A signature design element - decorative SVG underlines for emphasis:

```tsx
// Hero headline with gradient underline
<span className="relative inline-block">
  <span className="...">reimagined.</span>
  <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 200 10">
    <path d="M0 8 Q50 0 100 8 T200 8" stroke="url(#gradient)" strokeWidth="3" fill="none" />
    <defs>
      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#6366f1" />   {/* indigo */}
        <stop offset="50%" stopColor="#8b5cf6" />  {/* violet */}
        <stop offset="100%" stopColor="#06b6d4" /> {/* cyan */}
      </linearGradient>
    </defs>
  </svg>
</span>

// Section headline with solid underline (amber)
<span className="relative inline-block">
  works
  <svg className="absolute -bottom-1 left-0 w-full" height="6" viewBox="0 0 100 6">
    <path d="M0 5 Q25 0 50 5 T100 5" stroke="currentColor" strokeWidth="2" fill="none" className="text-amber-400" />
  </svg>
</span>
```

### Badges

```tsx
// Accent badge (amber for new/launch)
<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                bg-amber-100/50 dark:bg-amber-900/20
                border border-amber-200/50 dark:border-amber-800/30">
  <RocketLaunch size={14} weight="fill" className="text-amber-600 dark:text-amber-400" />
  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
    Just launched
  </span>
</div>

// Muted badge
<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                bg-muted border border-border/50">
  <Icon size={16} weight="duotone" className="text-muted-foreground" />
  <span className="text-sm font-medium text-muted-foreground">Label</span>
</div>
```

### Cards

We have two card styles:

```tsx
// Minimal card - Color via BORDERS and TEXT only (preferred)
// Used in "How it works" section
<div className={cn(
  'relative p-6 rounded-2xl border bg-card transition-all duration-500',
  isActive
    ? 'border-indigo-400 dark:border-indigo-500 border-2'  // Colored border
    : 'border-border hover:border-border/80'
)}>
  {/* Step number - outline style */}
  <div className={cn(
    'w-7 h-7 rounded-full border-2 bg-background',
    isActive ? 'border-indigo-400 text-indigo-600' : 'border-border text-muted-foreground'
  )}>
    1
  </div>

  {/* Icon box - bordered, not filled */}
  <div className={cn(
    'w-12 h-12 rounded-xl border',
    isActive ? 'border-indigo-400 border-2' : 'border-border'
  )}>
    <Icon className={isActive ? 'text-indigo-600' : 'text-muted-foreground'} />
  </div>

  {/* Title gets color when active */}
  <h3 className={isActive ? 'text-indigo-600' : 'text-foreground'}>
    {title}
  </h3>
</div>

// Rich card - Gradient backgrounds (use sparingly)
// Used for AI features, CTAs
<div className="group p-6 rounded-2xl border border-border/50 bg-card
                transition-all duration-500 hover:-translate-y-1 hover:shadow-xl">
  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600
                  flex items-center justify-center mb-4
                  shadow-lg shadow-emerald-500/25">
    <Icon size={24} weight="fill" className="text-white" />
  </div>
  <h3 className="text-lg font-semibold mb-2">{title}</h3>
  <p className="text-sm text-muted-foreground">{description}</p>
</div>
```

**Design Principle**: Prefer minimal cards with border/text coloring. Reserve gradient-filled backgrounds for primary features only.

### Buttons

```tsx
// Primary CTA
<button className="group flex items-center gap-2 px-8 py-4
                   text-base font-medium bg-foreground text-background
                   hover:bg-foreground/90 transition-all rounded-xl
                   shadow-lg hover:shadow-xl hover:-translate-y-0.5">
  Get Started Free
  <ArrowRight size={18} weight="bold"
              className="transition-transform group-hover:translate-x-1" />
</button>

// Secondary/Ghost
<button className="group flex items-center gap-2 px-6 py-4
                   text-base font-medium text-foreground
                   hover:bg-muted/50 transition-all rounded-xl
                   border border-border/50 hover:border-border">
  Watch demo
</button>
```

### Trust Indicators

```tsx
<div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
  <span className="flex items-center gap-2">
    <CheckCircle size={16} weight="fill" className="text-emerald-500" />
    Free forever
  </span>
  <span className="flex items-center gap-2">
    <CheckCircle size={16} weight="fill" className="text-emerald-500" />
    No credit card
  </span>
  <span className="flex items-center gap-2">
    <CheckCircle size={16} weight="fill" className="text-emerald-500" />
    Open source
  </span>
</div>
```

---

## Landing Page Sections

### Current Sections (in order)

| Section          | Component            | Description                                       |
| ---------------- | -------------------- | ------------------------------------------------- |
| Hero             | `Hero.tsx`           | Main headline with gradient underline, CTAs       |
| Logo Cloud       | `LogoCloud.tsx`      | Playful "hopefully soon" infinite scroll          |
| Features by User | `FeaturesByUser.tsx` | Stakeholder cards (Sponsors, Vendors, Organizers) |
| How it Works     | `CoreConcept.tsx`    | 3-step flow with tab selector                     |
| AI Agent         | `AIAgent.tsx`        | Live chat demo with capabilities                  |
| Why Open Source  | `WhyOpenSource.tsx`  | Benefits of open source                           |
| FAQ              | `FAQ.tsx`            | Accordion-style Q&A                               |
| Call to Action   | `CallToAction.tsx`   | Final CTA with trust indicators                   |
| Footer           | `Footer.tsx`         | Links, theme toggle, team attribution             |

### Section Structure

```tsx
<section className="relative py-20 sm:py-28 px-6 overflow-hidden">
  {/* Subtle background - keep it minimal */}
  <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-background to-background" />

  <div className="relative max-w-5xl mx-auto">
    {/* Header */}
    <div className="text-center mb-12">
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight mb-4">
        Section Title
      </h2>
      <p className="text-lg text-muted-foreground">Subtitle here</p>
    </div>

    {/* Content */}
  </div>
</section>
```

### Logo Cloud (Pre-Launch Style)

Honest, playful messaging for a new product:

```tsx
const dreamLogos = [
  { name: 'Your Company?', emoji: '👀' },
  { name: 'Maybe You?', emoji: '🤞' },
  { name: 'Future Partner', emoji: '🤝' },
]

<p className="text-center text-sm text-muted-foreground">
  trusted by... well, we just launched. you could be first.
</p>

// Infinite scroll with pause on hover
<div
  className={cn("flex gap-12", isHovered && "pause-animation")}
  style={{ animation: 'scroll 25s linear infinite' }}
>
  {[...dreamLogos, ...dreamLogos].map((logo) => (
    <div className="flex items-center gap-2 group">
      <span className="group-hover:scale-110">{logo.emoji}</span>
      <span className="text-muted-foreground/70">{logo.name}</span>
    </div>
  ))}
</div>

<p className="text-center text-xs text-muted-foreground/60">
  <Sparkle /> Want to be first? We'd love that.
</p>
```

---

## Dark Mode

We support system preference and manual toggle via the `dark` class.

### Color Adjustments

- **Backgrounds**: Subtle purple tint (`oklch(0.12 0.005 300)`)
- **Cards**: Slightly lighter with purple undertone
- **Primary**: Brighter purple for visibility (`oklch(0.7 0.18 300)`)
- **Borders**: White with low opacity (`oklch(1 0 0 / 12%)`)

### Implementation

```tsx
// Theme toggle component
<button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
  {theme === 'dark' ? <Sun /> : <Moon />}
</button>

// Dark mode classes
<div className="bg-slate-100 dark:bg-slate-800/50">
<span className="text-indigo-600 dark:text-indigo-400">
```

---

## Accessibility

### Color Contrast

All text colors meet WCAG AA standards:

- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum

### Focus States

```css
.input-glow:focus-within {
  box-shadow: 0 0 0 2px oklch(var(--ring) / 0.3);
  border-color: oklch(var(--ring) / 0.5);
}
```

### Motion

Respect user preferences:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Semantic HTML

- Use proper heading hierarchy (`h1` > `h2` > `h3`)
- Include `aria-label` on icon-only buttons
- Use `role` attributes where needed

---

## Quick Reference

### Import Paths

```tsx
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useScrollAnimation } from '@/hooks/use-scroll-animation'
```

### Common Class Combinations

```tsx
// Card with hover
'p-6 rounded-2xl border border-border/50 bg-card transition-all hover:shadow-xl hover:-translate-y-1'

// Section container
'relative max-w-6xl mx-auto px-6'

// Gradient text
'bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent'

// Muted text
'text-sm text-muted-foreground'
```

---

## Contributing

When adding new components or patterns:

1. Follow the established color palette (no new purples!)
2. Use existing spacing tokens
3. Include dark mode variants
4. Add scroll animations for sections
5. Test with `prefers-reduced-motion`

---

_Researched & designed by Hazli · Built by Azmir_

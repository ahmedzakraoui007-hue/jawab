# Jawab UI Design Specification
## The AI Employee Platform for MENA SMEs

---

# Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Brand Identity](#2-brand-identity)
3. [Typography](#3-typography)
4. [Color System](#4-color-system)
5. [Layout System](#5-layout-system)
6. [Components Library](#6-components-library)
7. [Landing Page](#7-landing-page)
8. [Dashboard UI](#8-dashboard-ui)
9. [Mobile Experience](#9-mobile-experience)
10. [Animations & Micro-interactions](#10-animations--micro-interactions)
11. [RTL Support (Arabic)](#11-rtl-support-arabic)
12. [Accessibility](#12-accessibility)
13. [Implementation Guide](#13-implementation-guide)

---

# 1. Design Philosophy

## Core Principles

### **Trust-First Design**
Dubai business owners need to trust an AI with their customers. The UI must feel:
- **Professional** — Not a toy, a business tool
- **Reliable** — Stable, consistent, predictable
- **Transparent** — Show what the AI is doing

### **Bilingual Native**
- Arabic and English are equal citizens
- RTL/LTR switching is seamless
- No "translated" feel — native in both

### **Speed Perception**
- Instant feedback on all actions
- Skeleton loaders, not spinners
- Optimistic UI updates

### **Mobile-First Reality**
- 70% of Dubai SME owners check dashboards on phone
- WhatsApp-like familiarity
- Thumb-friendly touch targets

---

## Design Tone

```
Professional ←――――●―――→ Playful
                 ↑
            Business-friendly
            but approachable

Minimal ←――――●―――――――→ Feature-rich
              ↑
         Clean but comprehensive

Traditional ←――――――●―→ Modern
                   ↑
              Contemporary
              with MENA warmth
```

---

# 2. Brand Identity

## Logo

### Primary Logo
```
┌─────────────────────────────┐
│                             │
│     ◯                       │
│    ╱ ╲    J A W A B         │
│   ╱   ╲   جــواب            │
│  ◯─────◯                    │
│                             │
└─────────────────────────────┘
```

- Abstract speech bubble / connection nodes
- Works in Arabic and English
- Scalable from favicon to billboard

### Logo Variations

| Variant | Use Case |
|---------|----------|
| Full (Icon + Text) | Website header, marketing |
| Icon only | Favicon, app icon, small spaces |
| Text only | Legal documents, partnerships |
| Reversed | Dark backgrounds |

### Logo Spacing

- Minimum clear space = height of "J"
- Minimum size = 24px height

---

## Brand Voice in UI

| Context | Tone | Example |
|---------|------|---------|
| Success messages | Warm, celebratory | "Booking confirmed! Your customer is all set. 🎉" |
| Error messages | Helpful, not blaming | "Couldn't connect. Let's try again." |
| Empty states | Encouraging | "No conversations yet. They'll appear here once customers message you." |
| Loading | Reassuring | "Setting up your AI assistant..." |

---

# 3. Typography

## Font Stack

### Primary: **IBM Plex Sans Arabic**
- Designed for Arabic + Latin harmony
- Professional yet friendly
- Excellent readability
- Free (Google Fonts)

```css
font-family: 'IBM Plex Sans Arabic', 'IBM Plex Sans', system-ui, sans-serif;
```

### Alternative: **Noto Sans Arabic**
- Google's universal font
- Supports all Arabic variants
- Fallback option

```css
font-family: 'Noto Sans Arabic', 'Noto Sans', system-ui, sans-serif;
```

### Monospace (Code/Numbers): **IBM Plex Mono**
```css
font-family: 'IBM Plex Mono', 'Courier New', monospace;
```

---

## Type Scale

| Name | Size | Weight | Line Height | Use |
|------|------|--------|-------------|-----|
| Display | 48px / 3rem | 600 | 1.1 | Hero headlines |
| H1 | 36px / 2.25rem | 600 | 1.2 | Page titles |
| H2 | 28px / 1.75rem | 600 | 1.3 | Section headers |
| H3 | 22px / 1.375rem | 600 | 1.4 | Card titles |
| H4 | 18px / 1.125rem | 600 | 1.4 | Subsections |
| Body Large | 18px / 1.125rem | 400 | 1.6 | Featured text |
| Body | 16px / 1rem | 400 | 1.6 | Default text |
| Body Small | 14px / 0.875rem | 400 | 1.5 | Secondary text |
| Caption | 12px / 0.75rem | 400 | 1.4 | Labels, hints |
| Overline | 12px / 0.75rem | 600 | 1.4 | Categories, tags |

---

## CSS Variables for Typography

```css
:root {
  /* Font Families */
  --font-primary: 'IBM Plex Sans Arabic', 'IBM Plex Sans', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
  
  /* Font Sizes */
  --text-display: 3rem;
  --text-h1: 2.25rem;
  --text-h2: 1.75rem;
  --text-h3: 1.375rem;
  --text-h4: 1.125rem;
  --text-body-lg: 1.125rem;
  --text-body: 1rem;
  --text-body-sm: 0.875rem;
  --text-caption: 0.75rem;
  
  /* Font Weights */
  --font-regular: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  
  /* Line Heights */
  --leading-tight: 1.2;
  --leading-normal: 1.5;
  --leading-relaxed: 1.6;
}
```

---

# 4. Color System

## Primary Palette

### Brand Blue
The primary action color. Represents trust, technology, communication.

```css
--blue-50: #EFF6FF;
--blue-100: #DBEAFE;
--blue-200: #BFDBFE;
--blue-300: #93C5FD;
--blue-400: #60A5FA;
--blue-500: #3B82F6;  /* Primary */
--blue-600: #2563EB;  /* Primary Dark */
--blue-700: #1D4ED8;
--blue-800: #1E40AF;
--blue-900: #1E3A8A;
```

### Success Green
For confirmations, successful actions, positive metrics.

```css
--green-50: #ECFDF5;
--green-100: #D1FAE5;
--green-200: #A7F3D0;
--green-300: #6EE7B7;
--green-400: #34D399;
--green-500: #10B981;  /* Primary */
--green-600: #059669;
--green-700: #047857;
```

### Warning Amber
For alerts, pending states, important notices.

```css
--amber-50: #FFFBEB;
--amber-100: #FEF3C7;
--amber-200: #FDE68A;
--amber-300: #FCD34D;
--amber-400: #FBBF24;
--amber-500: #F59E0B;  /* Primary */
--amber-600: #D97706;
```

### Error Red
For errors, destructive actions, critical alerts.

```css
--red-50: #FEF2F2;
--red-100: #FEE2E2;
--red-200: #FECACA;
--red-300: #FCA5A5;
--red-400: #F87171;
--red-500: #EF4444;  /* Primary */
--red-600: #DC2626;
```

---

## Neutral Palette

```css
--gray-50: #F9FAFB;   /* Background light */
--gray-100: #F3F4F6;  /* Background secondary */
--gray-200: #E5E7EB;  /* Borders */
--gray-300: #D1D5DB;  /* Borders dark */
--gray-400: #9CA3AF;  /* Placeholder text */
--gray-500: #6B7280;  /* Secondary text */
--gray-600: #4B5563;  /* Primary text light */
--gray-700: #374151;  /* Primary text */
--gray-800: #1F2937;  /* Headings */
--gray-900: #111827;  /* Headings dark */
```

---

## Semantic Color Tokens

```css
:root {
  /* Backgrounds */
  --bg-primary: #FFFFFF;
  --bg-secondary: var(--gray-50);
  --bg-tertiary: var(--gray-100);
  --bg-inverse: var(--gray-900);
  
  /* Text */
  --text-primary: var(--gray-800);
  --text-secondary: var(--gray-600);
  --text-tertiary: var(--gray-500);
  --text-inverse: #FFFFFF;
  --text-link: var(--blue-600);
  
  /* Borders */
  --border-light: var(--gray-200);
  --border-default: var(--gray-300);
  --border-focus: var(--blue-500);
  
  /* Actions */
  --action-primary: var(--blue-600);
  --action-primary-hover: var(--blue-700);
  --action-secondary: var(--gray-100);
  --action-secondary-hover: var(--gray-200);
  
  /* Status */
  --status-success: var(--green-500);
  --status-warning: var(--amber-500);
  --status-error: var(--red-500);
  --status-info: var(--blue-500);
}
```

---

## Dark Mode (Optional - Phase 2)

```css
[data-theme="dark"] {
  --bg-primary: var(--gray-900);
  --bg-secondary: var(--gray-800);
  --bg-tertiary: var(--gray-700);
  
  --text-primary: var(--gray-100);
  --text-secondary: var(--gray-300);
  --text-tertiary: var(--gray-400);
  
  --border-light: var(--gray-700);
  --border-default: var(--gray-600);
}
```

---

## WhatsApp Brand Colors (For Channel Indicators)

```css
--whatsapp-green: #25D366;
--whatsapp-dark: #128C7E;
--whatsapp-light: #DCF8C6;
```

## Instagram Brand Colors

```css
--instagram-pink: #E1306C;
--instagram-purple: #833AB4;
--instagram-orange: #F77737;
```

---

# 5. Layout System

## Grid System

### Container Widths

```css
--container-sm: 640px;   /* Mobile landscape */
--container-md: 768px;   /* Tablet */
--container-lg: 1024px;  /* Small desktop */
--container-xl: 1280px;  /* Desktop */
--container-2xl: 1536px; /* Large desktop */
```

### Spacing Scale

```css
--space-0: 0;
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

---

## Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Header (64px)                                    [Profile] │
├────────────┬────────────────────────────────────────────────┤
│            │                                                │
│  Sidebar   │  Main Content Area                             │
│  (240px)   │                                                │
│            │  ┌────────────────────────────────────────┐   │
│  • Overview│  │  Page Header                           │   │
│  • Bookings│  │  [Breadcrumb] / [Title] / [Actions]    │   │
│  • Convers.│  └────────────────────────────────────────┘   │
│  • Services│                                                │
│  • AI Train│  ┌────────────────────────────────────────┐   │
│  • Settings│  │                                        │   │
│            │  │  Content Cards                         │   │
│            │  │                                        │   │
│            │  └────────────────────────────────────────┘   │
│            │                                                │
└────────────┴────────────────────────────────────────────────┘
```

### Mobile Layout (< 768px)

```
┌─────────────────────────┐
│  Header          [Menu] │
├─────────────────────────┤
│                         │
│  Content Area           │
│  (Full width)           │
│                         │
│                         │
│                         │
├─────────────────────────┤
│  Bottom Navigation      │
│  [Home][Book][Chat][⚙️] │
└─────────────────────────┘
```

---

## Border Radius

```css
--radius-none: 0;
--radius-sm: 0.25rem;    /* 4px - Small elements */
--radius-md: 0.5rem;     /* 8px - Buttons, inputs */
--radius-lg: 0.75rem;    /* 12px - Cards */
--radius-xl: 1rem;       /* 16px - Modals */
--radius-2xl: 1.5rem;    /* 24px - Large cards */
--radius-full: 9999px;   /* Pills, avatars */
```

---

## Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

/* Colored shadows for cards */
--shadow-blue: 0 10px 40px -10px rgb(37 99 235 / 0.2);
--shadow-green: 0 10px 40px -10px rgb(16 185 129 / 0.2);
```

---

# 6. Components Library

## Buttons

### Primary Button

```jsx
<button className="btn-primary">
  Get Started Free
</button>
```

```css
.btn-primary {
  background: var(--blue-600);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  font-weight: var(--font-semibold);
  font-size: var(--text-body);
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
}

.btn-primary:hover {
  background: var(--blue-700);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-primary:disabled {
  background: var(--gray-300);
  cursor: not-allowed;
  transform: none;
}
```

### Secondary Button

```css
.btn-secondary {
  background: white;
  color: var(--gray-700);
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  font-weight: var(--font-semibold);
  border: 1px solid var(--gray-300);
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--gray-50);
  border-color: var(--gray-400);
}
```

### Ghost Button

```css
.btn-ghost {
  background: transparent;
  color: var(--blue-600);
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  font-weight: var(--font-semibold);
  border: none;
  transition: all 0.2s ease;
}

.btn-ghost:hover {
  background: var(--blue-50);
}
```

### Button Sizes

```css
.btn-sm { padding: 0.5rem 1rem; font-size: var(--text-body-sm); }
.btn-md { padding: 0.75rem 1.5rem; font-size: var(--text-body); }
.btn-lg { padding: 1rem 2rem; font-size: var(--text-body-lg); }
```

---

## Input Fields

### Text Input

```jsx
<div className="input-group">
  <label htmlFor="email">Email</label>
  <input 
    type="email" 
    id="email" 
    placeholder="you@example.com"
    className="input"
  />
  <span className="input-hint">We'll never share your email.</span>
</div>
```

```css
.input-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.input-group label {
  font-size: var(--text-body-sm);
  font-weight: var(--font-medium);
  color: var(--text-primary);
}

.input {
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  font-size: var(--text-body);
  transition: all 0.2s ease;
  background: white;
}

.input:focus {
  outline: none;
  border-color: var(--blue-500);
  box-shadow: 0 0 0 3px var(--blue-100);
}

.input::placeholder {
  color: var(--gray-400);
}

.input-hint {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.input-error {
  border-color: var(--red-500);
}

.input-error:focus {
  box-shadow: 0 0 0 3px var(--red-100);
}
```

---

## Cards

### Basic Card

```css
.card {
  background: white;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  padding: var(--space-6);
  transition: all 0.2s ease;
}

.card:hover {
  box-shadow: var(--shadow-md);
}
```

### Stats Card

```jsx
<div className="stats-card">
  <div className="stats-icon stats-icon-blue">
    <MessageIcon />
  </div>
  <div className="stats-content">
    <span className="stats-value">127</span>
    <span className="stats-label">Messages Today</span>
  </div>
  <div className="stats-trend stats-trend-up">
    <TrendUpIcon /> +12%
  </div>
</div>
```

```css
.stats-card {
  background: white;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  padding: var(--space-5);
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.stats-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stats-icon-blue {
  background: var(--blue-100);
  color: var(--blue-600);
}

.stats-icon-green {
  background: var(--green-100);
  color: var(--green-600);
}

.stats-value {
  font-size: var(--text-h2);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  display: block;
}

.stats-label {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.stats-trend {
  font-size: var(--text-body-sm);
  font-weight: var(--font-medium);
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.stats-trend-up {
  color: var(--green-600);
}

.stats-trend-down {
  color: var(--red-600);
}
```

---

## Conversation Bubble (WhatsApp-like)

```jsx
<div className="chat-bubble chat-bubble-customer">
  <p>السلام عليكم، عندكم مواعيد بكره؟</p>
  <span className="chat-time">10:32 AM</span>
</div>

<div className="chat-bubble chat-bubble-ai">
  <p>وعليكم السلام! نعم عندنا مواعيد. أي خدمة تحتاجين؟</p>
  <span className="chat-time">10:32 AM</span>
  <span className="chat-ai-badge">AI</span>
</div>
```

```css
.chat-bubble {
  max-width: 80%;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  position: relative;
  margin-bottom: var(--space-2);
}

.chat-bubble-customer {
  background: var(--gray-100);
  color: var(--text-primary);
  margin-left: auto;
  border-bottom-right-radius: var(--radius-sm);
}

.chat-bubble-ai {
  background: var(--blue-600);
  color: white;
  margin-right: auto;
  border-bottom-left-radius: var(--radius-sm);
}

.chat-time {
  font-size: var(--text-caption);
  opacity: 0.7;
  display: block;
  text-align: right;
  margin-top: var(--space-1);
}

.chat-ai-badge {
  position: absolute;
  top: -8px;
  left: -8px;
  background: var(--green-500);
  color: white;
  font-size: 10px;
  font-weight: var(--font-bold);
  padding: 2px 6px;
  border-radius: var(--radius-full);
}
```

---

## Status Badge

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: var(--text-caption);
  font-weight: var(--font-medium);
}

.badge-success {
  background: var(--green-100);
  color: var(--green-700);
}

.badge-warning {
  background: var(--amber-100);
  color: var(--amber-700);
}

.badge-error {
  background: var(--red-100);
  color: var(--red-700);
}

.badge-info {
  background: var(--blue-100);
  color: var(--blue-700);
}

/* With dot indicator */
.badge::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 6px;
}

.badge-success::before { background: var(--green-500); }
.badge-warning::before { background: var(--amber-500); }
.badge-error::before { background: var(--red-500); }
```

---

## Navigation

### Sidebar Navigation

```jsx
<nav className="sidebar">
  <div className="sidebar-logo">
    <Logo />
  </div>
  
  <div className="sidebar-nav">
    <a href="/dashboard" className="nav-item nav-item-active">
      <HomeIcon />
      <span>Overview</span>
    </a>
    <a href="/bookings" className="nav-item">
      <CalendarIcon />
      <span>Bookings</span>
      <span className="nav-badge">12</span>
    </a>
    <a href="/conversations" className="nav-item">
      <ChatIcon />
      <span>Conversations</span>
    </a>
  </div>
</nav>
```

```css
.sidebar {
  width: 240px;
  height: 100vh;
  background: white;
  border-right: 1px solid var(--border-light);
  padding: var(--space-4);
  position: fixed;
  left: 0;
  top: 0;
}

.sidebar-logo {
  padding: var(--space-4);
  margin-bottom: var(--space-6);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.2s ease;
  margin-bottom: var(--space-1);
}

.nav-item:hover {
  background: var(--gray-100);
  color: var(--text-primary);
}

.nav-item-active {
  background: var(--blue-50);
  color: var(--blue-600);
}

.nav-badge {
  margin-left: auto;
  background: var(--blue-600);
  color: white;
  font-size: 11px;
  font-weight: var(--font-semibold);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}
```

---

## Tables

```jsx
<table className="table">
  <thead>
    <tr>
      <th>Customer</th>
      <th>Service</th>
      <th>Date</th>
      <th>Status</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <div className="table-customer">
          <span className="customer-name">Sara Ahmed</span>
          <span className="customer-phone">+971 55 123 4567</span>
        </div>
      </td>
      <td>Haircut</td>
      <td>Today, 4:00 PM</td>
      <td><span className="badge badge-success">Confirmed</span></td>
      <td>
        <button className="btn-ghost btn-sm">View</button>
      </td>
    </tr>
  </tbody>
</table>
```

```css
.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  text-align: left;
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-body-sm);
  font-weight: var(--font-semibold);
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-light);
  background: var(--gray-50);
}

.table td {
  padding: var(--space-4);
  border-bottom: 1px solid var(--border-light);
}

.table tr:hover {
  background: var(--gray-50);
}

.table-customer {
  display: flex;
  flex-direction: column;
}

.customer-name {
  font-weight: var(--font-medium);
  color: var(--text-primary);
}

.customer-phone {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}
```

---

# 7. Landing Page

## Hero Section

```jsx
<section className="hero">
  <div className="hero-badges">
    <span className="badge badge-info">🇦🇪 Made for UAE</span>
    <span className="badge badge-info">🌙 24/7</span>
    <span className="badge badge-info">🗣️ 6 Languages</span>
  </div>
  
  <h1 className="hero-title">
    Your AI Employee<br />
    <span className="gradient-text">That Never Sleeps</span>
  </h1>
  
  <p className="hero-subtitle">
    Stop losing 40% of customers to missed calls. Jawab answers WhatsApp 
    and phone calls in Arabic, English, and Hindi — 24/7.
  </p>
  
  <div className="hero-cta">
    <button className="btn-primary btn-lg">Start Free Trial</button>
    <button className="btn-secondary btn-lg">Watch Demo</button>
  </div>
  
  <div className="hero-image">
    <PhoneMockup />
  </div>
</section>
```

```css
.hero {
  text-align: center;
  padding: var(--space-20) var(--space-4);
  max-width: var(--container-lg);
  margin: 0 auto;
}

.hero-badges {
  display: flex;
  justify-content: center;
  gap: var(--space-2);
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
}

.hero-title {
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: var(--font-bold);
  line-height: 1.1;
  margin-bottom: var(--space-6);
}

.gradient-text {
  background: linear-gradient(135deg, var(--blue-600), var(--green-500));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: var(--text-body-lg);
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto var(--space-8);
  line-height: var(--leading-relaxed);
}

.hero-cta {
  display: flex;
  justify-content: center;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.hero-image {
  margin-top: var(--space-16);
}
```

---

## Features Section

```css
.features {
  padding: var(--space-20) var(--space-4);
  background: var(--gray-50);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-8);
  max-width: var(--container-xl);
  margin: 0 auto;
}

.feature-card {
  background: white;
  padding: var(--space-8);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-light);
  text-align: center;
  transition: all 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.feature-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto var(--space-4);
  background: var(--blue-100);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--blue-600);
}

.feature-title {
  font-size: var(--text-h3);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-3);
}

.feature-description {
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
}
```

---

## Pricing Section

```css
.pricing {
  padding: var(--space-20) var(--space-4);
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-6);
  max-width: var(--container-lg);
  margin: 0 auto;
}

.pricing-card {
  background: white;
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-light);
  padding: var(--space-8);
  position: relative;
}

.pricing-card-popular {
  border-color: var(--blue-600);
  box-shadow: var(--shadow-blue);
}

.pricing-popular-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--blue-600);
  color: white;
  padding: var(--space-1) var(--space-4);
  border-radius: var(--radius-full);
  font-size: var(--text-caption);
  font-weight: var(--font-semibold);
}

.pricing-name {
  font-size: var(--text-h4);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-2);
}

.pricing-price {
  font-size: var(--text-h1);
  font-weight: var(--font-bold);
  color: var(--text-primary);
}

.pricing-price span {
  font-size: var(--text-body);
  font-weight: var(--font-regular);
  color: var(--text-secondary);
}

.pricing-features {
  list-style: none;
  padding: 0;
  margin: var(--space-6) 0;
}

.pricing-features li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  color: var(--text-secondary);
}

.pricing-features li::before {
  content: '✓';
  color: var(--green-500);
  font-weight: bold;
}
```

---

# 8. Dashboard UI

## Overview Page

```
┌────────────────────────────────────────────────────────────────┐
│  Good morning, Sarah! 👋                                       │
│  Here's how Jawab performed today                              │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐ │
│  │ 📱 127      │ │ 📅 23       │ │ ⚡ 2.1s     │ │ ⭐ 4.8   │ │
│  │ Messages    │ │ Bookings    │ │ Avg Reply   │ │ Rating   │ │
│  │ ↑ 12%       │ │ ↑ 8%        │ │ ↓ 0.3s      │ │ ↑ 0.2    │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘ │
│                                                                │
│  ┌─────────────────────────────┐ ┌────────────────────────────┐│
│  │ Recent Conversations        │ │ Upcoming Bookings          ││
│  │                             │ │                            ││
│  │ +971 55 *** 4421     2m ago │ │ 2:00 PM - Sara - Haircut   ││
│  │ "Booked haircut for 4pm"    │ │ 3:30 PM - Fatima - Nails   ││
│  │                             │ │ 5:00 PM - Noor - Color     ││
│  │ +971 50 *** 8837    15m ago │ │                            ││
│  │ "Asked about bridal pkg"    │ │ [View Calendar →]          ││
│  │                             │ │                            ││
│  │ [View All →]                │ │                            ││
│  └─────────────────────────────┘ └────────────────────────────┘│
│                                                                │
│  ┌─────────────────────────────────────────────────────────────┤
│  │ Messages This Week                          [Export CSV]   │
│  │                                                            │
│  │  150 ┤                                    ╭─╮              │
│  │  100 ┤              ╭─╮    ╭─╮    ╭─╮   │ │              │
│  │   50 ┤    ╭─╮    ╭─╯ │╭─╯ ╰─╮╭─╯ ╰─╮╭─╯ │              │
│  │    0 └────┴─┴────┴───┴┴────┴┴─────┴┴────┴─┘              │
│  │        Mon   Tue   Wed   Thu   Fri   Sat   Sun            │
│  └───────────────────────────────────────────────────────────┘│
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Conversations Page

```css
.conversations-layout {
  display: grid;
  grid-template-columns: 350px 1fr;
  height: calc(100vh - 64px);
}

.conversations-list {
  border-right: 1px solid var(--border-light);
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4);
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: background 0.2s;
}

.conversation-item:hover {
  background: var(--gray-50);
}

.conversation-item-active {
  background: var(--blue-50);
  border-left: 3px solid var(--blue-600);
}

.conversation-avatar {
  width: 48px;
  height: 48px;
  background: var(--gray-200);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-semibold);
  color: var(--text-secondary);
}

.conversation-preview {
  flex: 1;
  min-width: 0;
}

.conversation-name {
  font-weight: var(--font-medium);
  margin-bottom: var(--space-1);
}

.conversation-last-message {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-meta {
  text-align: right;
}

.conversation-time {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.conversation-unread {
  background: var(--blue-600);
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: var(--radius-full);
  margin-top: var(--space-2);
}
```

---

# 9. Mobile Experience

## Bottom Navigation

```jsx
<nav className="mobile-nav">
  <a href="/dashboard" className="mobile-nav-item mobile-nav-item-active">
    <HomeIcon />
    <span>Home</span>
  </a>
  <a href="/bookings" className="mobile-nav-item">
    <CalendarIcon />
    <span>Bookings</span>
  </a>
  <a href="/conversations" className="mobile-nav-item">
    <ChatIcon />
    <span>Chats</span>
    <span className="mobile-nav-badge">3</span>
  </a>
  <a href="/settings" className="mobile-nav-item">
    <SettingsIcon />
    <span>Settings</span>
  </a>
</nav>
```

```css
.mobile-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid var(--border-light);
  padding: var(--space-2) var(--space-4);
  padding-bottom: env(safe-area-inset-bottom, var(--space-2));
  z-index: 100;
}

@media (max-width: 768px) {
  .mobile-nav {
    display: flex;
    justify-content: space-around;
  }
}

.mobile-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2);
  color: var(--text-tertiary);
  text-decoration: none;
  font-size: var(--text-caption);
  position: relative;
}

.mobile-nav-item-active {
  color: var(--blue-600);
}

.mobile-nav-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: var(--red-500);
  color: white;
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}
```

---

## Touch Targets

```css
/* Minimum touch target: 44x44px */
.touch-target {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Add padding to small interactive elements */
.btn-icon {
  padding: var(--space-3);
}
```

---

# 10. Animations & Micro-interactions

## Page Transitions

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease;
}

.animate-slide-up {
  animation: slideUp 0.4s ease;
}

.animate-slide-in {
  animation: slideIn 0.3s ease;
}
```

---

## Staggered List Animation

```css
.stagger-list > * {
  opacity: 0;
  animation: slideUp 0.4s ease forwards;
}

.stagger-list > *:nth-child(1) { animation-delay: 0.05s; }
.stagger-list > *:nth-child(2) { animation-delay: 0.1s; }
.stagger-list > *:nth-child(3) { animation-delay: 0.15s; }
.stagger-list > *:nth-child(4) { animation-delay: 0.2s; }
.stagger-list > *:nth-child(5) { animation-delay: 0.25s; }
```

---

## Button Interactions

```css
.btn {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn:hover {
  transform: translateY(-2px);
}

.btn:active {
  transform: translateY(0) scale(0.98);
}

/* Ripple effect */
.btn-ripple {
  position: relative;
  overflow: hidden;
}

.btn-ripple::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.btn-ripple:active::after {
  width: 300px;
  height: 300px;
}
```

---

## Loading States

### Skeleton Loader

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--gray-200) 25%,
    var(--gray-100) 50%,
    var(--gray-200) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: var(--radius-md);
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-text {
  height: 1em;
  margin-bottom: var(--space-2);
}

.skeleton-avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
}

.skeleton-card {
  height: 120px;
}
```

### Pulse Indicator (for live/AI status)

```css
.pulse {
  position: relative;
}

.pulse::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: inherit;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.5);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

.ai-status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.ai-status-dot {
  width: 8px;
  height: 8px;
  background: var(--green-500);
  border-radius: 50%;
}

.ai-status-dot.pulse::before {
  background: var(--green-500);
}
```

---

## Chat Typing Indicator

```css
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: var(--space-3) var(--space-4);
  background: var(--gray-100);
  border-radius: var(--radius-lg);
  width: fit-content;
}

.typing-dot {
  width: 8px;
  height: 8px;
  background: var(--gray-400);
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-8px); }
}
```

---

# 11. RTL Support (Arabic)

## Direction Setup

```css
/* Apply to html element based on language */
html[dir="rtl"] {
  direction: rtl;
}

/* Or use CSS logical properties */
.card {
  padding-inline-start: var(--space-4);  /* Works for both RTL/LTR */
  margin-inline-end: var(--space-2);
}
```

---

## Flexbox RTL

```css
/* Use logical properties */
.flex-row {
  display: flex;
  flex-direction: row; /* Automatically flips in RTL */
}

/* For manual control */
[dir="rtl"] .flex-row-force {
  flex-direction: row-reverse;
}
```

---

## Icons That Need Flipping

```css
/* Icons that should flip in RTL */
[dir="rtl"] .icon-arrow-right {
  transform: scaleX(-1);
}

[dir="rtl"] .icon-chevron {
  transform: scaleX(-1);
}

/* Icons that should NOT flip */
.icon-no-flip {
  /* Checkmarks, X, phone, etc. stay the same */
}
```

---

## Text Alignment

```css
/* Use start/end instead of left/right */
.text-align-start { text-align: start; }
.text-align-end { text-align: end; }

/* For specific overrides */
.text-always-left { text-align: left !important; }
.text-always-right { text-align: right !important; }
```

---

## Arabic-Specific Styles

```css
/* Slightly larger line-height for Arabic text */
[lang="ar"] {
  line-height: 1.8;
}

/* Arabic numerals option */
[lang="ar"] .use-arabic-numerals {
  font-feature-settings: "locl";
}
```

---

# 12. Accessibility

## Focus States

```css
/* Visible focus for keyboard users */
:focus-visible {
  outline: 2px solid var(--blue-500);
  outline-offset: 2px;
}

/* Remove outline for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}

/* Custom focus for inputs */
.input:focus-visible {
  outline: none;
  border-color: var(--blue-500);
  box-shadow: 0 0 0 3px var(--blue-100);
}
```

---

## Screen Reader Only

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

## Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Color Contrast

All text combinations meet WCAG 2.1 AA standards:

| Background | Text Color | Contrast Ratio |
|------------|------------|----------------|
| White | Gray-800 | 12.6:1 ✅ |
| White | Gray-600 | 7.0:1 ✅ |
| White | Blue-600 | 4.7:1 ✅ |
| Blue-600 | White | 4.7:1 ✅ |
| Gray-900 | White | 17.4:1 ✅ |

---

# 13. Implementation Guide

## Tech Stack Recommendation

| Layer | Technology | Why |
|-------|------------|-----|
| Framework | **Next.js 14+** | Server components, App Router, great DX |
| Styling | **Tailwind CSS** | Utility-first, fast development |
| Components | **shadcn/ui** | Beautiful, accessible, customizable |
| Icons | **Lucide React** | Clean, consistent, MIT licensed |
| Animations | **Framer Motion** | Powerful, React-native feel |
| Forms | **React Hook Form** | Performance, validation |
| State | **Zustand** | Simple, fast, minimal |
| Charts | **Recharts** | React-native, customizable |

---

## File Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── sign-up/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── bookings/
│   │   ├── conversations/
│   │   ├── services/
│   │   └── settings/
│   ├── (marketing)/
│   │   ├── page.tsx
│   │   ├── pricing/
│   │   └── about/
│   └── api/
├── components/
│   ├── ui/              # shadcn components
│   ├── dashboard/       # Dashboard-specific
│   ├── marketing/       # Landing page
│   └── shared/          # Shared components
├── lib/
│   ├── utils.ts
│   └── constants.ts
├── styles/
│   ├── globals.css
│   └── variables.css
└── types/
```

---

## Tailwind Config

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans Arabic', 'IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease',
        'slide-up': 'slideUp 0.4s ease',
        'pulse-slow': 'pulse 3s infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

---

## Component Example: Stats Card

```tsx
// components/dashboard/StatsCard.tsx
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  variant?: 'blue' | 'green' | 'amber' | 'red';
}

export function StatsCard({ 
  title, 
  value, 
  change, 
  icon: Icon,
  variant = 'blue' 
}: StatsCardProps) {
  const variants = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', variants[variant])}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <span className="text-2xl font-bold text-gray-800 block">{value}</span>
        <span className="text-sm text-gray-500">{title}</span>
      </div>
      {change !== undefined && (
        <div className={cn(
          'text-sm font-medium flex items-center gap-1',
          change >= 0 ? 'text-green-600' : 'text-red-600'
        )}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
        </div>
      )}
    </div>
  );
}
```

---

## Google Fonts Import

```html
<!-- In your HTML head or _document.tsx -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono&display=swap" rel="stylesheet">
```

---

## Quick Start Commands

```bash
# Create Next.js project
npx create-next-app@latest jawab --typescript --tailwind --eslint --app --src-dir

# Install dependencies
npm install lucide-react framer-motion recharts zustand react-hook-form @hookform/resolvers zod

# Install shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input badge table dialog

# Run development server
npm run dev
```

---

# Summary

This UI specification provides everything needed to build a professional, trustworthy, and beautiful interface for Jawab:

1. **Brand Identity** — Professional yet approachable
2. **Typography** — IBM Plex Sans Arabic for bilingual harmony
3. **Colors** — Trust-building blue with clear status indicators
4. **Components** — Production-ready, accessible, responsive
5. **Animations** — Subtle, purposeful micro-interactions
6. **RTL Support** — Native Arabic experience
7. **Accessibility** — WCAG 2.1 AA compliant

**Key Principles:**
- Mobile-first (Dubai SMEs use phones)
- WhatsApp-familiar patterns
- Trust-building design
- Fast, responsive, instant feedback
- Bilingual from day one

---

*Document Version: 1.0*
*Last Updated: February 2025*
*For: Jawab Development Team*
# Lucci Website - AI Coding Rules

This file contains rules and guidelines for AI assistants working on the Lucci website codebase.

## Design System

### Color Palette
All colors are defined in `lib/constants/theme.ts` as the `COLORS` constant.

**Primary Colors:**
- `COLORS.primary` = '#00827B' (Teal - main brand color)
- `COLORS.primaryLight` = '#3D9D98' (Light teal)
- `COLORS.primaryLighter` = '#63BBB6' (Very light teal)

**Background Colors:**
- `COLORS.backgroundMint` = '#83EEE8' (Light mint - homepage background)
- `COLORS.backgroundLight` = '#D4F6F4' (Very light mint - product cards)
- `COLORS.white` = '#FFFFFF'

**Text Colors:**
- `COLORS.textPrimary` = '#0A0A0A' (Ink - main text)
- `COLORS.textMuted` = '#6B7280' (Muted text)
- `COLORS.textOnPrimary` = '#FFFFFF' (Text on primary color)
- `COLORS.textOnMint` = '#00827B' (Text on mint background)

**Gray Scale:**
- `COLORS.gray[50]` through `COLORS.gray[900]` (50-900 scale)

**RULE:** Always use `COLORS` constants. Never hardcode color values like '#00827B' directly in components.

### Typography
Defined in `lib/constants/theme.ts` as `TYPOGRAPHY` constant.

**Font Families:**
- Sans: Inter, system-ui, sans-serif (default)
- Serif: Georgia, Times New Roman, serif (special cases only)

**Font Sizes:**
- xs: 0.75rem through 7xl: 4.5rem
- Use responsive sizing with Tailwind classes (text-sm, text-base, text-lg, etc.)

### Spacing
Defined in `lib/constants/theme.ts` as `SPACING` constant.
- xs: 0.5rem through 3xl: 4rem
- Use Tailwind spacing utilities (p-4, m-6, gap-8, etc.)

### Shadows
Defined in `lib/constants/theme.ts` as `SHADOWS` constant.
- sm, md, lg, xl, notification
- **RULE:** Use `SHADOWS.notification` for card components with high elevation

### Animations
Defined in `lib/constants/theme.ts` as `ANIMATION` constant.
- Durations: fast (150ms), normal (300ms), slow (500ms), slower (700ms)

**Custom Animation Classes (in `app/globals.css`):**
- `animate-fade-in-up` - Fade in with upward motion
- `animate-slide-up` - Slide up from bottom
- `animate-float-glow` - Floating animation with glow
- `animate-slide-in-left` / `animate-slide-in-right` - Slide in from sides
- `animate-on-scroll` - Scroll-triggered animations (with `in-view` class)
- Delay classes: `delay-100`, `delay-200`, `delay-300`, `delay-400`, `delay-500`

## Code Organization

### Project Structure
```
/
├── app/                    # Next.js App Router pages
│   ├── products/          # Products page
│   ├── team/              # Team page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── components/            # React components
├── lib/                   # Core utilities and config
│   ├── constants/         # Design tokens, navigation, social links
│   ├── data/              # Static data (team, products, notifications, timeline)
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
└── public/                # Static assets
```

### File Naming Conventions
- Components: PascalCase (e.g., `Navbar.tsx`, `PhoneNotification.tsx`)
- Utilities/Constants: camelCase (e.g., `theme.ts`, `navigation.ts`)
- Types: `index.ts` in `lib/types/`
- Use `.tsx` for React components, `.ts` for utilities

### Import Path Conventions
**RULE:** Always use absolute imports with `@/` prefix:
```typescript
// Correct
import { COLORS } from '@/lib/constants/theme'
import Navbar from '@/components/Navbar'
import type { NavbarProps } from '@/lib/types'

// Incorrect
import { COLORS } from '../../lib/constants/theme'
import Navbar from '../components/Navbar'
```

## Styling Rules

### Use Design Tokens
**RULE:** Always import and use design tokens from `lib/constants/theme.ts`:
```typescript
import { COLORS } from '@/lib/constants/theme'

// Correct
<div style={{ backgroundColor: COLORS.primary }}>

// Incorrect
<div style={{ backgroundColor: '#00827B' }}>
```

### Tailwind CSS Classes
- Prefer Tailwind utility classes for layout, spacing, and responsive design
- Use `className` for Tailwind classes
- Only use inline `style` for dynamic theme values (colors from COLORS constant)

**Example:**
```typescript
<div 
  className="rounded-full px-6 py-3 text-sm transition-all hover:opacity-90"
  style={{ backgroundColor: COLORS.primary, color: COLORS.white }}
>
  Button
</div>
```

### Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
- Use responsive Tailwind classes: `md:text-lg`, `lg:flex-row`, etc.

### Animations
- Custom animations defined in `app/globals.css`
- Use `animate-on-scroll` class for scroll-triggered animations
- ScrollAnimations component handles intersection observer logic

## TypeScript Rules

### Type Definitions
**RULE:** All type definitions go in `lib/types/index.ts`:
```typescript
// lib/types/index.ts
export interface NavbarProps {
  aboutUsTextColor?: string
}

export interface Product {
  name: string
  blurb: string
  tags: string[]
  status: string
  links: ProductLink[]
}
```

### Type Imports
**RULE:** Use `import type` for type-only imports:
```typescript
import type { NavbarProps } from '@/lib/types'
```

### Avoid `any` Types
**RULE:** Avoid `any` types. Use proper interfaces or `unknown` if necessary.

Exception: Next.js typed routes require `as any` for Link href in some cases:
```typescript
<Link href={link.href as any}>
```

### Interface Naming
- Props interfaces: `ComponentNameProps` (e.g., `NavbarProps`, `FooterProps`)
- Data interfaces: Descriptive names (e.g., `TeamMember`, `Product`, `SocialLink`)

## Component Guidelines

### Component Documentation
**RULE:** Add JSDoc comments to all components:
```typescript
/**
 * Navbar component with responsive navigation and mobile menu
 * @param aboutUsTextColor - Optional color for the "About Us" button text
 */
export default function Navbar({ aboutUsTextColor }: NavbarProps) {
  // ...
}
```

### Component Structure
1. Imports (React, Next.js, types, constants, components)
2. Type definitions (if not in lib/types)
3. JSDoc comment
4. Component function
5. Return JSX

### Client Components
**RULE:** Add `'use client'` directive at the top of files that use:
- React hooks (useState, useEffect, etc.)
- Browser APIs
- Event handlers

```typescript
'use client'

import { useState } from 'react'
// ...
```

### Props and Types
**RULE:** All component props must have TypeScript interfaces:
```typescript
import type { FooterProps } from '@/lib/types'

export default function Footer({ bgColor = COLORS.backgroundMint }: FooterProps) {
  // ...
}
```

## Data Management

### Static Data Location
**RULE:** Place data in appropriate locations:
- Configuration: `lib/constants/` (navigation, social links, theme)
- Static content: `lib/data/` (team members, products, mock data)

### Data Files
- Team members: `lib/data/team.ts` - exports `TEAM_MEMBERS` constant
- Products: `lib/data/products.ts` - exports `PRODUCTS` array
- Notifications: `lib/data/notifications.ts` - exports `NOTIFICATION_DATA` array
- Timeline: `lib/data/timeline.tsx` - exports `TIMELINE_ACTIVITIES` array
- Navigation: `lib/constants/navigation.ts` - exports `MAIN_NAV_LINKS`
- Social: `lib/constants/social.tsx` - exports `SOCIAL_LINKS` array

### Never Hardcode Repeated Data
**RULE:** If data is used in multiple places, extract it to a constant:
```typescript
// Incorrect - hardcoded in component
const teamMembers = [{ name: 'John', email: 'john@example.com' }]

// Correct - imported from data file
import { TEAM_MEMBERS } from '@/lib/data/team'
```

## Component-Specific Rules

### Layout Components
- **Container**: Max-width wrapper (max-w-7xl) with responsive padding
- **Section**: Vertical spacing wrapper (py-8 lg:py-12)
- Always wrap page content in `<Container>` and major sections in `<Section>`

### Navigation
- **Navbar**: Imports `MAIN_NAV_LINKS` from `lib/constants/navigation`
- Update navigation constants, not components directly

### Footer
- Accepts `bgColor` prop (defaults to `COLORS.backgroundMint`)
- Uses `<Socials>` component for social links
- Call with `<Footer bgColor={COLORS.white} />` for non-mint backgrounds

### Animated Components
- **PhoneNotification**: Cycles through `NOTIFICATION_DATA`
- **PilotTimeline**: Animates `TIMELINE_ACTIVITIES`
- **ScrollAnimations**: Handles intersection observer for scroll animations

## Best Practices

### Performance
- Use Next.js `<Image>` component for images (except for small icons/logos)
- Lazy load heavy components when possible
- Use `priority` prop for above-the-fold images

### Accessibility
- Add `aria-label` to icon-only buttons
- Use semantic HTML elements
- Include alt text for images
- Use proper heading hierarchy

### Code Style
- Use functional components (no class components)
- Prefer named exports for utilities, default exports for components
- Use const arrow functions for utilities
- Use function declarations for components
- Keep components focused and single-purpose

### Comments
- Add JSDoc comments for all exported functions/components
- Use inline comments for complex logic only
- Don't comment obvious code

## Common Patterns

### Button with Theme Colors
```typescript
<Link 
  href="/products" 
  className="inline-block rounded-full px-6 py-3 text-sm font-normal transition-all hover:opacity-90"
  style={{ backgroundColor: COLORS.primary, color: COLORS.white }}
>
  Button Text
</Link>
```

### Responsive Layout
```typescript
<div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
  <div className="flex-1">Content</div>
  <div className="flex-shrink-0">Sidebar</div>
</div>
```

### Animation Classes
```typescript
<h1 className="text-5xl font-light animate-fade-in-up">
  Title
</h1>
<p className="text-lg animate-fade-in-up delay-200">
  Subtitle
</p>
```

### Scroll Animations
```typescript
<div className="animate-on-scroll animate-slide-in-left-scroll">
  Content that animates on scroll
</div>
```

## Product Information

### Active Products
- **BountyPay**: Alpha - Payment system for open source contributors
- **Pilot**: Coming Soon - AI agent for automation

### Removed Products (no longer in codebase)
- Chain Trace (removed)
- Flash Loans (removed)
- Good First Issues (removed)

**RULE:** Only reference BountyPay and Pilot in documentation and code.

## When Adding New Features

1. **Colors**: Add to `lib/constants/theme.ts` COLORS object
2. **Types**: Add to `lib/types/index.ts`
3. **Data**: Add to appropriate file in `lib/data/`
4. **Components**: Create in `components/` with JSDoc
5. **Pages**: Create in `app/` following Next.js App Router conventions
6. **Navigation**: Update `lib/constants/navigation.ts`
7. **Documentation**: Update README.md if architecture changes

## Summary

- **Always** use design tokens from `COLORS` constant
- **Always** use absolute imports with `@/` prefix
- **Always** add TypeScript types from `lib/types/`
- **Always** add JSDoc comments to components
- **Never** hardcode colors, repeated data, or navigation items
- **Never** use relative imports for lib/ or components/
- **Follow** the established folder structure
- **Keep** code DRY and maintainable
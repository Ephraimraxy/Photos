# DOCUEDIT PHOTOS - Design Guidelines

## Design Approach

**Selected Approach:** Reference-Based Design inspired by premium digital marketplaces (Unsplash, Adobe Stock, Gumroad) combined with modern e-commerce best practices (Shopify, Stripe checkout flows).

**Justification:** As a premium digital content store, visual presentation and trust-building are paramount. The platform must showcase content quality while establishing credibility for Nigerian customers making digital purchases.

**Key Design Principles:**
1. **Gallery-First:** Content is the hero - let images and videos speak through generous sizing and minimal chrome
2. **Trust Through Polish:** Premium feel through refined typography, precise spacing, and professional color treatment
3. **Frictionless Commerce:** Clear pricing, obvious CTAs, streamlined checkout that builds confidence

---

## Core Design Elements

### A. Color Palette

**Dark Mode Primary (Default):**
- Background Base: `222 25% 8%` (deep charcoal)
- Surface Elevated: `222 20% 12%` (lighter panels)
- Text Primary: `0 0% 95%` (near white)
- Text Secondary: `0 0% 70%` (muted gray)

**Brand Colors:**
- Primary Brand: `280 65% 55%` (sophisticated purple - premium digital feel)
- Primary Hover: `280 70% 48%` (deeper on interaction)
- Accent Success: `142 70% 45%` (purchase confirmations, secure badges)

**Light Mode:**
- Background: `0 0% 98%` (soft white)
- Surface: `0 0% 100%` (pure white cards)
- Text Primary: `222 25% 15%` (deep gray-blue)
- Primary Brand Light: `280 60% 50%` (adjusted for light backgrounds)

**Functional Colors:**
- Cart Badge: `280 65% 55%` (matches brand)
- Watermark Overlay: `0 0% 0%` at 40% opacity
- Price Tags: `280 65% 55%` background with white text
- Warning/Clear: `0 70% 55%` (cart clearing actions)

### B. Typography

**Font Families:**
- Primary: 'Inter' (Google Fonts) - clean, modern, excellent readability
- Display/Headings: 'Space Grotesk' (Google Fonts) - distinctive premium feel for brand name and section headers

**Type Scale:**
- Hero Brand: text-5xl md:text-7xl font-bold (Space Grotesk)
- Section Headers: text-3xl md:text-4xl font-semibold
- Card Titles: text-lg font-medium
- Body Text: text-base leading-relaxed
- UI Labels: text-sm font-medium
- Price Tags: text-xl font-bold
- Micro Copy: text-xs

### C. Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24 for consistency.

**Grid System:**
- Images Section: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` (masonry-inspired with gap-4)
- Videos Section: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` (larger thumbnails, gap-6)
- Admin Dashboard: `grid-cols-1 lg:grid-cols-3` (upload area spans 2 columns)

**Container Widths:**
- Main Content: `max-w-7xl mx-auto px-6`
- Gallery Grids: Full width within container
- Cart Sidebar: `w-96` (fixed width sliding panel)

**Vertical Rhythm:**
- Section Padding: `py-12 lg:py-20`
- Card Padding: `p-6`
- Component Spacing: `space-y-8` for major sections, `space-y-4` for related elements

### D. Component Library

**Navigation:**
- Fixed header with blurred backdrop: `backdrop-blur-xl bg-background/80`
- Brand logo (left): "DOCUEDIT PHOTOS" in Space Grotesk, text-2xl
- Tab navigation (center): Images | Videos with active underline (border-b-2 in brand color)
- Cart icon (right) with item count badge, user menu dropdown

**Content Cards - Images:**
- Aspect ratio: `aspect-[4/3]` for consistency
- Hover state: Scale 102%, subtle shadow lift
- Watermark: Centered "DOCUEDIT PHOTOS" in semi-transparent white over dark overlay
- Quick-add button: Absolute positioned, bottom-right corner, icon-only on hover reveal
- Price tag: Top-right corner, `₦200` in small badge

**Content Cards - Videos:**
- Aspect ratio: `aspect-video`
- Play icon overlay: Centered, large, disappears on hover to show watermarked preview frame
- Duration badge: Bottom-left corner
- Same pricing and add-to-cart treatment as images

**Cart Interface:**
- Slide-out panel from right: `fixed right-0 w-96 h-full`
- Header: Item count + total price prominently displayed
- Cart items: Thumbnail (80x80) + title + remove button
- Clear cart: Text link in muted color, requires confirmation modal
- Checkout button: Full-width, large, `₦200 × [count] items` label
- Empty state: Centered icon + "Your cart is empty" message

**Admin Dashboard:**
- Upload zone: Large dashed border drag-drop area with icon and instructions
- Google Drive input: Text field with "Add from Drive" button
- Content management: Table view with thumbnails, title, type, actions (delete)
- Bulk actions: "Clear All Carts" prominent warning button with confirmation

**Security Overlays:**
- Watermark text: 45-degree diagonal, white at 30% opacity, font-bold, text-4xl
- Right-click prevention: Invisible overlay div capturing pointer events
- Screenshot detection: Toast notification (if triggered) with warning message

**Checkout Flow:**
- Summary card: List of purchased items with thumbnails
- Paystack integration: Branded button "Pay with Paystack" in their green `#00C3A0`
- Success page: Download buttons for each item, expiration timer, email confirmation

**Modals & Overlays:**
- Backdrop: `bg-black/60 backdrop-blur-sm`
- Modal card: Centered, `max-w-lg`, rounded-xl, shadow-2xl
- Confirmation modals: Clear heading, explanation text, dual actions (Cancel + Confirm)

### E. Interactions

**Minimal Animations:**
- Card hover: `transition-transform duration-200 ease-out`
- Cart slide-in: `transition-all duration-300 ease-in-out`
- Button press: Subtle scale-95 on active state
- Loading states: Skeleton placeholders with shimmer effect (not spinners)

**No Auto-Playing Elements:** Videos require explicit user action to preview

---

## Page-Specific Layouts

**Homepage/Browse:**
- **Hero Section (optional):** Brief brand statement + browse CTA, height: 60vh, centered content, NO large hero image (content is the hero)
- **Tab Navigation:** Sticky below header, switches between Images/Videos
- **Gallery Grid:** Primary focus, fills viewport, infinite scroll or pagination
- **Trust Indicators:** Footer includes payment security badges, "100% Secure" messaging

**Admin Panel:**
- **Two-column layout:** Upload/management (left 2/3) + quick stats sidebar (right 1/3)
- **Recent uploads:** Chronological list with quick actions
- **Analytics cards:** Total items, sales count, revenue (if tracking)

**Post-Purchase:**
- **Centered card layout:** List of purchased items with individual download buttons
- **Countdown timer:** Time-limited access clearly displayed
- **Support CTA:** Help/contact link prominently placed

---

## Images Section

**Where Images Are Used:**
1. **Content Preview Thumbnails:** User-uploaded images and videos (watermarked)
2. **NO large hero image** - the gallery grid itself is the visual hero
3. **Trust badges:** Small icons for payment security, SSL, etc. (use icon library, not images)
4. **Empty states:** Simple illustrations for empty cart, no uploads yet (use Heroicons or similar)

**Image Treatment:**
- All preview images rendered at consistent aspect ratios with object-cover
- Watermark overlay applied via CSS pseudo-element or canvas rendering
- Lazy loading for performance with blur-up placeholders

---

## Brand Identity

**Voice:** Professional yet approachable, emphasizing quality and security
**Watermark Treatment:** Consistent across all previews - never obtrusive but clearly visible
**Nigerian Context:** Naira symbol `₦` used consistently, Paystack integration prominently featured as trusted local payment method
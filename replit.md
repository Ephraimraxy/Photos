# DOCUEDIT PHOTOS - Premium Digital Content Store

## Overview

DOCUEDIT PHOTOS is a premium digital content marketplace for purchasing and downloading high-quality images and videos. The platform serves Nigerian customers with a fixed price of ₦200 per item. Content is watermarked for preview, protected against unauthorized downloads, and delivered securely after payment through Paystack integration.

The application enables administrators to import content from Google Drive and manage their digital catalog, while customers can browse, add items to cart, complete purchases, and access their purchased content through time-limited download tokens.

## Recent Changes

### October 30, 2025 - Netlify Deployment Fixes

**Secrets Scanner Configuration:**
- Added `SECRETS_SCAN_OMIT_PATHS` to exclude documentation files and build output from scanning
- Added `SECRETS_SCAN_OMIT_KEYS` to ignore non-sensitive environment variables (NODE_ENV, PORT)
- Prevents deployment failures caused by environment values in markdown documentation

**File Upload Serverless Compatibility:**
- Replaced multer with busboy for Netlify Functions compatibility
- Implemented custom multipart form parser for base64-encoded Lambda requests
- Added middleware to properly expose parsed file data to Express via `req.apiGateway.event`
- File uploads now work correctly in Netlify's serverless environment

**Technical Implementation:**
- Created `parseMultipartForm()` helper function using busboy
- Modified Netlify Function handler to intercept and pre-process file uploads
- Added detailed logging with `[Upload]` prefix for debugging
- Ensured compatibility with both Replit development and Netlify production environments

**Documentation:**
- Created comprehensive deployment guide (`NETLIFY_DEPLOYMENT_FIX.md`)
- Documented all required environment variables
- Added troubleshooting section for common deployment issues

### October 15, 2025 - Enhanced User Experience & Admin Features

**Payment Success Flow Enhancement:**
- Added success dialog after payment completion with tracking link, amount paid, and item count
- Users can copy tracking link to clipboard before proceeding to downloads
- Dialog shows payment summary with all purchase details
- One-click copy functionality for easy link sharing
- Cart automatically cleared after successful payment and download initiation

**Admin Dashboard Improvements:**
- Added Payment History tab with comprehensive transaction management
- View all purchases with status, date, amount, and item count
- Each purchase shows full tracking link with copy and open-in-new-tab options
- Payment records sorted by date (newest first) for easy reference
- Supports compliance and customer service workflows

**Cart Enhancement:**
- Cart already supports selecting both images and videos together
- No restrictions on mixing content types in a single purchase
- All items display with their respective type badges (image/video)

### October 15, 2025 - Security Fixes for Google Drive Integration

**Critical Security Enhancement:**
- Fixed preview endpoint to apply watermarks server-side before serving images from Google Drive
- Previously, the preview endpoint exposed original full-resolution images without protection
- Now all images are fetched from Google Drive, watermarked using Sharp, and served as JPEG with reduced quality (70%)
- Video previews continue to use Google's thumbnails instead of exposing actual video files

**Payment System Improvements:**
- Added Paystack credentials validation to prevent API calls with undefined bearer tokens
- Payment initialization and verification now fail fast with descriptive errors if PAYSTACK_SECRET_KEY is missing
- Eliminates 401 errors from attempting Paystack requests with empty authorization headers

**Security Status:**
- ✅ Preview endpoint properly watermarks all images
- ✅ Original Google Drive files only accessible after purchase via download tokens
- ✅ No direct Google Drive URLs exposed in preview responses
- ✅ Payment system validates credentials before external API calls

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **React** with TypeScript for type safety
- **Vite** as the build tool and development server
- **Wouter** for client-side routing (lightweight alternative to React Router)
- **TanStack Query** for server state management and data fetching
- **Tailwind CSS** with shadcn/ui components for styling

**Design System:**
- Uses shadcn/ui component library with "New York" style variant
- Custom theme system supporting dark mode (default) and light mode
- Brand colors: Purple primary (`280 65% 55%`) for premium feel
- Typography: Inter for body text, Space Grotesk for headings
- Responsive design with mobile-first approach

**Security Features:**
- Watermark overlay component on all preview images/videos
- Right-click prevention and drag-start blocking
- Screenshot detection attempts (keyboard shortcuts, visibility changes)
- Security overlay to prevent unauthorized content access

**State Management:**
- Server state managed through TanStack Query with infinite stale time
- Local state for cart stored in localStorage
- Session-based checkout flow with temporary session IDs

### Backend Architecture

**Technology Stack:**
- **Node.js** with Express.js server
- **TypeScript** for type safety across the stack
- **Drizzle ORM** for database operations (PostgreSQL dialect configured)
- **Sharp** for image watermarking and processing

**API Design:**
- RESTful endpoints under `/api` prefix
- Content management: GET `/api/content`, POST `/api/content/google-drive`, DELETE `/api/content/:id`
- Preview generation: GET `/api/content/:id/preview` (returns watermarked version)
- Purchase flow: POST `/api/purchase/initiate`, POST `/api/purchase/verify`
- Download tokens: GET `/api/purchase/:id` (returns download tokens)

**Storage Strategy:**
- In-memory storage implementation (`MemStorage`) for development
- Database schema ready for PostgreSQL with Drizzle ORM
- Google Drive used as content source (metadata imported, not downloaded)
- Content served directly from Google Drive with watermarking layer

**Content Protection:**
- Watermarks added server-side using Sharp for images
- Video thumbnails with watermarks instead of exposing actual video files
- Time-limited download tokens (expire after set period)
- One-time use token validation

### Data Model

**Core Entities:**

1. **Content** - Digital assets (images/videos)
   - Links to Google Drive file ID and URL
   - Stores metadata: title, type, mimeType, fileSize, duration
   - No actual file storage, references external Google Drive

2. **Purchases** - Transaction records
   - Session-based cart identification
   - Paystack reference for payment verification
   - Array of content IDs purchased in single transaction
   - Status tracking: pending, completed, failed

3. **Download Tokens** - Secure download access
   - One-time use tokens linked to purchase and specific content
   - Expiration timestamp for time-limited access
   - Used/unused flag to prevent reuse

**Data Flow:**
- Content previews served with watermarks in real-time
- Purchase creates tokens for each item
- Download endpoint validates token, marks as used, redirects to Google Drive

## External Dependencies

### Third-Party Services

**Paystack Payment Integration:**
- Payment gateway for Nigerian market (₦200 per item pricing)
- Client-side SDK loaded via script tag
- Transaction reference verification on server
- Webhook support for payment status updates

**Google Drive API:**
- OAuth2 authentication through Replit Connectors
- Read-only access to import content metadata
- Direct file serving for purchased content downloads
- Uses `googleapis` Node.js client library

**Replit Platform Services:**
- Connector system for Google Drive authentication
- Environment-based token management (REPL_IDENTITY, WEB_REPL_RENEWAL)
- Development tooling plugins (cartographer, dev-banner, runtime-error-modal)

### Database

**PostgreSQL with Neon:**
- Configured via `@neondatabase/serverless` driver
- Connection through DATABASE_URL environment variable
- Session-based connection pooling with `connect-pg-simple`
- Drizzle ORM for schema management and migrations

### UI Component Libraries

**Radix UI Primitives:**
- Comprehensive set of unstyled, accessible components
- Dialog, Popover, Dropdown, Tabs, Toast, and 20+ other primitives
- Consistent keyboard navigation and ARIA compliance

**Supporting Libraries:**
- `react-hook-form` with `@hookform/resolvers` for form validation
- `zod` for schema validation
- `class-variance-authority` and `clsx` for conditional styling
- `date-fns` for date formatting
- `axios` for HTTP requests

### Media Processing

**Sharp:**
- Server-side image manipulation
- Watermark overlay generation using SVG composition
- Image quality optimization (70% JPEG quality for previews)
- Responsive to original image dimensions for proper scaling
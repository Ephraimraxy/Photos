# Payment Flow Documentation

This document explains how the payment system works, including how payments are processed, verified, and how users access their purchased content.

## Overview

The system uses **Paystack** for payment processing and manages purchase status through a database with the following states:
- **pending**: Payment initialized but not yet verified
- **completed**: Payment verified and download tokens generated
- **failed**: Payment failed or was cancelled

## Payment Flow Steps

### 1. User Adds Items to Cart
- User browses content and adds items to their cart
- Cart is stored in `localStorage` on the client
- A tracking code is generated and stored: `CART{randomCode}`

### 2. User Proceeds to Checkout
- User navigates to `/checkout` page
- Cart items are loaded from `localStorage`
- User enters their full name (required)
- Optional: User applies a coupon code

### 3. Payment Initialization (`POST /api/payment/initialize`)

**Request:**
```json
{
  "contentIds": ["uuid1", "uuid2", ...],
  "trackingCode": "CARTABC123",
  "userName": "John Doe",
  "couponCode": "DISCOUNT50" // optional
}
```

**Process:**
1. Validates Paystack credentials are configured
2. Calculates total amount (₦200 per item, or adjusted for coupons)
3. Applies coupon discount if provided:
   - Counts images and videos in cart
   - Calculates excess items beyond coupon limits
   - Only charges for excess items
4. Generates unique Paystack reference: `DOCUEDIT-{uuid}`
5. Creates purchase record in database with status `pending`:
   ```sql
   INSERT INTO purchases (
     id, tracking_code, user_name, unique_id,
     content_ids, total_amount, status, paystack_reference, coupon_id
   )
   ```
6. Initializes Paystack payment:
   - Amount converted to kobo (multiply by 100)
   - Callback URL set to `/checkout` (Paystack redirects here after payment)
   - Metadata includes contentIds and trackingCode
7. Returns authorization URL to client

**Response:**
```json
{
  "authorization_url": "https://checkout.paystack.com/...",
  "reference": "DOCUEDIT-abc123",
  "purchaseId": "purchase-uuid"
}
```

### 4. User Completes Payment on Paystack
- Client redirects to `authorization_url`
- User completes payment on Paystack's secure checkout page
- Paystack redirects back to `/checkout?reference={reference}`

### 5. Payment Verification (`POST /api/payment/verify`)

**Triggered:** When user returns from Paystack with `?reference=...` in URL

**Request:**
```json
{
  "reference": "DOCUEDIT-abc123"
}
```

**Process:**
1. Verifies payment with Paystack API:
   ```
   GET https://api.paystack.co/transaction/verify/{reference}
   ```
2. Checks if payment status is `success`
3. Finds purchase record by `paystackReference`
4. If purchase status is `pending`:
   - Updates purchase status to `completed`
   - Generates download tokens for each content item:
     - Token: UUID
     - Expires: 24 hours from now
     - Used: false
     - One token per content item
5. Returns purchase ID and tracking code

**Response:**
```json
{
  "purchaseId": "purchase-uuid",
  "trackingCode": "CARTABC123"
}
```

### 6. User Redirected to Download Page
- Client redirects to `/purchase/{purchaseId}`
- Purchase page fetches purchase details

### 7. Get Purchase Details (`GET /api/purchase/:id`)

**Process:**
1. Fetches purchase from database
2. Verifies purchase status is `completed` (404 if not)
3. Gets all download tokens for this purchase
4. Fetches content details for each item
5. Returns purchase data with download tokens

**Response:**
```json
{
  "purchaseId": "purchase-uuid",
  "trackingCode": "CARTABC123",
  "items": [
    {
      "id": "content-uuid",
      "title": "Image Title",
      "type": "image",
      "downloadToken": "token-uuid"
    }
  ],
  "expiresAt": "2024-01-02T12:00:00Z"
}
```

### 8. User Downloads Content (`GET /api/download/:token`)

**Process:**
1. Validates token exists and is not used
2. Checks token hasn't expired (24 hour limit)
3. Marks token as `used = true` (one-time use)
4. Fetches content from database
5. Serves file:
   - **Supabase**: Fetches file using service role key and streams to user
   - **Google Drive**: Redirects to download URL
6. Sets appropriate headers:
   - `Content-Type`: MIME type
   - `Content-Disposition`: `attachment; filename="..."`

## Database Schema

### Purchases Table
```sql
CREATE TABLE purchases (
  id VARCHAR PRIMARY KEY,
  tracking_code VARCHAR NOT NULL,
  user_name VARCHAR NOT NULL,
  unique_id VARCHAR NOT NULL,
  content_ids TEXT[] NOT NULL, -- Array of content UUIDs
  total_amount INTEGER NOT NULL, -- Amount in kobo
  status VARCHAR NOT NULL, -- 'pending', 'completed', 'failed'
  paystack_reference VARCHAR UNIQUE,
  coupon_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Download Tokens Table
```sql
CREATE TABLE download_tokens (
  id VARCHAR PRIMARY KEY,
  purchase_id VARCHAR NOT NULL,
  content_id VARCHAR NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Status Management

### Pending Status
- Purchase created when payment is initialized
- User hasn't completed payment yet
- No download tokens generated
- Purchase page shows "Processing" message with manual completion option

### Completed Status
- Payment verified successfully
- Download tokens generated (24 hour expiry)
- User can download all purchased items
- Purchase page shows download links

### Failed Status
- Payment failed or was cancelled
- No download tokens generated
- User must retry payment

## Manual Purchase Completion

If payment verification fails or is delayed, users can manually complete their purchase:

**Endpoint:** `POST /api/purchase/:id/complete`

**Process:**
1. Finds purchase by ID
2. If status is `pending`:
   - Updates to `completed`
   - Generates download tokens
   - Returns success
3. If already `completed`, returns message

## Security Features

1. **One-Time Download Tokens**: Each token can only be used once
2. **Token Expiry**: Tokens expire after 24 hours
3. **Token Validation**: Tokens are verified against database before serving files
4. **Service Role Key**: Supabase files are fetched using service role key (not exposed to client)
5. **Purchase Verification**: Only completed purchases can access downloads

## Error Handling

### Payment Initialization Errors
- Missing Paystack credentials → 500 error
- Invalid content IDs → 400 error
- Missing tracking code or user name → 400 error

### Payment Verification Errors
- Invalid reference → 400 error
- Payment not successful → 400 error
- Purchase not found → 404 error

### Download Errors
- Invalid token → 404 error
- Expired token → 410 error
- Token already used → 404 error
- Content not found → 404 error

## Environment Variables Required

```bash
PAYSTACK_SECRET_KEY=sk_live_... # or sk_test_... for testing
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://...
```

## Testing the Flow

1. **Test Payment Initialization:**
   ```bash
   curl -X POST https://your-site.netlify.app/api/payment/initialize \
     -H "Content-Type: application/json" \
     -d '{
       "contentIds": ["content-id"],
       "trackingCode": "CART123",
       "userName": "Test User"
     }'
   ```

2. **Test Payment Verification:**
   ```bash
   curl -X POST https://your-site.netlify.app/api/payment/verify \
     -H "Content-Type: application/json" \
     -d '{"reference": "DOCUEDIT-abc123"}'
   ```

3. **Test Download:**
   ```bash
   curl https://your-site.netlify.app/api/download/{token} \
     -o downloaded-file.jpg
   ```

## Troubleshooting

### Payment Initialization Fails
- Check `PAYSTACK_SECRET_KEY` is set in Netlify environment variables
- Verify Paystack account is active
- Check network connectivity to Paystack API

### Payment Verification Fails
- Ensure callback URL is correctly configured
- Check Paystack webhook settings (if using webhooks)
- Verify reference matches between initialization and verification

### Downloads Not Working
- Check Supabase credentials are set
- Verify bucket is accessible with service role key
- Check token hasn't expired
- Verify purchase status is `completed`

### Images Not Displaying
- Ensure Supabase bucket is public OR
- Preview endpoint uses service role key to fetch files
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set


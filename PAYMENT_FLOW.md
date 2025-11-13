# Payment Flow Documentation

This document explains how the payment system manages and processes payments, and how it handles different payment statuses to control user access to downloads.

## Overview

The payment system uses **Paystack** as the payment gateway and follows this flow:
1. **Payment Initialization** - Creates a purchase record and initializes Paystack payment
2. **Payment Processing** - User completes payment on Paystack
3. **Payment Verification** - System verifies payment and updates purchase status
4. **Download Access** - Users can download purchased content using secure tokens

## Payment Status Flow

### Status States

The system uses three main status states for purchases:

1. **`pending`** - Payment has been initialized but not yet completed
2. **`completed`** - Payment has been successfully verified and download tokens generated
3. **`failed`** - Payment verification failed or payment was not completed

### Database Schema

```sql
purchases (
  id: UUID (primary key)
  trackingCode: TEXT (unique) - Customer tracking code
  paystackReference: TEXT (unique) - Paystack transaction reference
  contentIds: TEXT[] - Array of purchased content IDs
  totalAmount: INTEGER - Total amount in kobo (Nigerian currency)
  status: VARCHAR(20) - 'pending', 'completed', or 'failed'
  userName: TEXT - Customer's full name
  uniqueId: TEXT (unique) - Generated unique ID based on name
  couponCode: TEXT (optional) - Applied coupon code
  createdAt: TIMESTAMP
)
```

## Payment Flow Steps

### Step 1: Payment Initialization (`POST /api/payment/initialize`)

**When:** User clicks "Proceed to Payment" on checkout page

**What happens:**
1. Validates Paystack credentials are configured
2. Validates required fields (contentIds, trackingCode, userName)
3. Calculates total amount (₦200 per item, with coupon discounts applied)
4. Creates a purchase record with `status: 'pending'`
5. Generates a unique Paystack reference (`DOCUEDIT-{UUID}`)
6. Calls Paystack API to initialize payment
7. Returns authorization URL to redirect user to Paystack

**Response:**
```json
{
  "authorizationUrl": "https://checkout.paystack.com/...",
  "reference": "DOCUEDIT-xxx",
  "purchaseId": "uuid"
}
```

**Purchase Status:** `pending`

---

### Step 2: User Completes Payment on Paystack

**When:** User is redirected to Paystack and completes payment

**What happens:**
- User enters payment details on Paystack
- Paystack processes the payment
- User is redirected back to `/checkout?reference={reference}`

---

### Step 3: Payment Verification (`POST /api/payment/verify`)

**When:** User returns from Paystack with a reference parameter

**What happens:**
1. Extracts `reference` from request body
2. Calls Paystack API to verify the transaction
3. Checks if payment status is `"success"`
4. Finds the purchase record by `paystackReference`
5. **If purchase status is `pending`:**
   - Updates purchase status to `completed`
   - Generates download tokens for each purchased item (24-hour expiry)
   - Stores tokens in `downloadTokens` table
6. **If purchase status is already `completed`:**
   - Skips token generation (prevents duplicate tokens)

**Response:**
```json
{
  "purchaseId": "uuid",
  "trackingCode": "CART12345"
}
```

**Purchase Status:** `completed` (if payment successful)

---

### Step 4: Download Access (`GET /api/purchase/:id`)

**When:** User navigates to `/purchase/:id` page

**What happens:**
1. Fetches purchase record by ID
2. **Checks if `status === 'completed'`:**
   - If yes: Returns purchase details with download tokens
   - If no: Returns 404 (purchase not found or not completed)
3. Returns list of purchased items with their download tokens

**Response (if completed):**
```json
{
  "purchaseId": "uuid",
  "items": [
    {
      "id": "content-id",
      "title": "Image Title",
      "type": "image",
      "downloadToken": "token-uuid"
    }
  ],
  "expiresAt": "2024-01-02T12:00:00Z"
}
```

**Response (if pending/failed):**
```json
{
  "error": "Purchase not found"
}
```

---

### Step 5: Download Content (`GET /api/download/:token`)

**When:** User clicks download button on purchase page

**What happens:**
1. Finds download token in database
2. Checks if token is expired
3. Checks if token has been used
4. Marks token as used
5. Fetches content from Supabase Storage or Google Drive
6. Serves the file to the user

**Security:**
- Tokens expire after 24 hours
- Tokens can only be used once
- Only completed purchases have valid tokens

---

## Status Management

### How Status Controls Access

1. **`pending` Status:**
   - Purchase exists but payment not verified
   - No download tokens generated
   - User cannot access downloads
   - Purchase page shows "Purchase Processing" message
   - User can manually trigger verification via "Complete Purchase Manually" button

2. **`completed` Status:**
   - Payment verified successfully
   - Download tokens generated (24-hour expiry)
   - User can access all purchased content
   - Purchase page shows download links

3. **`failed` Status:**
   - Payment verification failed
   - No download tokens generated
   - User cannot access downloads
   - User must retry payment

### Manual Completion

If automatic verification fails, users can manually complete the purchase:
- Endpoint: `POST /api/purchase/:id/complete`
- This re-runs the verification process
- Useful if Paystack webhook fails or callback is missed

---

## Coupon System

### How Coupons Work

1. **Coupon Application:**
   - User enters coupon code on browse page
   - System validates coupon and stores it in `activeCoupon` state
   - Coupon is passed to payment initialization

2. **Price Calculation:**
   - Base price: ₦200 per item
   - Coupon provides free images/videos (e.g., 5 images + 2 videos free)
   - Only excess items beyond coupon limits are charged
   - Example: 7 images + 3 videos with coupon (5 images + 2 videos free)
     - Excess: 2 images + 1 video = 3 items
     - Total: ₦600 (3 × ₦200)

3. **Coupon Status:**
   - Coupon is marked as `used` after successful payment
   - `usedBy` field stores the user's name
   - `usedAt` field stores the timestamp

---

## Error Handling

### Common Errors

1. **Payment Initialization Failed:**
   - **Cause:** Missing Paystack credentials, invalid data
   - **User sees:** "Payment Configuration Error" toast
   - **Action:** Check `PAYSTACK_SECRET_KEY` environment variable

2. **Payment Verification Failed:**
   - **Cause:** Payment not successful, invalid reference
   - **User sees:** "Payment Verification Failed" toast
   - **Purchase status:** Remains `pending`
   - **Action:** User can retry or manually complete

3. **Purchase Not Found:**
   - **Cause:** Purchase ID invalid or purchase not completed
   - **User sees:** "Purchase Processing" message with manual completion option
   - **Action:** User can manually trigger verification

4. **Download Token Expired:**
   - **Cause:** Token older than 24 hours
   - **User sees:** "Download token has expired" error
   - **Action:** Contact support for new download link

---

## Environment Variables Required

```bash
# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_xxx  # Your Paystack secret key

# Netlify Configuration (optional, for callback URL)
NETLIFY_URL=https://photosbuy.netlify.app
```

---

## Security Considerations

1. **Download Tokens:**
   - Single-use tokens (marked as `used` after download)
   - 24-hour expiry
   - Only generated for `completed` purchases

2. **Payment Verification:**
   - Always verified with Paystack API (never trust client-side data)
   - Purchase status only updated after successful Paystack verification

3. **Access Control:**
   - Only `completed` purchases can access downloads
   - Purchase records are not publicly accessible (require purchase ID)

---

## Testing Payment Flow

### Test Mode

Use Paystack test keys for development:
- Test Secret Key: `sk_test_xxx`
- Test Public Key: `pk_test_xxx`

### Test Cards

Paystack provides test cards for testing:
- Success: `4084084084084081`
- Decline: `5060666666666666666`

---

## Troubleshooting

### Payment Initialization Returns 500

**Check:**
1. `PAYSTACK_SECRET_KEY` is set in Netlify environment variables
2. Paystack API is accessible
3. Request body contains all required fields

### Payment Verification Fails

**Check:**
1. Paystack reference is valid
2. Payment was actually completed on Paystack
3. Purchase record exists in database
4. Paystack API response shows `status: "success"`

### Downloads Not Available

**Check:**
1. Purchase status is `completed` (not `pending`)
2. Download tokens were generated
3. Tokens are not expired
4. Tokens have not been used already

---

## API Endpoints Summary

| Endpoint | Method | Purpose | Status Check |
|----------|--------|---------|--------------|
| `/api/payment/initialize` | POST | Initialize payment | Creates `pending` purchase |
| `/api/payment/verify` | POST | Verify payment | Updates to `completed` |
| `/api/purchase/:id` | GET | Get purchase details | Only returns if `completed` |
| `/api/purchase/:id/complete` | POST | Manually complete purchase | Updates to `completed` |
| `/api/download/:token` | GET | Download content | Checks token validity |

---

## Future Improvements

1. **Webhook Support:** Implement Paystack webhooks for automatic verification
2. **Retry Logic:** Automatic retry for failed verifications
3. **Email Notifications:** Send download links via email
4. **Extended Expiry:** Allow admin to extend download token expiry
5. **Refund Handling:** Handle refunds and revoke download access


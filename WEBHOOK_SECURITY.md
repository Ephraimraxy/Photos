# Payment Webhook Security Configuration

## 🔒 Enhanced Security Features Implemented

### 1. **HMAC Signature Verification**
- ✅ **SHA-512 HMAC** signature verification using Paystack secret key
- ✅ **Constant-time comparison** to prevent timing attacks
- ✅ **Raw body verification** to ensure integrity

### 2. **Multi-Layer Authentication**
- ✅ **Paystack User-Agent** verification
- ✅ **Content-Type validation** (application/json only)
- ✅ **HTTP Method restriction** (POST only)
- ✅ **IP logging** for audit trail

### 3. **Event Processing Security**
- ✅ **Event type validation** (only process charge.success)
- ✅ **Reference validation** (ensure reference exists)
- ✅ **Idempotency protection** (prevent duplicate processing)
- ✅ **Atomic database operations**

## 🛡️ Security Checklist

### Environment Variables Required
```bash
# Add to your .env file
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here
```

### Paystack Dashboard Configuration

1. **Webhook URL Setup:**
   ```
   https://yourdomain.com/api/payment/webhook
   ```

2. **Events to Subscribe:**
   - ✅ `charge.success` - Process successful payments
   - ❌ `charge.failed` - Optional (for logging)
   - ❌ `subscription.*` - Not needed for one-time payments

3. **Security Settings:**
   - ✅ **HTTPS Only** - Ensure your webhook URL uses HTTPS
   - ✅ **Secret Key** - Use your Paystack secret key for signature verification
   - ✅ **Test Mode** - Use test keys during development

## 🔧 Webhook Endpoint Details

### Endpoint: `POST /api/payment/webhook`

**Security Headers Required:**
- `X-Paystack-Signature` - HMAC signature for verification
- `User-Agent` - Must contain "Paystack"
- `Content-Type` - Must be "application/json"

**Request Body Example:**
```json
{
  "event": "charge.success",
  "data": {
    "reference": "DOCUEDIT-12345",
    "amount": 20000,
    "status": "success"
  }
}
```

**Response:**
- `200` - Successfully processed
- `400` - Invalid signature or malformed request
- `500` - Server error

## 🚨 Security Best Practices

### 1. **Production Deployment**
- ✅ Use HTTPS for webhook URL
- ✅ Keep secret keys secure (never commit to version control)
- ✅ Monitor webhook logs for suspicious activity
- ✅ Implement rate limiting (consider using Redis)

### 2. **Testing Webhooks**
- ✅ Use Paystack's webhook testing tools
- ✅ Test with invalid signatures to ensure rejection
- ✅ Verify idempotency (same webhook multiple times)
- ✅ Test with malformed JSON

### 3. **Monitoring & Logging**
- ✅ Log all webhook attempts (successful and failed)
- ✅ Monitor for unusual IP addresses
- ✅ Set up alerts for webhook failures
- ✅ Regular security audits

## 🔍 Webhook Security Verification

### Test Commands

1. **Valid Webhook Test:**
```bash
curl -X POST https://yourdomain.com/api/payment/webhook \
  -H "Content-Type: application/json" \
  -H "X-Paystack-Signature: valid_signature" \
  -H "User-Agent: Paystack" \
  -d '{"event":"charge.success","data":{"reference":"test123"}}'
```

2. **Invalid Signature Test:**
```bash
curl -X POST https://yourdomain.com/api/payment/webhook \
  -H "Content-Type: application/json" \
  -H "X-Paystack-Signature: invalid_signature" \
  -d '{"event":"charge.success"}'
```
Expected: `400 Bad Request`

## 📊 Security Audit Logs

The webhook implementation logs:
- ✅ **IP addresses** of webhook requests
- ✅ **Signature validation** results
- ✅ **Event processing** status
- ✅ **Purchase completion** details
- ✅ **Error conditions** and security violations

## 🚀 Next Steps

1. **Set up Paystack credentials** in your `.env` file
2. **Configure webhook URL** in Paystack dashboard
3. **Test webhook security** with invalid requests
4. **Monitor logs** for security events
5. **Deploy to production** with HTTPS

## ⚠️ Important Notes

- **Never expose secret keys** in client-side code
- **Always use HTTPS** for webhook URLs in production
- **Monitor webhook logs** regularly for security issues
- **Test thoroughly** before going live
- **Keep webhook endpoints private** (no public documentation of exact implementation)

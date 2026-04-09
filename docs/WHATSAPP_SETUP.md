# WhatsApp Cloud API Setup Guide

This guide walks you through connecting Mawazo to a real WhatsApp number using the Meta WhatsApp Cloud API.

---

## Prerequisites

- A Meta Developer account (free): https://developers.facebook.com
- A business phone number that can receive SMS or calls (for OTP verification)
- The Mawazo webhook server running locally or deployed
- ngrok (for local testing): https://ngrok.com

---

## Step 1: Create a Meta Developer App

1. Go to https://developers.facebook.com/apps and click **Create App**
2. Choose **Business** as the app type
3. Fill in the app name (e.g. "Mawazo") and contact email
4. Under **Add Products**, find **WhatsApp** and click **Set Up**

---

## Step 2: Get Your Credentials

In your app dashboard → **WhatsApp → API Setup**:

| Value | Where to find it | .env variable |
|-------|-----------------|---------------|
| Access Token | "Temporary access token" (valid 24h; get permanent via System User) | `WHATSAPP_ACCESS_TOKEN` |
| Phone Number ID | Listed under "From" phone number | `WHATSAPP_PHONE_NUMBER_ID` |
| App Secret | App Dashboard → Settings → Basic → App Secret | `WHATSAPP_APP_SECRET` |

Copy these into your `.env` file.

---

## Step 3: Configure the Webhook

### For local development with ngrok:

```bash
# Start the webhook server
npm run dev

# In another terminal, start ngrok
ngrok http 3000
```

ngrok will show a URL like: `https://abc123.ngrok.io`

### Register the webhook with Meta:

1. In Meta App Dashboard → **WhatsApp → Configuration → Webhook**
2. Click **Edit**
3. Set **Callback URL**: `https://abc123.ngrok.io/webhook`
4. Set **Verify Token**: the value you put in `WHATSAPP_VERIFY_TOKEN` in your `.env`
5. Click **Verify and Save**

If the verification succeeds, you'll see a green checkmark. This means Meta called `GET /webhook?hub.mode=subscribe&hub.verify_token=...` and your server responded with the challenge.

### Subscribe to message events:

Under **Webhook fields**, click **Subscribe** next to `messages`.

---

## Step 4: Send a Test Message

In Meta App Dashboard → **WhatsApp → API Setup**:
1. Select your test phone number in the **To** field
2. Click **Send Message** to send a template message to your phone

Then reply to it — your Mawazo webhook should receive the reply and respond!

---

## Step 5: Get a Permanent Access Token

The temporary token expires every 24 hours. For production:

1. Go to **Business Settings → System Users**
2. Create a System User (Admin role)
3. Add assets → WhatsApp account → assign your app with Full Control
4. Generate token → select your app → select `whatsapp_business_messaging` permission
5. Copy the permanent token into `WHATSAPP_ACCESS_TOKEN`

---

## Step 6: Go Live

To message users who haven't opted in to your test number, you must:
1. Complete Meta's **Business Verification** (submit business documents)
2. Get your WhatsApp account reviewed and approved
3. Register a **phone number** for production use

See: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started

---

## Testing the Webhook Locally

**Verify endpoint:**
```bash
curl "http://localhost:3000/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"
# Expected: test123
```

**Simulate an incoming text message:**
```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d @docs/sample-webhook-payload.json
```

Note: In development, `WHATSAPP_APP_SECRET` can be left unset to skip signature verification. In production it is required.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Webhook verification fails | Check `WHATSAPP_VERIFY_TOKEN` matches exactly (case-sensitive) |
| 403 on POST | Set `WHATSAPP_APP_SECRET` correctly or leave unset in dev |
| No reply from bot | Check `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` |
| "Session expired" in ngrok | Restart ngrok and update the webhook URL in Meta dashboard |
| Claude not responding | Check `ANTHROPIC_API_KEY` is valid and has credits |

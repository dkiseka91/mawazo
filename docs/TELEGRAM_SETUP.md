# Telegram Bot Setup Guide

Connecting Mawazo to Telegram takes about 5 minutes — no approval process, no geographic restrictions.

---

## Step 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Choose a name: e.g. **Mawazo Bookkeeper**
4. Choose a username: e.g. **mawazo_ug_bot** (must end in `bot`)
5. BotFather replies with your **bot token** — looks like `7123456789:AAGx...`

Copy it into your Railway environment as `TELEGRAM_BOT_TOKEN`.

---

## Step 2: Deploy to Railway (if not already done)

See [WHATSAPP_SETUP.md](WHATSAPP_SETUP.md) for Railway setup steps — the process is the same except you only need these env vars for Telegram:

```
TELEGRAM_BOT_TOKEN       = 7123456789:AAGx...
TELEGRAM_WEBHOOK_SECRET  = any_random_string_you_choose  (optional)
ANTHROPIC_API_KEY        = sk-ant-...
DATABASE_URL             = (auto-set by Railway PostgreSQL plugin)
REDIS_URL                = (auto-set by Railway Redis plugin)
NODE_ENV                 = production
```

WhatsApp env vars are not required — leave them blank.

---

## Step 3: Register the Webhook with Telegram

Once Railway has deployed and your app is running, call the setup endpoint **once** from your browser:

```
https://your-app.up.railway.app/telegram/set-webhook?url=https://your-app.up.railway.app
```

You should see:
```json
{ "ok": true, "webhookUrl": "https://your-app.up.railway.app/telegram", "telegram": { "ok": true, "result": true } }
```

Check the current webhook status any time:
```
https://your-app.up.railway.app/telegram/info
```

---

## Step 4: Test the Bot

1. Search for your bot username on Telegram (e.g. `@mawazo_ug_bot`)
2. Press **Start** or send `/start`
3. Send **"Hi"** — Mawazo should reply with the onboarding greeting

**Example conversation:**
```
You:    Hi
Mawazo: Hello! I'm Mawazo, your AI bookkeeper 📒
        What's the name of your business?

You:    Nakato General Store
Mawazo: Great name — Nakato General Store! 🎉
        What type of business is it?

You:    Retail shop
Mawazo: Perfect! You're all set up ✅
        You can now record: "Sold goods for 150,000"

You:    Paid 120,000 for rent today
Mawazo: Recorded! Expense of UGX 120,000 for rent. 📝

You:    Show me this month's profit
Mawazo: 📊 This month's Summary — Nakato General Store
        💰 Income: UGX 0
        💸 Expenses: UGX 120,000
        ⚠️ Net: UGX 120,000 loss
```

---

## How User Identity Works

Telegram does not expose phone numbers by default. Mawazo uses the **Telegram chat ID** (prefixed with `tg_`) as the user identifier in the database. This means:

- A user's data is tied to their Telegram account, not their phone number
- If they switch phones but keep the same Telegram account, their data is preserved
- To cross-reference with MoMo later (Phase 2), the onboarding flow can ask for their phone number

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Bot doesn't reply | Check Railway logs — ensure `ANTHROPIC_API_KEY` is set |
| Webhook not registered | Call the `/telegram/set-webhook?url=...` endpoint again |
| `TELEGRAM_BOT_TOKEN not set` error | Add the token to Railway → Variables |
| Replies in wrong language | Claude detects language automatically — try sending in Luganda |
| `409 Conflict` from Telegram | Another process is using polling — disable it, webhook takes priority |

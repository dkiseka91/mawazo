# Mawazo — AI Bookkeeping for Uganda's SMEs

> Chat on WhatsApp. Mawazo handles the books.

Mawazo is a WhatsApp-based AI bookkeeping agent for Ugandan small businesses. Entrepreneurs describe their transactions in plain English or Luganda and Mawazo records, categorises, and reports on them automatically.

## Architecture

```
WhatsApp Cloud API
       │
       ▼
packages/webhook        ← Express HTTP server (webhook handler)
       │
       ▼
packages/ai-engine      ← Claude intent classifier + transaction handlers
       │
       ├── PostgreSQL   ← Businesses, transactions, categories, reports
       ├── Redis        ← Conversation session state (30-min TTL)
       └── packages/momo ← MTN MoMo integration (stub at MVP)
```

## Packages

| Package | Description |
|---------|-------------|
| `packages/webhook` | WhatsApp Cloud API webhook — receives and replies to messages |
| `packages/ai-engine` | Claude-powered intent classification and transaction handling |
| `packages/database` | PostgreSQL migrations and seeds |
| `packages/momo` | MTN MoMo API stub (placeholder for Phase 2) |
| `shared` | Cross-package types, UGX formatting, logging |

## Quick Start

### Prerequisites
- Node.js 20+
- Docker and Docker Compose
- An Anthropic API key

### 1. Clone and configure

```bash
cp .env.example .env
# Edit .env — at minimum set ANTHROPIC_API_KEY and WHATSAPP_VERIFY_TOKEN
```

### 2. Start infrastructure

```bash
docker compose up postgres redis -d
```

### 3. Install dependencies and run migrations

```bash
npm install
npm run migrate
```

### 4. Start the webhook server

```bash
npm run dev
# Server running at http://localhost:3000
```

### 5. Run the full stack via Docker

```bash
docker compose up --build
```

## WhatsApp Setup

See [docs/WHATSAPP_SETUP.md](docs/WHATSAPP_SETUP.md) for step-by-step instructions on:
- Creating a Meta Developer App
- Configuring the webhook URL (using ngrok for local development)
- Setting up a test WhatsApp number

## Testing the Webhook Locally

**Verify endpoint (Meta challenge):**
```bash
curl "http://localhost:3000/webhook?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test123"
# Should return: test123
```

**Health check:**
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok","timestamp":"..."}
```

**Simulate an incoming message:**
```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=SKIP_FOR_LOCAL" \
  -d @docs/sample-webhook-payload.json
```

## Supported Intents

| Intent | Example Message |
|--------|----------------|
| `log_expense` | "Paid 120,000 for rent today" |
| `log_income` | "Sold tomatoes for 85,000 UGX" |
| `request_report` | "Show me this month's profit" |
| `onboarding` | "Hi" / "Start" / "Help" |

## Environment Variables

See [.env.example](.env.example) for all required variables with descriptions.

## Tech Stack

- **Runtime**: Node.js 20 + TypeScript
- **HTTP**: Express.js
- **AI**: Anthropic Claude (`claude-sonnet-4-5`)
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Containerisation**: Docker Compose
- **Currency**: UGX (Ugandan Shillings) stored as BIGINT

## Roadmap

- **Phase 1 (MVP)**: WhatsApp + Claude AI + PostgreSQL + MoMo stub ← *you are here*
- **Phase 2**: Invoicing, Airtel Money, accountant dashboard, payroll
- **Phase 3**: URA tax filing, credit scoring, Kenya/Tanzania expansion

## Licence

Proprietary — © 2026 Mawazo Technologies Ltd

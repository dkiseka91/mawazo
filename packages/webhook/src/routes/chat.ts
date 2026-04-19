/**
 * Web-app chat interface.
 *
 * GET  /chat            — HTML chat UI (requires ?token= from /webapp Telegram command)
 * POST /chat/message    — send a message, returns { reply }
 * GET  /chat/history    — last 20 messages for this session
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { processMessage, getWebappUserId, getPool, getSession } from '@mawazo/ai-engine';
import { createLogger } from '@mawazo/shared';

const router = Router();
const logger = createLogger('webhook:chat');

// ── Auth helper ───────────────────────────────────────────────────────────────

async function resolveUserId(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  return getWebappUserId(token);
}

// ── GET /chat ─────────────────────────────────────────────────────────────────

router.get('/', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(chatPage());
});

// ── POST /chat/message ────────────────────────────────────────────────────────

router.post('/message', async (req: Request, res: Response) => {
  const token  = req.query.token as string | undefined;
  const userId = await resolveUserId(token);

  if (!userId) {
    res.status(401).json({ error: 'Invalid or expired session. Get a new link via /webapp in Telegram.' });
    return;
  }

  const { message } = req.body as { message?: string };
  if (!message?.trim()) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  try {
    const result = await processMessage(userId, message.trim());
    res.json({ reply: result.reply });
  } catch (err) {
    logger.error({ err, userId }, 'processMessage error in webapp');
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// ── GET /chat/history ─────────────────────────────────────────────────────────

router.get('/history', async (req: Request, res: Response) => {
  const token  = req.query.token as string | undefined;
  const userId = await resolveUserId(token);

  if (!userId) {
    res.status(401).json({ error: 'Invalid or expired session.' });
    return;
  }

  try {
    const session = await getSession(userId);
    res.json({ messages: session?.messages ?? [] });
  } catch (err) {
    res.json({ messages: [] });
  }
});

// ── GET /chat/me ──────────────────────────────────────────────────────────────

router.get('/me', async (req: Request, res: Response) => {
  const token  = req.query.token as string | undefined;
  const userId = await resolveUserId(token);

  if (!userId) {
    res.status(401).json({ error: 'Invalid or expired session.' });
    return;
  }

  const pool = getPool();
  const { rows } = await pool.query<{ name: string | null; subscription_tier: string }>(
    'SELECT name, subscription_tier FROM businesses WHERE phone_number = $1',
    [userId]
  );

  res.json({
    businessName: rows[0]?.name ?? null,
    tier:         rows[0]?.subscription_tier ?? 'free',
  });
});

// ── HTML ──────────────────────────────────────────────────────────────────────

function chatPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mawazo — AI Bookkeeper</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0}
.app{display:flex;flex-direction:column;height:100vh;max-width:720px;margin:0 auto}

/* Header */
.header{background:#1e293b;border-bottom:1px solid #334155;padding:14px 20px;
  display:flex;align-items:center;gap:12px;flex-shrink:0}
.avatar{width:38px;height:38px;background:#f59e0b;border-radius:50%;
  display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0}
.header-text h1{font-size:1rem;font-weight:700;color:#f8fafc}
.header-text p{font-size:.8rem;color:#64748b}
.status-dot{width:8px;height:8px;background:#34d399;border-radius:50%;
  margin-left:auto;flex-shrink:0}

/* Messages */
.messages{flex:1;overflow-y:auto;padding:20px 16px;display:flex;flex-direction:column;gap:10px}
.messages::-webkit-scrollbar{width:4px}
.messages::-webkit-scrollbar-thumb{background:#334155;border-radius:4px}

/* Bubbles */
.msg{display:flex;flex-direction:column;max-width:78%}
.msg.user{align-self:flex-end;align-items:flex-end}
.msg.bot{align-self:flex-start;align-items:flex-start}
.bubble{padding:10px 14px;border-radius:16px;font-size:.9rem;line-height:1.5;word-break:break-word}
.msg.user .bubble{background:#f59e0b;color:#0f172a;border-bottom-right-radius:4px}
.msg.bot  .bubble{background:#1e293b;color:#e2e8f0;border-bottom-left-radius:4px;
  border:1px solid #334155;white-space:pre-wrap}
.timestamp{font-size:.7rem;color:#475569;margin-top:3px;padding:0 4px}

/* Typing indicator */
.typing .bubble{display:flex;align-items:center;gap:4px;padding:12px 16px}
.dot{width:6px;height:6px;background:#64748b;border-radius:50%;
  animation:bounce .8s infinite ease-in-out}
.dot:nth-child(2){animation-delay:.15s}
.dot:nth-child(3){animation-delay:.3s}
@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}

/* Input */
.input-area{background:#1e293b;border-top:1px solid #334155;padding:14px 16px;
  display:flex;gap:10px;align-items:flex-end;flex-shrink:0}
textarea{flex:1;background:#0f172a;border:1px solid #334155;border-radius:12px;
  color:#f8fafc;padding:10px 14px;font-size:.9rem;resize:none;outline:none;
  max-height:120px;line-height:1.5;font-family:inherit}
textarea:focus{border-color:#f59e0b}
textarea::placeholder{color:#475569}
button.send{width:42px;height:42px;background:#f59e0b;border:none;border-radius:50%;
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  flex-shrink:0;transition:.15s}
button.send:hover{background:#d97706}
button.send svg{fill:#0f172a}
button.send:disabled{background:#334155;cursor:default}
button.send:disabled svg{fill:#64748b}

/* No-token screen */
.no-token{display:flex;flex-direction:column;align-items:center;justify-content:center;
  height:100vh;padding:40px;text-align:center;gap:16px}
.no-token h1{font-size:1.5rem;font-weight:700;color:#f59e0b}
.no-token p{color:#94a3b8;max-width:360px;line-height:1.6}
.no-token code{background:#1e293b;padding:4px 10px;border-radius:6px;
  font-family:monospace;color:#f59e0b}

@media(max-width:500px){
  .bubble{font-size:.85rem}
  .messages{padding:12px 10px}
  .input-area{padding:10px}
}
</style>
</head>
<body>
<div id="root"></div>
<script>
const TOKEN = new URLSearchParams(location.search).get('token');
const root  = document.getElementById('root');

if (!TOKEN) {
  root.innerHTML = \`
    <div class="no-token">
      <div style="font-size:2.5rem">📒</div>
      <h1>Mawazo Web Chat</h1>
      <p>To use the web interface, open the Telegram bot and send:</p>
      <p><code>/webapp</code></p>
      <p>You'll receive a personalised link valid for 24 hours.</p>
    </div>\`;
} else {
  initChat();
}

function initChat() {
  let businessName = 'Your Business';
  let sending = false;

  root.innerHTML = \`
    <div class="app">
      <div class="header">
        <div class="avatar">📒</div>
        <div class="header-text">
          <h1 id="biz-name">Mawazo</h1>
          <p id="biz-sub">AI Bookkeeper</p>
        </div>
        <div class="status-dot" title="Online"></div>
      </div>
      <div class="messages" id="messages"></div>
      <div class="input-area">
        <textarea id="input" placeholder="Type a transaction or question…" rows="1"></textarea>
        <button class="send" id="send-btn" title="Send">
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
        </button>
      </div>
    </div>\`;

  const msgs    = document.getElementById('messages');
  const input   = document.getElementById('input');
  const sendBtn = document.getElementById('send-btn');

  // Fetch business info
  fetch(apiUrl('/chat/me')).then(r => r.json()).then(d => {
    if (d.businessName) {
      businessName = d.businessName;
      document.getElementById('biz-name').textContent = d.businessName;
      document.getElementById('biz-sub').textContent =
        d.tier.charAt(0).toUpperCase() + d.tier.slice(1) + ' plan';
    }
  }).catch(() => {});

  // Load history
  fetch(apiUrl('/chat/history')).then(r => r.json()).then(d => {
    (d.messages || []).forEach(m => appendBubble(m.role === 'user' ? 'user' : 'bot', m.content));
    scrollBottom();
    if (!d.messages?.length) {
      appendBubble('bot', "Hello! I'm Mawazo, your AI bookkeeper 📒\\n\\nType a transaction to get started, e.g.:\\n• _Sold goods for 150,000_\\n• _Paid rent 400,000_\\n\\nOr type /help to see all commands.");
      scrollBottom();
    }
  }).catch(() => {});

  input.addEventListener('input', autoResize);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  });
  sendBtn.addEventListener('click', doSend);

  function autoResize() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  }

  function scrollBottom() {
    msgs.scrollTop = msgs.scrollHeight;
  }

  function fmt(t) {
    return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function appendBubble(role, text, ts) {
    const div  = document.createElement('div');
    div.className = 'msg ' + role;
    const time = ts ? \`<div class="timestamp">\${fmt(ts)}</div>\` : '';
    div.innerHTML = \`<div class="bubble">\${mdToHtml(text)}</div>\${time}\`;
    msgs.appendChild(div);
    return div;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'msg bot typing';
    div.id = 'typing';
    div.innerHTML = '<div class="bubble"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';
    msgs.appendChild(div);
    scrollBottom();
  }

  function hideTyping() {
    document.getElementById('typing')?.remove();
  }

  async function doSend() {
    const text = input.value.trim();
    if (!text || sending) return;
    sending = true;
    sendBtn.disabled = true;
    input.value = '';
    input.style.height = 'auto';

    appendBubble('user', text, new Date().toISOString());
    scrollBottom();
    showTyping();

    try {
      const r = await fetch(apiUrl('/chat/message'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      hideTyping();
      const data = await r.json();
      appendBubble('bot', data.reply || data.error, new Date().toISOString());
    } catch {
      hideTyping();
      appendBubble('bot', 'Connection error. Please try again.', new Date().toISOString());
    }
    scrollBottom();
    sending = false;
    sendBtn.disabled = false;
    input.focus();
  }

  // Minimal markdown → HTML (bold, italic, code)
  function mdToHtml(text) {
    return text
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\\*(.*?)\\*/g,'<strong>$1</strong>')
      .replace(/_(.*?)_/g,'<em>$1</em>')
      .replace(/\`(.*?)\`/g,'<code style="background:#0f172a;padding:1px 5px;border-radius:3px">$1</code>')
      .replace(/\\n/g,'<br>');
  }
}

function apiUrl(path) {
  return path + '?token=' + encodeURIComponent(TOKEN);
}
</script>
</body>
</html>`;
}

export { router as chatRouter };

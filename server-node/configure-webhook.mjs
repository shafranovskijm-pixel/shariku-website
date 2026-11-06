// Run only inside the private service environment after HTTPS has been verified.
const env = process.env;
if (!env.SHARIKU_RECEIVER_URL || !env.SHARIKU_TELEGRAM_BOT_TOKEN || !env.SHARIKU_TELEGRAM_WEBHOOK_SECRET) throw new Error("Private receiver and Telegram settings required");
const base = new URL(env.SHARIKU_RECEIVER_URL);
if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) throw new Error("Use the exact HTTPS receiver origin");
let response;
try {
  response = await fetch(`https://api.telegram.org/bot${env.SHARIKU_TELEGRAM_BOT_TOKEN}/setWebhook`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: new URL("/api/telegram/webhook", base).href, secret_token: env.SHARIKU_TELEGRAM_WEBHOOK_SECRET, allowed_updates: ["message", "callback_query"], max_connections: 1, drop_pending_updates: false }), signal: AbortSignal.timeout(12000),
  });
  const result = await response.json();
  if (!response.ok || result.ok !== true) throw new Error("Webhook configuration rejected");
  console.log(JSON.stringify({ ok: true, webhookConfigured: true, updates: ["message", "callback_query"] }));
} catch { console.error("Webhook configuration not confirmed; inspect privately before retrying"); process.exitCode = 1; }

import { SalesStore, openSalesDatabase } from "../lib/server/sales-store.mjs";
import { createSalesServer } from "./http.mjs";
process.umask(0o077);
const env = process.env;
for (const key of ["SHARIKU_SQLITE_PATH", "SHARIKU_MANAGER_USER_ID", "SHARIKU_TELEGRAM_BOT_TOKEN", "SHARIKU_TELEGRAM_WEBHOOK_SECRET", "SHARIKU_ORDER_HMAC_SECRET", "SHARIKU_FEED_TOKEN", "SHARIKU_METRIKA_TIMEZONE"]) {
  if (!env[key]) throw new Error(`Missing setting: ${key}`);
}
for (const key of ["SHARIKU_TELEGRAM_WEBHOOK_SECRET", "SHARIKU_ORDER_HMAC_SECRET", "SHARIKU_FEED_TOKEN"]) if (env[key].length < 32) throw new Error(`Setting too short: ${key}`);
const db = openSalesDatabase(env.SHARIKU_SQLITE_PATH);
const store = new SalesStore(db);
const server = createSalesServer(store, env);
server.listen(Number(env.PORT || 3001), env.HOST || "127.0.0.1", () => console.log("Order receiver ready"));
const cleanup = setInterval(() => store.purge(Math.floor(Date.now() / 1000)), 3600000);
cleanup.unref();
function stop() { clearInterval(cleanup); server.close(() => { db.close(); process.exit(0); }); }
process.on("SIGTERM", stop); process.on("SIGINT", stop);

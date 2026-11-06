import { DatabaseSync } from "node:sqlite";
import { chmodSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const SCHEMA = `
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS sales_schema (version INTEGER PRIMARY KEY);
INSERT OR IGNORE INTO sales_schema VALUES(1);
CREATE TABLE IF NOT EXISTS sales_orders (
 request_id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, payload TEXT NOT NULL,
 created_at INTEGER NOT NULL, is_test INTEGER NOT NULL DEFAULT 0,
 delivery_status TEXT NOT NULL DEFAULT 'pending', telegram_message_id INTEGER,
 paid_at INTEGER, paid_amount_kopecks INTEGER, paid_by TEXT,
 CHECK(paid_amount_kopecks IS NULL OR paid_amount_kopecks>0)
);
CREATE TABLE IF NOT EXISTS sales_manager (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1), user_id TEXT NOT NULL,
 chat_id TEXT NOT NULL, bound_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sales_updates (
 update_id INTEGER PRIMARY KEY, status TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sales_payment_flow (
 user_id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES sales_orders(request_id),
 stage TEXT NOT NULL, amount_kopecks INTEGER, nonce TEXT, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sales_limits (
 bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sales_audit (
 id INTEGER PRIMARY KEY, request_id TEXT, action TEXT NOT NULL,
 actor TEXT, happened_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sales_reports (
 period_key TEXT PRIMARY KEY, status TEXT NOT NULL, created_at INTEGER NOT NULL,
 telegram_message_id INTEGER
);
CREATE TABLE IF NOT EXISTS sales_feed_state (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1), modified_at INTEGER NOT NULL
);
`;

export function migrateDatabase(filename) {
  if (filename !== ":memory:") mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  db.exec(SCHEMA);
  db.close();
  if (filename !== ":memory:") chmodSync(filename, 0o600);
}

export function openSalesDatabase(filename) {
  if (!existsSync(filename)) throw new Error("Run server-node/migrate.mjs first");
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;");
  if (db.prepare("SELECT version FROM sales_schema").get()?.version !== 1) throw new Error("Unsupported database schema");
  return db;
}

export class SalesStore {
  constructor(db) { this.db = db; }
  report(periodKey) {
    return this.db.prepare("SELECT * FROM sales_reports WHERE period_key=?").get(periodKey) || null;
  }
  claimReport(periodKey, now) {
    // An unknown external delivery must never be retried automatically.
    this.db.prepare("INSERT OR IGNORE INTO sales_reports VALUES(?,'failed',?,NULL)").run(periodKey, now);
    return this.db.prepare("UPDATE sales_reports SET status='sending',created_at=? WHERE period_key=? AND status='failed'")
      .run(now, periodKey).changes === 1;
  }
  finishReport(periodKey, status, messageId = null) {
    if (!["sent", "failed", "uncertain"].includes(status)) throw new Error("Invalid report status");
    this.db.prepare("UPDATE sales_reports SET status=?,telegram_message_id=? WHERE period_key=? AND status='sending'")
      .run(status, messageId, periodKey);
  }
  order(id) {
    const row = this.db.prepare("SELECT * FROM sales_orders WHERE request_id=?").get(id);
    return row ? { ...row, payload: JSON.parse(row.payload) } : null;
  }
  createOrder(order, fingerprint, now) {
    return this.db.prepare("INSERT OR IGNORE INTO sales_orders(request_id,fingerprint,payload,created_at,is_test) VALUES(?,?,?,?,?)")
      .run(order.requestId, fingerprint, JSON.stringify(order), now, order.isTest ? 1 : 0).changes === 1;
  }
  withdrawAttribution(id, now) {
    const order = this.order(id);
    if (!order || !order.payload.analyticsConsent) return;
    const payload = { ...order.payload, analyticsConsent: false, clientId: "", yclid: "" };
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("UPDATE sales_orders SET payload=? WHERE request_id=?").run(JSON.stringify(payload), id);
      this.db.prepare("INSERT INTO sales_audit(request_id,action,actor,happened_at) VALUES(?,'analytics_withdrawn','customer',?)").run(id, now);
      this.db.prepare("INSERT INTO sales_feed_state VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET modified_at=MAX(modified_at,excluded.modified_at)").run(now);
      this.db.exec("COMMIT");
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  feedModifiedAt() { return this.db.prepare("SELECT modified_at FROM sales_feed_state WHERE singleton=1").get()?.modified_at || 0; }
  claimDelivery(id) {
    return this.db.prepare("UPDATE sales_orders SET delivery_status='sending' WHERE request_id=? AND delivery_status IN ('pending','rejected')")
      .run(id).changes === 1;
  }
  delivery(id, status, messageId = null) {
    this.db.prepare("UPDATE sales_orders SET delivery_status=?,telegram_message_id=? WHERE request_id=?")
      .run(status, messageId, id);
  }
  manager() { return this.db.prepare("SELECT * FROM sales_manager WHERE singleton=1").get() || null; }
  bindManager(userId, chatId, now) {
    return this.db.prepare("INSERT OR IGNORE INTO sales_manager VALUES(1,?,?,?)").run(userId, chatId, now).changes === 1;
  }
  claimUpdate(id, now) {
    if (this.db.prepare("INSERT OR IGNORE INTO sales_updates VALUES(?,'processing',?)").run(id, now).changes === 1) return "claimed";
    const existing = this.db.prepare("SELECT status,created_at FROM sales_updates WHERE update_id=?").get(id);
    if (existing.status === "done") return "done";
    // A process killed during an update must not make Telegram discard it.
    // Expired processing leases can be reclaimed; payment mutation stays atomic.
    if (this.db.prepare("UPDATE sales_updates SET status='processing',created_at=? WHERE update_id=? AND (status='retry' OR (status='processing' AND created_at<=?))")
      .run(now, id, now - 30).changes === 1) return "claimed";
    return "busy";
  }
  finishUpdate(id) { this.db.prepare("UPDATE sales_updates SET status='done' WHERE update_id=?").run(id); }
  failUpdate(id) { this.db.prepare("UPDATE sales_updates SET status='retry' WHERE update_id=? AND status!='done'").run(id); }
  recentOrders(limit = 20) {
    return this.db.prepare("SELECT * FROM sales_orders ORDER BY created_at DESC LIMIT ?").all(limit)
      .map(row => ({ ...row, payload: JSON.parse(row.payload) }));
  }
  setFlow(userId, orderId, stage, expiresAt, amount = null, nonce = null) {
    this.db.prepare("INSERT INTO sales_payment_flow VALUES(?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET request_id=excluded.request_id,stage=excluded.stage,amount_kopecks=excluded.amount_kopecks,nonce=excluded.nonce,expires_at=excluded.expires_at")
      .run(userId, orderId, stage, amount, nonce, expiresAt);
  }
  flow(userId) { return this.db.prepare("SELECT * FROM sales_payment_flow WHERE user_id=?").get(userId) || null; }
  clearFlow(userId) { this.db.prepare("DELETE FROM sales_payment_flow WHERE user_id=?").run(userId); }
  pay(id, amount, userId, now) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const changed = this.db.prepare("UPDATE sales_orders SET paid_at=?,paid_amount_kopecks=?,paid_by=? WHERE request_id=? AND paid_at IS NULL AND delivery_status='delivered'")
        .run(now, amount, userId, id).changes === 1;
      if (changed) this.db.prepare("INSERT INTO sales_audit(request_id,action,actor,happened_at) VALUES(?,'paid',?,?)").run(id, userId, now);
      this.db.exec("COMMIT");
      return changed;
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  ordersForExport(now) {
    return this.db.prepare("SELECT * FROM sales_orders WHERE is_test=0 AND delivery_status='delivered' AND created_at>=? ORDER BY created_at,request_id")
      // Keep business records for 120 days, but never feed Center orders beyond
      // its accepted creation-date window. Leave a 2-day margin below 113 days.
      .all(now - 111 * 86400).map(row => ({ ...row, payload: JSON.parse(row.payload) }))
      .filter(row => row.payload.analyticsConsent && row.payload.clientId);
  }
  rateLimit(bucket, now, seconds, maximum) {
    this.db.prepare("DELETE FROM sales_limits WHERE expires_at<=?").run(now);
    this.db.prepare("INSERT INTO sales_limits VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1").run(bucket, now + seconds);
    return this.db.prepare("SELECT count FROM sales_limits WHERE bucket=?").get(bucket).count <= maximum;
  }
  purge(now) {
    this.db.prepare("DELETE FROM sales_payment_flow WHERE expires_at<?").run(now);
    this.db.prepare("DELETE FROM sales_updates WHERE created_at<?").run(now - 30 * 86400);
    this.db.prepare("DELETE FROM sales_orders WHERE created_at<? AND request_id NOT IN (SELECT request_id FROM sales_payment_flow)").run(now - 120 * 86400);
    this.db.prepare("DELETE FROM sales_audit WHERE happened_at<?").run(now - 120 * 86400);
  }
}

import { DatabaseSync, backup } from "node:sqlite";
import { randomBytes } from "node:crypto";
import { chmodSync, closeSync, existsSync, lstatSync, mkdirSync, openSync, readdirSync, realpathSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const BACKUP_NAME = /^shariku-\d{8}T\d{9}Z-[0-9a-f]{12}\.sqlite$/;
const inside = (root, target) => { const rel = relative(root, target); return rel !== "" && !rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel); };

function noSymlinkAncestors(path) {
  for (let cursor = resolve(path); ; cursor = dirname(cursor)) {
    if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink()) throw new Error("UNSAFE_BACKUP_PATH");
    if (dirname(cursor) === cursor) break;
  }
}

function boundedInteger(value, fallback, maximum) {
  if (value === undefined || value === "") return fallback;
  if (!/^\d+$/.test(String(value))) throw new Error("INVALID_BACKUP_RETENTION");
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > maximum) throw new Error("INVALID_BACKUP_RETENTION");
  return n;
}

/** Native SQLite backup includes committed WAL pages; never copy a live .sqlite file. */
export async function createSalesBackup(env, options = {}) {
  if (!isAbsolute(env.SHARIKU_SQLITE_PATH || "") || !isAbsolute(env.SHARIKU_BACKUP_DIR || "")) throw new Error("ABSOLUTE_BACKUP_PATHS_REQUIRED");
  const keep = boundedInteger(env.SHARIKU_BACKUP_KEEP, 14, 31);
  const days = boundedInteger(env.SHARIKU_BACKUP_MAX_DAYS, 14, 31);
  const now = options.now ? new Date(options.now) : new Date();
  if (!Number.isFinite(now.getTime())) throw new Error("INVALID_BACKUP_DATE");
  const sourcePath = resolve(env.SHARIKU_SQLITE_PATH);
  const requestedRoot = resolve(env.SHARIKU_BACKUP_DIR);
  noSymlinkAncestors(sourcePath); noSymlinkAncestors(requestedRoot);
  if (!existsSync(sourcePath) || !lstatSync(sourcePath).isFile()) throw new Error("SOURCE_DATABASE_MISSING");
  // Never allow retention to operate over the directory containing the source.
  if (inside(requestedRoot, sourcePath) || requestedRoot === sourcePath) throw new Error("SOURCE_INSIDE_BACKUP_DIRECTORY");
  mkdirSync(requestedRoot, { recursive: true, mode: 0o700 });
  if (!lstatSync(requestedRoot).isDirectory() || lstatSync(requestedRoot).isSymbolicLink()) throw new Error("UNSAFE_BACKUP_PATH");
  const root = realpathSync(requestedRoot);
  chmodSync(root, 0o700);
  const lockPath = join(root, ".shariku-backup.lock");
  let lockFd;
  try { lockFd = openSync(lockPath, "wx", 0o600); }
  catch (error) { if (error.code === "EEXIST") return { ok: false, code: "BACKUP_BUSY" }; throw error; }
  const stamp = now.toISOString().replace(/[-:.]/g, "");
  const name = `shariku-${stamp}-${randomBytes(6).toString("hex")}.sqlite`;
  const destination = join(root, name);
  const partial = `${destination}.partial`;
  let source;
  try {
    writeFileSync(lockFd, JSON.stringify({ pid: process.pid, startedAt: now.toISOString() }));
    // Exclusive creation protects against an accidental overwrite. All paths are
    // inside a private directory and the random filename has no customer data.
    const fd = openSync(partial, "wx", 0o600); closeSync(fd);
    source = new DatabaseSync(sourcePath, { readOnly: true, timeout: 5000 });
    await backup(source, partial, { rate: 100 });
    source.close(); source = null;
    const verification = new DatabaseSync(partial);
    try {
      // The source may use WAL. Make the completed snapshot self-contained so
      // restoration never depends on temporary destination -wal/-shm sidecars.
      verification.exec("PRAGMA journal_mode=DELETE;");
      if (verification.prepare("PRAGMA quick_check").get()?.quick_check !== "ok") throw new Error("BACKUP_INTEGRITY_FAILED");
      // A healthy unrelated SQLite database is not an order-receiver backup.
      if (verification.prepare("SELECT version FROM sales_schema").get()?.version !== 1) throw new Error("BACKUP_SCHEMA_FAILED");
      verification.prepare("SELECT 1 FROM sales_orders LIMIT 1").get();
    } finally { verification.close(); }
    chmodSync(partial, 0o600);
    renameSync(partial, destination);
    const candidates = readdirSync(root, { withFileTypes: true })
      .filter(entry => entry.isFile() && BACKUP_NAME.test(entry.name))
      .map(entry => ({ name: entry.name, path: join(root, entry.name) }))
      .filter(entry => inside(root, entry.path) && !lstatSync(entry.path).isSymbolicLink())
      .sort((a, b) => a.path === destination ? -1 : b.path === destination ? 1 : b.name.localeCompare(a.name));
    const expiry = now.getTime() - days * 86400000;
    let removed = 0;
    for (let i = 0; i < candidates.length; i++) {
      const entry = candidates[i];
      // Keep the newly verified snapshot even if a restored server clock moved.
      if (entry.path === destination) continue;
      const filenameStamp = entry.name.match(/^shariku-(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(\d{3})Z-/);
      const createdAt = filenameStamp ? Date.parse(`${filenameStamp[1]}-${filenameStamp[2]}-${filenameStamp[3]}T${filenameStamp[4]}:${filenameStamp[5]}:${filenameStamp[6]}.${filenameStamp[7]}Z`) : NaN;
      if (i >= keep || (Number.isFinite(createdAt) && createdAt < expiry)) {
        if (!inside(root, entry.path) || !BACKUP_NAME.test(entry.name) || !lstatSync(entry.path).isFile() || lstatSync(entry.path).isSymbolicLink()) throw new Error("UNSAFE_BACKUP_RETENTION_TARGET");
        unlinkSync(entry.path); removed++;
      }
    }
    return { ok: true, verified: true, retained: candidates.length - removed, removed };
  } finally {
    source?.close();
    for (const file of [partial, `${partial}-wal`, `${partial}-shm`]) {
      if (existsSync(file) && inside(root, file) && lstatSync(file).isFile() && !lstatSync(file).isSymbolicLink()) unlinkSync(file);
    }
    closeSync(lockFd); unlinkSync(lockPath);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.umask(0o077);
  try {
    const result = await createSalesBackup(process.env);
    console.log(JSON.stringify(result));
    if (!result.ok) process.exitCode = 1;
  } catch {
    // Never print a DB error, path, SQL value, environment or source payload.
    console.error(JSON.stringify({ ok: false, code: "BACKUP_FAILED" })); process.exitCode = 1;
  }
}

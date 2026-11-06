import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { SCHEMA } from "../lib/server/sales-store.mjs";
import { createSalesBackup } from "../server-node/backup.mjs";

function setup(t) {
  const directory = mkdtempSync(join(tmpdir(), "shariku-backup-test-"));
  const source = join(directory, "source.sqlite");
  const db = new DatabaseSync(source); db.exec(SCHEMA); db.exec("PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0;");
  t.after(() => {
    db.close();
    const target = resolve(directory);
    if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith("shariku-backup-test-")) throw new Error("Unsafe temporary cleanup target");
    rmSync(target, { recursive: true, force: true });
  });
  const root = join(directory, "private-backups");
  return { directory, db, source, root, env: { SHARIKU_SQLITE_PATH: source, SHARIKU_BACKUP_DIR: root } };
}

test("native backup includes committed WAL data and snapshot remains independently readable", async t => {
  const f = setup(t);
  f.db.prepare("INSERT INTO sales_manager VALUES(1,'5550254442','5550254442',123)").run();
  assert.ok(readFileSync(`${f.source}-wal`).length > 0);
  const result = await createSalesBackup(f.env, { now: "2026-11-07T01:02:03.004Z" });
  assert.equal(result.ok, true); assert.equal(result.verified, true);
  assert.doesNotMatch(JSON.stringify(result), /5550254442|source.sqlite|private-backups/);
  const files = readdirSync(f.root); assert.equal(files.length, 1); assert.match(files[0], /^shariku-20261107T010203004Z-[a-f0-9]{12}\.sqlite$/);
  const restored = new DatabaseSync(join(f.root, files[0]), { readOnly: true });
  assert.equal(restored.prepare("SELECT user_id FROM sales_manager").get().user_id, "5550254442"); restored.close();
});

test("retention is bounded and touches only this helper's matching regular files", async t => {
  const f = setup(t); mkdirSync(f.root);
  const unrelated = join(f.root, "manual-important.sqlite"); writeFileSync(unrelated, "do not touch");
  writeFileSync(join(f.root, "shariku-20261001T010203004Z-aaaaaaaaaaaa.sqlite"), "old owned snapshot");
  for (let day = 1; day <= 3; day++) await createSalesBackup({ ...f.env, SHARIKU_BACKUP_KEEP: "2", SHARIKU_BACKUP_MAX_DAYS: "14" }, { now: `2026-11-0${day}T01:02:03.004Z` });
  const files = readdirSync(f.root); assert.equal(files.filter(name => /^shariku-.*\.sqlite$/.test(name)).length, 2);
  assert.ok(files.some(name => name.startsWith("shariku-20261102"))); assert.ok(files.some(name => name.startsWith("shariku-20261103")));
  assert.equal(readFileSync(unrelated, "utf8"), "do not touch");
});

test("concurrent/stale lock is not removed blindly and source directory cannot be used", async t => {
  const f = setup(t); mkdirSync(f.root); const lock = join(f.root, ".shariku-backup.lock"); writeFileSync(lock, "existing owner");
  assert.deepEqual(await createSalesBackup(f.env), { ok: false, code: "BACKUP_BUSY" }); assert.equal(readFileSync(lock, "utf8"), "existing owner");
  await assert.rejects(createSalesBackup({ ...f.env, SHARIKU_BACKUP_DIR: f.directory }), /SOURCE_INSIDE_BACKUP_DIRECTORY/);
  assert.ok(f.db.prepare("SELECT version FROM sales_schema").get());
});

test("failed integrity/schema verification preserves previous backups and clears only own partial", async t => {
  const f = setup(t); mkdirSync(f.root); const old = join(f.root, "shariku-20261001T010203004Z-bbbbbbbbbbbb.sqlite"); writeFileSync(old, "preserved prior copy");
  f.db.exec("DROP TABLE sales_schema;");
  await assert.rejects(createSalesBackup(f.env));
  assert.equal(readFileSync(old, "utf8"), "preserved prior copy"); assert.deepEqual(readdirSync(f.root), ["shariku-20261001T010203004Z-bbbbbbbbbbbb.sqlite"]);
});

test("unsafe retention settings fail before creating backup directory", async t => {
  const f = setup(t);
  for (const count of ["0", "100", "-1", "NaN", "1.5"]) await assert.rejects(createSalesBackup({ ...f.env, SHARIKU_BACKUP_KEEP: count }), /INVALID_BACKUP_RETENTION/);
  assert.equal(readdirSync(f.directory).includes("private-backups"), false);
});

test("symbolic backup directory is rejected instead of following its target", async t => {
  const f = setup(t); const target = join(f.directory, "other"); mkdirSync(target);
  try { symlinkSync(target, f.root, process.platform === "win32" ? "junction" : "dir"); }
  catch (error) { if (error.code === "EPERM") { t.skip("OS does not permit creating test symlink"); return; } throw error; }
  await assert.rejects(createSalesBackup(f.env), /UNSAFE_BACKUP_PATH/); assert.deepEqual(readdirSync(target), []);
});

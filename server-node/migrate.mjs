import { migrateDatabase } from "../lib/server/sales-store.mjs";
process.umask(0o077);
if (!process.env.SHARIKU_SQLITE_PATH) throw new Error("SHARIKU_SQLITE_PATH is required");
migrateDatabase(process.env.SHARIKU_SQLITE_PATH);
console.log("Sales schema ready");

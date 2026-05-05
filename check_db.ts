
import Database from "better-sqlite3";
const db = new Database("database.db");
const columns = db.prepare("PRAGMA table_info(system_plans)").all();
console.log(JSON.stringify(columns, null, 2));
db.close();

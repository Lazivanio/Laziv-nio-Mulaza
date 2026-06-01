import Database from 'better-sqlite3';
const db = new Database('database.db');

try {
  console.log("--- PRAGMA TABLE_INFO(service_sheets) ---");
  const info = db.prepare("PRAGMA table_info(service_sheets)").all();
  console.log(info);
} catch (e: any) {
  console.error(e);
}

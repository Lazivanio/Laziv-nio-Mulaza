import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("database.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    username TEXT UNIQUE,
    password TEXT,
    name TEXT,
    role TEXT,
    phone TEXT,
    nif TEXT,
    address TEXT,
    company_name TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'suspended'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: Add missing columns to users
try {
  const columns = db.prepare("PRAGMA table_info(users)").all() as any[];
  console.log("Current users columns:", columns.map(c => c.name));
  if (!columns.some(col => col.name === 'phone')) db.exec("ALTER TABLE users ADD COLUMN phone TEXT");
  if (!columns.some(col => col.name === 'nif')) db.exec("ALTER TABLE users ADD COLUMN nif TEXT");
  if (!columns.some(col => col.name === 'address')) db.exec("ALTER TABLE users ADD COLUMN address TEXT");
  if (!columns.some(col => col.name === 'company_name')) db.exec("ALTER TABLE users ADD COLUMN company_name TEXT");
  if (!columns.some(col => col.name === 'status')) {
    db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'");
  }
  db.exec("UPDATE users SET status = 'active' WHERE status IS NULL");
  if (!columns.some(col => col.name === 'username')) {
    console.log("Adding username column...");
    db.exec("ALTER TABLE users ADD COLUMN username TEXT");
    db.exec("UPDATE users SET username = email WHERE username IS NULL");
    console.log("Username column added and populated.");
  }
  if (!columns.some(col => col.name === 'created_at')) {
    db.exec("ALTER TABLE users ADD COLUMN created_at DATETIME");
    db.exec("UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL");
  }
  if (!columns.some(col => col.name === 'role_id')) db.exec("ALTER TABLE users ADD COLUMN role_id INTEGER");
  if (!columns.some(col => col.name === 'custom_permissions')) db.exec("ALTER TABLE users ADD COLUMN custom_permissions TEXT");
  if (!columns.some(col => col.name === 'store_id')) db.exec("ALTER TABLE users ADD COLUMN store_id INTEGER");
  if (!columns.some(col => col.name === 'cash_register_id')) db.exec("ALTER TABLE users ADD COLUMN cash_register_id INTEGER");
  if (!columns.some(col => col.name === 'bonus')) db.exec("ALTER TABLE hr_salary_payments ADD COLUMN bonus REAL DEFAULT 0");
} catch (e) {
  console.error("Migration error (users):", e);
}

// Migration: Add missing columns to stores
try {
  const columns = db.prepare("PRAGMA table_info(stores)").all() as any[];
  if (!columns.some(col => col.name === 'email')) db.exec("ALTER TABLE stores ADD COLUMN email TEXT");
} catch (e) {
  console.error("Migration error (stores):", e);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    store_id INTEGER,
    plan_type TEXT, -- 'basic', 'pro', 'enterprise'
    start_date TEXT,
    expiry_date TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'suspended', 'expired'
    features TEXT, -- JSON string of limits
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS support_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    subject TEXT,
    description TEXT,
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
    status TEXT DEFAULT 'open', -- 'open', 'pending', 'closed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS ticket_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER,
    sender_id INTEGER,
    message TEXT,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ticket_id) REFERENCES support_tickets(id),
    FOREIGN KEY(sender_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS system_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    price REAL,
    max_stores INTEGER,
    max_products INTEGER,
    features TEXT
  );

  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS system_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    amount REAL,
    plan_id INTEGER,
    payment_method TEXT, -- 'Dinheiro', 'Transferência', 'Multicaixa', 'Outros'
    status TEXT DEFAULT 'paid', -- 'paid', 'pending'
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(plan_id) REFERENCES system_plans(id)
  );

  CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER,
    name TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    nif TEXT,
    logo_url TEXT,
    status TEXT DEFAULT 'active', -- 'active' or 'inactive'
    license_status TEXT DEFAULT 'active',
    license_expiry TEXT,
    bank_accounts TEXT, -- JSON string
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER,
    name TEXT,
    price REAL,
    stock INTEGER,
    category TEXT,
    image_url TEXT,
    is_promo INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    barcode TEXT,
    FOREIGN KEY(store_id) REFERENCES stores(id)
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_products_store_barcode ON products(store_id, barcode);

  CREATE TABLE IF NOT EXISTS generated_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER,
    name TEXT,
    type TEXT, -- 'SAFT', 'Excel', 'PDF'
    generated_by TEXT, -- User name
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    file_data BLOB,
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );
`);

try {
  const columns = db.prepare("PRAGMA table_info(support_tickets)").all() as any[];
  if (!columns.some(col => col.name === 'created_at')) {
    db.exec("ALTER TABLE support_tickets ADD COLUMN created_at DATETIME");
    db.exec("UPDATE support_tickets SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL");
  }
  if (!columns.some(col => col.name === 'updated_at')) {
    db.exec("ALTER TABLE support_tickets ADD COLUMN updated_at DATETIME");
    db.exec("UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL");
  }
  if (!columns.some(col => col.name === 'priority')) {
    db.exec("ALTER TABLE support_tickets ADD COLUMN priority TEXT DEFAULT 'medium'");
  }
} catch (e) {
  console.error("Migration error (support_tickets):", e);
}

try {
  const columns = db.prepare("PRAGMA table_info(licenses)").all() as any[];
  if (!columns.some(col => col.name === 'created_at')) {
    db.exec("ALTER TABLE licenses ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP");
  }
} catch (e) {
  console.error("Migration error (licenses):", e);
}

try {
  const columns = db.prepare("PRAGMA table_info(stores)").all() as any[];
  if (!columns.some(col => col.name === 'created_at')) {
    db.exec("ALTER TABLE stores ADD COLUMN created_at DATETIME");
    db.exec("UPDATE stores SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL");
  }
  if (!columns.some(col => col.name === 'nif')) db.exec("ALTER TABLE stores ADD COLUMN nif TEXT");
  if (!columns.some(col => col.name === 'phone')) db.exec("ALTER TABLE stores ADD COLUMN phone TEXT");
  if (!columns.some(col => col.name === 'bank_accounts')) db.exec("ALTER TABLE stores ADD COLUMN bank_accounts TEXT");
} catch (e) {
  console.error("Migration error (stores):", e);
}

try {
  const columns = db.prepare("PRAGMA table_info(proforma_invoices)").all() as any[];
  if (!columns.some(col => col.name === 'bank_accounts')) db.exec("ALTER TABLE proforma_invoices ADD COLUMN bank_accounts TEXT");
} catch (e) {
  console.error("Migration error (proforma_invoices):", e);
}

try {
  const columns = db.prepare("PRAGMA table_info(products)").all() as any[];
  
  const hasMinStock = columns.some(col => col.name === 'min_stock');
  if (!hasMinStock) {
    db.exec("ALTER TABLE products ADD COLUMN min_stock INTEGER DEFAULT 5");
  }

  const hasIsPromo = columns.some(col => col.name === 'is_promo');
  if (!hasIsPromo) {
    db.exec("ALTER TABLE products ADD COLUMN is_promo INTEGER DEFAULT 0");
  }

  const hasBarcode = columns.some(col => col.name === 'barcode');
  if (!hasBarcode) {
    db.exec("ALTER TABLE products ADD COLUMN barcode TEXT");
    // Generate barcodes for existing products
    const products = db.prepare("SELECT id FROM products WHERE barcode IS NULL").all() as any[];
    for (const p of products) {
      const barcode = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
      db.prepare("UPDATE products SET barcode = ? WHERE id = ?").run(barcode, p.id);
    }
  }
  
  // Ensure barcode uniqueness is per store, not global
  try {
    db.exec("DROP INDEX IF EXISTS idx_products_barcode");
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_products_store_barcode ON products(store_id, barcode)");
  } catch (e) {
    console.error("Error updating barcode index:", e);
  }
  const proformaColumns = db.prepare("PRAGMA table_info(proforma_invoices)").all() as any[];
  if (!proformaColumns.some(col => col.name === 'invoice_number')) {
    db.exec("ALTER TABLE proforma_invoices ADD COLUMN invoice_number TEXT");
  }
} catch (e) {
  console.error("Migration error:", e);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER,
    product_id INTEGER,
    user_id INTEGER,
    type TEXT, -- 'in', 'out', 'transfer', 'adjustment'
    quantity INTEGER,
    reason TEXT,
    from_store_id INTEGER,
    to_store_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(store_id) REFERENCES stores(id),
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

  try {
    const columns = db.prepare("PRAGMA table_info(stock_movements)").all() as any[];
    if (!columns.some(col => col.name === 'from_store_id')) {
      db.exec("ALTER TABLE stock_movements ADD COLUMN from_store_id INTEGER");
    }
    if (!columns.some(col => col.name === 'to_store_id')) {
      db.exec("ALTER TABLE stock_movements ADD COLUMN to_store_id INTEGER");
    }
    if (!columns.some(col => col.name === 'supplier_id')) {
      db.exec("ALTER TABLE stock_movements ADD COLUMN supplier_id INTEGER");
    }
    if (!columns.some(col => col.name === 'purchase_id')) {
      db.exec("ALTER TABLE stock_movements ADD COLUMN purchase_id INTEGER");
    }
  } catch (e) {
    console.error("Migration error (stock_movements):", e);
  }

  // Migration for credit_invoices
  try {
    const columns = db.prepare("PRAGMA table_info(credit_invoices)").all() as any[];
    if (!columns.some(col => col.name === 'seller_id')) {
      db.exec("ALTER TABLE credit_invoices ADD COLUMN seller_id INTEGER");
    }
    if (!columns.some(col => col.name === 'payment_method')) {
      db.exec("ALTER TABLE credit_invoices ADD COLUMN payment_method TEXT");
    }
    if (!columns.some(col => col.name === 'parent_invoice_id')) {
      db.exec("ALTER TABLE credit_invoices ADD COLUMN parent_invoice_id INTEGER");
    }
    if (!columns.some(col => col.name === 'reason')) {
      db.exec("ALTER TABLE credit_invoices ADD COLUMN reason TEXT");
    }
    if (!columns.some(col => col.name === 'note_category')) {
      db.exec("ALTER TABLE credit_invoices ADD COLUMN note_category TEXT");
    }
    if (!columns.some(col => col.name === 'adjustment_amount')) {
      db.exec("ALTER TABLE credit_invoices ADD COLUMN adjustment_amount REAL DEFAULT 0");
    }
    if (!columns.some(col => col.name === 'observations')) {
      db.exec("ALTER TABLE credit_invoices ADD COLUMN observations TEXT");
    }
  } catch (e) {
    console.error("Migration error (credit_invoices):", e);
  }

  // Migration for purchase_returns
  try {
    const columns = db.prepare("PRAGMA table_info(purchase_returns)").all() as any[];
    if (!columns.some(col => col.name === 'type')) {
      db.exec("ALTER TABLE purchase_returns ADD COLUMN type TEXT DEFAULT 'credit'");
    }
  } catch (e) {
    console.error("Migration error (purchase_returns):", e);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER,
    seller_id INTEGER,
    total_amount REAL,
    payment_method TEXT,
    cash_received REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    items TEXT,
    FOREIGN KEY(store_id) REFERENCES stores(id),
    FOREIGN KEY(seller_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER,
    user_id INTEGER,
    salary REAL,
    shift_info TEXT,
    UNIQUE(store_id, user_id),
    FOREIGN KEY(store_id) REFERENCES stores(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS cash_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER,
    seller_id INTEGER,
    type TEXT, -- 'in' or 'out'
    amount REAL,
    description TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(store_id) REFERENCES stores(id),
    FOREIGN KEY(seller_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS cash_registers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER,
    name TEXT,
    code TEXT UNIQUE,
    default_initial_balance REAL DEFAULT 0,
    max_limit REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS cashier_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER,
    cash_register_id INTEGER,
    seller_id INTEGER,
    opening_amount REAL,
    closing_amount REAL,
    physical_amount REAL,
    opening_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    closing_time DATETIME,
    status TEXT DEFAULT 'open', -- 'open' or 'closed'
    FOREIGN KEY(store_id) REFERENCES stores(id),
    FOREIGN KEY(cash_register_id) REFERENCES cash_registers(id),
    FOREIGN KEY(seller_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER,
    name TEXT,
    start_date TEXT,
    end_date TEXT,
    discount_percent REAL,
    FOREIGN KEY(store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS promotion_products (
    promotion_id INTEGER,
    product_id INTEGER,
    PRIMARY KEY(promotion_id, product_id),
    FOREIGN KEY(promotion_id) REFERENCES promotions(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS proforma_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER,
    owner_id INTEGER,
    client_name TEXT,
    client_nif TEXT,
    client_address TEXT,
    total_amount REAL,
    items TEXT, -- JSON string
    bank_accounts TEXT, -- JSON string
    status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'converted'
    invoice_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(store_id) REFERENCES stores(id),
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS credit_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER,
    owner_id INTEGER,
    seller_id INTEGER,
    client_name TEXT,
    client_nif TEXT,
    address TEXT,
    country TEXT,
    doc_type TEXT,
    series TEXT,
    invoice_number TEXT,
    invoice_date TEXT,
    currency TEXT,
    total_amount REAL,
    tax_amount REAL,
    payment_method TEXT,
    items TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(store_id) REFERENCES stores(id),
    FOREIGN KEY(owner_id) REFERENCES users(id),
    FOREIGN KEY(seller_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER,
    name TEXT,
    nif TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS hr_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER,
    name TEXT,
    base_role TEXT DEFAULT 'seller', -- 'seller' or 'manager'
    permissions TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );
  `);

  try {
    db.prepare("ALTER TABLE hr_roles ADD COLUMN base_role TEXT DEFAULT 'seller'").run();
  } catch (e) {}

  try {
    const columns = db.prepare("PRAGMA table_info(cashier_sessions)").all() as any[];
    if (!columns.some(col => col.name === 'cash_register_id')) {
      db.exec("ALTER TABLE cashier_sessions ADD COLUMN cash_register_id INTEGER");
    }
  } catch (e) {
    console.error("Migration error (cashier_sessions):", e);
  }

  try {
    const columns = db.prepare("PRAGMA table_info(transactions)").all() as any[];
    if (!columns.some(col => col.name === 'cash_register_id')) {
      db.exec("ALTER TABLE transactions ADD COLUMN cash_register_id INTEGER");
    }
  } catch (e) {
    console.error("Migration error (transactions):", e);
  }

  try {
    const columns = db.prepare("PRAGMA table_info(cash_movements)").all() as any[];
    if (!columns.some(col => col.name === 'cash_register_id')) {
      db.exec("ALTER TABLE cash_movements ADD COLUMN cash_register_id INTEGER");
    }
  } catch (e) {
    console.error("Migration error (cash_movements):", e);
  }

db.exec(`
  CREATE TABLE IF NOT EXISTS hr_salaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE,
    base_salary REAL DEFAULT 0,
    bonuses REAL DEFAULT 0,
    discounts REAL DEFAULT 0,
    vacation_days_per_year INTEGER DEFAULT 22,
    last_payment_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS hr_salary_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    salary_id INTEGER,
    amount REAL,
    type TEXT, -- 'base', 'bonus', 'discount', 'full_payment'
    description TEXT,
    month TEXT, -- Format: YYYY-MM
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(salary_id) REFERENCES hr_salaries(id)
  );
  `);

  try {
    db.prepare("ALTER TABLE hr_salary_payments ADD COLUMN month TEXT").run();
  } catch (e) {
    // Column might already exist
  }

  db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER,
    store_id INTEGER,
    name TEXT,
    code TEXT,
    description TEXT,
    price REAL,
    availability_condition TEXT, -- 'always' or 'product_purchased'
    show_in_pos INTEGER DEFAULT 1, -- 0 for NO, 1 for YES
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id),
    FOREIGN KEY(store_id) REFERENCES stores(id)
  );
  `);

  db.exec(`
  CREATE TABLE IF NOT EXISTS hr_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    store_id INTEGER,
    entry_time DATETIME,
    exit_time DATETIME,
    status TEXT, -- 'present', 'late', 'absent', 'half_day'
    date TEXT, -- YYYY-MM-DD
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS hr_vacations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    days_count INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER,
    name TEXT NOT NULL,
    company_name TEXT,
    nif TEXT,
    phone TEXT,
    email TEXT,
    country TEXT,
    city TEXT,
    address TEXT,
    responsible_person TEXT,
    payment_method TEXT,
    payment_term TEXT,
    observations TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'inactive'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER,
    supplier_id INTEGER,
    total_amount REAL,
    paid_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'pending', -- 'pending', 'partial', 'paid'
    invoice_number TEXT,
    items TEXT, -- JSON string of items purchased
    due_date DATETIME,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(store_id) REFERENCES stores(id),
    FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
  );

  CREATE TABLE IF NOT EXISTS purchase_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER,
    amount REAL,
    payment_method TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(purchase_id) REFERENCES purchases(id)
  );
`);

try {
  const columnsTransactions = db.prepare("PRAGMA table_info(transactions)").all() as any[];
  if (!columnsTransactions.some(col => col.name === 'split_details')) {
    db.exec("ALTER TABLE transactions ADD COLUMN split_details TEXT");
  }
  if (!columnsTransactions.some(col => col.name === 'client_name')) {
    db.exec("ALTER TABLE transactions ADD COLUMN client_name TEXT");
  }
  if (!columnsTransactions.some(col => col.name === 'client_nif')) {
    db.exec("ALTER TABLE transactions ADD COLUMN client_nif TEXT");
  }
  if (!columnsTransactions.some(col => col.name === 'discount_percent')) {
    db.exec("ALTER TABLE transactions ADD COLUMN discount_percent REAL DEFAULT 0");
  }
  if (!columnsTransactions.some(col => col.name === 'discount_amount')) {
    db.exec("ALTER TABLE transactions ADD COLUMN discount_amount REAL DEFAULT 0");
  }
  if (!columnsTransactions.some(col => col.name === 'tax_amount')) {
    db.exec("ALTER TABLE transactions ADD COLUMN tax_amount REAL DEFAULT 0");
  }
  if (!columnsTransactions.some(col => col.name === 'invoice_number')) {
    db.exec("ALTER TABLE transactions ADD COLUMN invoice_number TEXT");
  }
  if (!columnsTransactions.some(col => col.name === 'agt_status')) {
    db.exec("ALTER TABLE transactions ADD COLUMN agt_status TEXT DEFAULT 'pending'"); // 'pending', 'sent', 'error'
  }
  const columnsPurchases = db.prepare("PRAGMA table_info(purchases)").all() as any[];
  if (!columnsPurchases.some(col => col.name === 'delivery_status')) {
    db.exec("ALTER TABLE purchases ADD COLUMN delivery_status TEXT DEFAULT 'pending'"); // 'pending', 'received', 'cancelled'
  }
  if (!columnsPurchases.some(col => col.name === 'received_at')) {
    db.exec("ALTER TABLE purchases ADD COLUMN received_at DATETIME");
  }
  if (!columnsPurchases.some(col => col.name === 'is_direct')) {
    db.exec("ALTER TABLE purchases ADD COLUMN is_direct INTEGER DEFAULT 0");
  }
  if (!columnsPurchases.some(col => col.name === 'is_stock_updated')) {
    db.exec("ALTER TABLE purchases ADD COLUMN is_stock_updated INTEGER DEFAULT 0");
  }
  if (!columnsPurchases.some(col => col.name === 'is_closed')) {
    db.exec("ALTER TABLE purchases ADD COLUMN is_closed INTEGER DEFAULT 0");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER,
      supplier_id INTEGER,
      purchase_id INTEGER,
      total_amount REAL,
      reason TEXT,
      items TEXT, -- JSON string of items returned
      status TEXT DEFAULT 'pending', -- 'pending', 'completed'
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(store_id) REFERENCES stores(id),
      FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY(purchase_id) REFERENCES purchases(id)
    );
  `);
} catch (e) {
  console.error("Migration error (purchases/returns):", e);
}

try {
  const columns = db.prepare("PRAGMA table_info(clients)").all() as any[];
  if (!columns.some(col => col.name === 'type')) {
    db.exec("ALTER TABLE clients ADD COLUMN type TEXT DEFAULT 'individual'");
  }
} catch (e) {
  console.error("Migration error (clients):", e);
}

// Seed Data (if empty)
const userCount = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)").run("admin@factu.com", "admin", "Admin Master", "admin");
  db.prepare("INSERT INTO users (email, password, name, role, phone, nif, address) VALUES (?, ?, ?, ?, ?, ?, ?)").run("owner@factu.com", "owner", "Dono da Loja", "owner", "923000000", "540123456", "Luanda, Angola");
  db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)").run("seller@factu.com", "seller", "Vendedor 1", "seller");
  
  db.prepare("INSERT INTO stores (owner_id, name, address, license_expiry) VALUES (?, ?, ?, ?)").run(2, "Minha Loja A", "Rua 1, Luanda", "2026-12-31");
  db.prepare("INSERT INTO stores (owner_id, name, address, license_expiry) VALUES (?, ?, ?, ?)").run(2, "Minha Loja B", "Rua 2, Luanda", "2026-12-31");
  
  db.prepare("INSERT INTO system_plans (name, price, max_stores, max_products, features) VALUES (?, ?, ?, ?, ?)").run("Básico", 5000, 1, 100, '{"reports": false, "multi_store": false}');
  db.prepare("INSERT INTO system_plans (name, price, max_stores, max_products, features) VALUES (?, ?, ?, ?, ?)").run("Profissional", 15000, 2, 1000, '{"reports": true, "multi_store": true}');
  db.prepare("INSERT INTO system_plans (name, price, max_stores, max_products, features) VALUES (?, ?, ?, ?, ?)").run("Empresarial", 35000, 10, 5000, '{"reports": true, "multi_store": true, "api_access": true}');
  
  db.prepare("INSERT INTO system_settings (key, value) VALUES (?, ?)").run("expiration_notice", "true");
  db.prepare("INSERT INTO system_settings (key, value) VALUES (?, ?)").run("weekly_reports", "false");
  db.prepare("INSERT INTO system_settings (key, value) VALUES (?, ?)").run("system_name", "Fatu-R");
  
  db.prepare("INSERT INTO support_tickets (user_id, subject, description, status) VALUES (?, ?, ?, ?)").run(2, "Dúvida sobre faturação", "Como posso emitir uma fatura pro-forma?", "open");
  
  // Seed Payments
  db.prepare("INSERT INTO system_payments (user_id, amount, plan_id, payment_method, timestamp) VALUES (?, ?, ?, ?, ?)").run(2, 15000, 2, "Multicaixa", "2026-03-01 10:00:00");
  db.prepare("INSERT INTO system_payments (user_id, amount, plan_id, payment_method, timestamp) VALUES (?, ?, ?, ?, ?)").run(2, 5000, 1, "Transferência", "2026-03-08 14:30:00");
  db.prepare("INSERT INTO system_payments (user_id, amount, plan_id, payment_method, timestamp) VALUES (?, ?, ?, ?, ?)").run(2, 15000, 2, "Dinheiro", "2026-02-15 09:00:00");
  db.prepare("INSERT INTO system_payments (user_id, amount, plan_id, payment_method, timestamp) VALUES (?, ?, ?, ?, ?)").run(2, 15000, 2, "Outros", "2025-12-20 16:00:00");

  // Seed Staff
  db.prepare("INSERT INTO staff (store_id, user_id, salary, shift_info) VALUES (?, ?, ?, ?)").run(1, 3, 50000, "Manhã");
}

// Cleanup test products once
db.exec("DELETE FROM products WHERE store_id = 1 AND name IN ('Cuca Garrafa 33cl', 'Nocal Garrafa 33cl', 'Eka Garrafa 33cl', 'Doppel Munich', 'Booster Cider', 'Coca-Cola Lata', 'Pão Francês', 'Morango Fresco', 'Perfume Chanel N5', 'Blue Polpa 33cl', 'Arroz Tio Lucas 1kg', 'Sabonete Dove', 'Leite Nido 400g', 'Massa Esparguete', 'Vinho Pera Doce', 'Detergente Omo 1kg', 'Óleo Alimentar 1L', 'N''Gola Garrafa', '33 Export', 'Bolachas Maria')");

// --- Helper Functions ---
function hasPermission(userId: number, permissionId: string): boolean {
  const user = db.prepare(`
    SELECT u.role, u.custom_permissions, r.permissions as role_permissions
    FROM users u
    LEFT JOIN hr_roles r ON u.role_id = r.id
    WHERE u.id = ?
  `).get(userId) as any;

  if (!user) return false;
  
  // Admin and Owner always have all permissions
  if (user.role === 'admin' || user.role === 'owner') {
    return true;
  }

  // If custom_permissions is set (not null), it overrides role permissions
  if (user.custom_permissions !== null && user.custom_permissions !== undefined) {
    try {
      const customPerms = typeof user.custom_permissions === 'string' ? JSON.parse(user.custom_permissions) : (user.custom_permissions || []);
      if (Array.isArray(customPerms)) {
        return customPerms.includes(permissionId);
      }
    } catch (e) {
      console.error("Error parsing custom_permissions:", e);
    }
  }

  // Fallback to role permissions
  try {
    const rolePerms = user.role_permissions ? (typeof user.role_permissions === 'string' ? JSON.parse(user.role_permissions) : user.role_permissions) : [];
    if (Array.isArray(rolePerms)) {
      return rolePerms.includes(permissionId);
    }
  } catch (e) {
    console.error("Error parsing role_permissions:", e);
  }
  
  return false;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  const PORT = 3000;

  // --- API Routes ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Auth (Mock for now)
  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const identifier = email?.trim();
    const pass = password;
    
    // Try to find user by email or username
    const user = db.prepare("SELECT * FROM users WHERE (email = ? OR username = ?) AND password = ?").get(identifier, identifier, pass) as any;
    
    if (user) {
      // Check if user is suspended
      if (user.status === 'suspended') {
        return res.status(403).json({ error: "A sua conta está suspensa. Contacte o administrador." });
      }

      let storeId = user.store_id;
      let ownerId = user.id;

      if (user.role === 'seller' || user.role === 'manager') {
        if (!storeId) {
          const staff = db.prepare("SELECT store_id FROM staff WHERE user_id = ?").get(user.id) as any;
          if (staff) storeId = staff.store_id;
        }
        
        if (storeId) {
          const store = db.prepare("SELECT owner_id FROM stores WHERE id = ?").get(storeId) as any;
          if (store) ownerId = store.owner_id;
        } else if (user.role === 'seller') {
          return res.status(403).json({ error: "Esta conta de vendedor foi desativada ou não está vinculada a nenhuma loja." });
        }
      }

      // Check owner status and license
      if (user.role !== 'admin') {
        const owner = db.prepare("SELECT status FROM users WHERE id = ?").get(ownerId) as any;
        if (owner && owner.status === 'suspended') {
          return res.status(403).json({ error: "O acesso está suspenso. Contacte o administrador." });
        }

        // License check
        const activeLicense = db.prepare(`
          SELECT id FROM licenses 
          WHERE user_id = ? AND status = 'active' AND date(expiry_date) >= date('now')
          LIMIT 1
        `).get(ownerId);

        if (!activeLicense) {
          // Check if they have any stores. If they do, and no active license, block.
          const storeCount = db.prepare("SELECT count(*) as count FROM stores WHERE owner_id = ?").get(ownerId) as any;
          if (storeCount.count > 0) {
            return res.status(403).json({ error: "A sua licença expirou ou foi cancelada. Por favor, contacte o suporte." });
          }
        }
      }
      
      // Get effective permissions
      let effectivePermissions: string[] = [];
      const customRaw = user.custom_permissions;
      
      if (customRaw !== null && customRaw !== undefined) {
        try {
          let custom = typeof customRaw === 'string' ? JSON.parse(customRaw) : customRaw;
          if (typeof custom === 'string') custom = JSON.parse(custom);
          if (Array.isArray(custom)) {
            effectivePermissions = custom;
          }
        } catch (e) {}
      } else if (user.role_id) {
        const role = db.prepare("SELECT permissions FROM hr_roles WHERE id = ?").get(user.role_id) as any;
        if (role && role.permissions) {
          try {
            let perms = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;
            if (typeof perms === 'string') perms = JSON.parse(perms);
            if (Array.isArray(perms)) {
              effectivePermissions = perms;
            }
          } catch (e) {}
        }
      }

      res.json({ 
        id: user.id, 
        email: user.email, 
        username: user.username, 
        name: user.name, 
        role: user.role, 
        store_id: storeId,
        role_id: user.role_id,
        custom_permissions: user.custom_permissions,
        permissions: effectivePermissions,
        status: user.status
      });
    } else {
      res.status(401).json({ error: "Credenciais inválidas" });
    }
  });

  // Middleware to check if client is suspended
  const checkSuspended = (req: any, res: any, next: any) => {
    // Skip check for admin routes or login
    if (req.path.startsWith('/api/admin') || req.path === '/api/login' || req.path === '/api/register') {
      return next();
    }

    const userId = req.headers['x-user-id'] || req.query.userId || req.body.user_id || req.body.owner_id || req.body.seller_id;
    const storeId = req.headers['x-store-id'] || req.query.storeId || req.body.store_id;

    let ownerId = null;
    let currentStoreId = storeId;

    // Try to extract ID from path if not found in headers/body
    let idFromPath = null;
    const pathParts = req.path.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && !isNaN(parseInt(lastPart))) {
      idFromPath = parseInt(lastPart);
    }

    const effectiveUserId = userId || (req.path.includes('user') || req.path.includes('owner') || req.path.includes('seller') ? idFromPath : null);
    const effectiveStoreId = storeId || (req.path.includes('store') ? idFromPath : null);
    
    if (effectiveStoreId) currentStoreId = effectiveStoreId;

    if (effectiveUserId) {
      const user = db.prepare("SELECT id, role, status FROM users WHERE id = ?").get(effectiveUserId) as any;
      if (user) {
        if (user.role === 'owner') {
          ownerId = user.id;
        } else if (user.role === 'seller') {
          const staff = db.prepare("SELECT store_id FROM staff WHERE user_id = ?").get(user.id) as any;
          if (staff) {
            currentStoreId = staff.store_id;
            const store = db.prepare("SELECT owner_id FROM stores WHERE id = ?").get(staff.store_id) as any;
            if (store) ownerId = store.owner_id;
          }
        }
      }
    } 
    
    if (!ownerId && currentStoreId) {
      const store = db.prepare("SELECT owner_id FROM stores WHERE id = ?").get(currentStoreId) as any;
      if (store) ownerId = store.owner_id;
    }

    if (ownerId) {
      const owner = db.prepare("SELECT status FROM users WHERE id = ?").get(ownerId) as any;
      if (owner && owner.status === 'suspended') {
        return res.status(403).json({ error: "Acesso suspenso. Contacte o administrador." });
      }

      // Check if owner has ANY active license to allow dashboard access
      // But if they are accessing a specific store, check that store's license
      if (currentStoreId) {
        const store = db.prepare("SELECT license_status, license_expiry FROM stores WHERE id = ?").get(currentStoreId) as any;
        if (store && (store.license_status === 'expired' || (store.license_expiry && new Date(store.license_expiry) < new Date()))) {
          return res.status(403).json({ error: "Licença expirada para esta loja. Por favor, renove a sua subscrição." });
        }
      } else {
        // Global check for owner: must have at least one active license or be in trial
        const activeLicense = db.prepare(`
          SELECT id FROM licenses 
          WHERE user_id = ? AND status = 'active' AND date(expiry_date) >= date('now')
          LIMIT 1
        `).get(ownerId);
        
        if (!activeLicense) {
          // Check if they have any stores at all (if new user, allow)
          const storeCount = db.prepare("SELECT count(*) as count FROM stores WHERE owner_id = ?").get(ownerId) as any;
          if (storeCount.count > 0) {
            return res.status(403).json({ error: "A sua licença expirou. Por favor, contacte o suporte para renovar." });
          }
        }
      }
    }

    next();
  };

  app.get("/api/user-status/:id", (req, res) => {
    const user = db.prepare("SELECT id, role, status FROM users WHERE id = ?").get(req.params.id) as any;
    if (!user) return res.status(404).json({ error: "User not found" });

    let ownerId = user.id;
    if (user.role === 'seller') {
      const staff = db.prepare("SELECT store_id FROM staff WHERE user_id = ?").get(user.id) as any;
      if (staff) {
        const store = db.prepare("SELECT owner_id FROM stores WHERE id = ?").get(staff.store_id) as any;
        if (store) ownerId = store.owner_id;
      } else {
        return res.status(403).json({ error: "Vendedor removido" });
      }
    }

    const owner = db.prepare("SELECT status FROM users WHERE id = ?").get(ownerId) as any;
    if (owner && owner.status === 'suspended') {
      return res.status(403).json({ error: "Acesso suspenso" });
    }

    // License check
    const activeLicense = db.prepare(`
      SELECT id FROM licenses 
      WHERE user_id = ? AND status = 'active' AND date(expiry_date) >= date('now')
      LIMIT 1
    `).get(ownerId);

    if (!activeLicense) {
      const storeCount = db.prepare("SELECT count(*) as count FROM stores WHERE owner_id = ?").get(ownerId) as any;
      if (storeCount.count > 0) {
        return res.status(403).json({ error: "Licença expirada" });
      }
    }

    res.json({ status: user.status });
  });

  app.use("/api/owner", checkSuspended);
  app.use("/api/seller", checkSuspended);

  // Admin Routes
  app.get("/api/admin/dashboard", (req, res) => {
    const totalClients = db.prepare("SELECT count(*) as count FROM users WHERE role = 'owner'").get() as any;
    const activeClients = db.prepare("SELECT count(*) as count FROM users WHERE role = 'owner' AND status = 'active'").get() as any;
    const totalStores = db.prepare("SELECT count(*) as count FROM stores").get() as any;
    const expiredLicenses = db.prepare("SELECT count(*) as count FROM stores WHERE date(license_expiry) < date('now')").get() as any;
    const expiringSoon = db.prepare("SELECT count(*) as count FROM stores WHERE date(license_expiry) BETWEEN date('now') AND date('now', '+7 days')").get() as any;
    
    const recentClients = db.prepare("SELECT * FROM users WHERE role = 'owner' ORDER BY created_at DESC LIMIT 5").all();
    const pendingSupport = db.prepare("SELECT count(*) as count FROM support_tickets WHERE status != 'closed'").get() as any;

    res.json({
      stats: {
        totalClients: totalClients.count,
        activeClients: activeClients.count,
        totalStores: totalStores.count,
        expiredLicenses: expiredLicenses.count,
        expiringSoon: expiringSoon.count,
        pendingSupport: pendingSupport.count
      },
      recentClients
    });
  });

  app.get("/api/admin/clients", (req, res) => {
    const clients = db.prepare(`
      SELECT u.*, 
        (SELECT count(*) FROM stores s WHERE s.owner_id = u.id) as store_count,
        (SELECT plan_type FROM licenses l WHERE l.user_id = u.id AND l.status = 'active' ORDER BY expiry_date DESC LIMIT 1) as current_plan
      FROM users u 
      WHERE u.role = 'owner' 
      ORDER BY u.created_at DESC
    `).all();
    res.json(clients);
  });

  app.get("/api/admin/clients/:id/details", (req, res) => {
    const clientId = req.params.id;
    const client = db.prepare("SELECT * FROM users WHERE id = ?").get(clientId);
    if (!client) return res.status(404).json({ error: "Client not found" });

    const stores = db.prepare("SELECT * FROM stores WHERE owner_id = ?").all(clientId);
    const licenses = db.prepare(`
      SELECT l.*, s.name as store_name 
      FROM licenses l 
      LEFT JOIN stores s ON l.store_id = s.id 
      WHERE l.user_id = ? 
      ORDER BY l.expiry_date DESC
    `).all(clientId);
    const tickets = db.prepare("SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC").all(clientId);
    
    // Stats
    const totalUsers = db.prepare(`
      SELECT count(*) as count 
      FROM staff 
      WHERE store_id IN (SELECT id FROM stores WHERE owner_id = ?)
    `).get(clientId) as any;

    const lastActivity = db.prepare(`
      SELECT timestamp 
      FROM transactions 
      WHERE store_id IN (SELECT id FROM stores WHERE owner_id = ?) 
      ORDER BY timestamp DESC LIMIT 1
    `).get(clientId) as any;

    res.json({
      client,
      stores,
      licenses,
      tickets,
      stats: {
        totalStores: stores.length,
        totalUsers: totalUsers?.count || 0,
        lastActivity: lastActivity?.timestamp || null
      }
    });
  });

  app.post("/api/admin/clients", (req, res) => {
    const { name, company_name, email, password, phone, nif, address } = req.body;
    try {
      db.prepare("INSERT INTO users (name, company_name, email, password, role, phone, nif, address) VALUES (?, ?, ?, ?, 'owner', ?, ?, ?)").run(name, company_name, email, password, phone, nif, address);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/admin/clients/:id", (req, res) => {
    const { name, company_name, email, phone, nif, address, status } = req.body;
    db.prepare("UPDATE users SET name = ?, company_name = ?, email = ?, phone = ?, nif = ?, address = ?, status = ? WHERE id = ?").run(name, company_name, email, phone, nif, address, status, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/admin/clients/:id", (req, res) => {
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/admin/client-stores/:id", (req, res) => {
    const stores = db.prepare("SELECT * FROM stores WHERE owner_id = ?").all(req.params.id);
    res.json(stores);
  });

  app.get("/api/admin/licenses", (req, res) => {
    const licenses = db.prepare(`
      SELECT l.*, u.name as client_name, u.company_name, s.name as store_name
      FROM licenses l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN stores s ON l.store_id = s.id
      ORDER BY l.expiry_date DESC
    `).all();
    res.json(licenses);
  });

  app.put("/api/admin/licenses/:id/status", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE licenses SET status = ? WHERE id = ?").run(status, req.params.id);
    
    // Sync with store if linked
    const license = db.prepare("SELECT store_id FROM licenses WHERE id = ?").get(req.params.id) as any;
    if (license?.store_id) {
      db.prepare("UPDATE stores SET license_status = ? WHERE id = ?").run(status, license.store_id);
    }
    
    res.json({ success: true });
  });

  app.put("/api/admin/licenses/:id/renew", (req, res) => {
    const { expiry_date } = req.body;
    db.prepare("UPDATE licenses SET expiry_date = ?, status = 'active' WHERE id = ?").run(expiry_date, req.params.id);
    
    // Also update store if linked
    const license = db.prepare("SELECT store_id FROM licenses WHERE id = ?").get(req.params.id) as any;
    if (license?.store_id) {
      db.prepare("UPDATE stores SET license_expiry = ?, license_status = 'active' WHERE id = ?").run(expiry_date, license.store_id);
    }
    
    res.json({ success: true });
  });

  app.get("/api/admin/licenses/history/:userId", (req, res) => {
    const history = db.prepare(`
      SELECT l.*, s.name as store_name
      FROM licenses l
      LEFT JOIN stores s ON l.store_id = s.id
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC
    `).all(req.params.userId);
    res.json(history);
  });

  app.post("/api/admin/licenses", (req, res) => {
    const { user_id, store_id, plan_type, start_date, expiry_date, features } = req.body;
    db.prepare(`
      INSERT INTO licenses (user_id, store_id, plan_type, start_date, expiry_date, features)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user_id, store_id, plan_type, start_date, expiry_date, JSON.stringify(features));
    
    // Update store expiry too
    if (store_id) {
      db.prepare("UPDATE stores SET license_expiry = ? WHERE id = ?").run(expiry_date, store_id);
    }
    
    res.json({ success: true });
  });

  app.get("/api/admin/support", (req, res) => {
    const tickets = db.prepare(`
      SELECT t.*, u.name as client_name
      FROM support_tickets t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
    `).all();
    res.json(tickets);
  });

  app.put("/api/admin/support/:id", (req, res) => {
    const { status, priority } = req.body;
    if (status && priority) {
      db.prepare("UPDATE support_tickets SET status = ?, priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, priority, req.params.id);
    } else if (status) {
      db.prepare("UPDATE support_tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, req.params.id);
    } else if (priority) {
      db.prepare("UPDATE support_tickets SET priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(priority, req.params.id);
    }
    res.json({ success: true });
  });

  app.get("/api/admin/support/:id/messages", (req, res) => {
    const messages = db.prepare(`
      SELECT m.*, u.name as sender_name
      FROM ticket_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.ticket_id = ?
      ORDER BY m.created_at ASC
    `).all(req.params.id);
    res.json(messages);
  });

  app.post("/api/admin/support/:id/messages", (req, res) => {
    const { sender_id, message, is_admin } = req.body;
    db.prepare(`
      INSERT INTO ticket_messages (ticket_id, sender_id, message, is_admin)
      VALUES (?, ?, ?, ?)
    `).run(req.params.id, sender_id, message, is_admin ? 1 : 0);
    
    db.prepare("UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    
    res.json({ success: true });
  });

  app.get("/api/admin/monitoring", (req, res) => {
    const totalTransactions = db.prepare("SELECT count(*) as count FROM transactions").get() as any;
    const todayTransactions = db.prepare("SELECT count(*) as count FROM transactions WHERE date(timestamp) = date('now')").get() as any;
    const activeUsers = db.prepare("SELECT count(*) as count FROM users WHERE status = 'active'").get() as any;
    const totalStores = db.prepare("SELECT count(*) as count FROM stores").get() as any;
    
    const recentActivity = db.prepare(`
      SELECT t.id, 'venda' as type, total_amount as value, timestamp, s.name as store_name
      FROM transactions t
      JOIN stores s ON t.store_id = s.id
      ORDER BY timestamp DESC LIMIT 15
    `).all();

    const systemAlerts = [];
    
    // Check for low stock products across all stores
    const lowStockCount = db.prepare("SELECT count(*) as count FROM products WHERE stock <= min_stock").get() as any;
    if (lowStockCount.count > 0) {
      systemAlerts.push({
        level: 'warning',
        message: `${lowStockCount.count} produtos com stock baixo detectados no sistema.`,
        timestamp: new Date().toISOString()
      });
    }

    // Check for expired licenses
    const expiredCount = db.prepare("SELECT count(*) as count FROM licenses WHERE status = 'active' AND date(expiry_date) < date('now')").get() as any;
    if (expiredCount.count > 0) {
      systemAlerts.push({
        level: 'danger',
        message: `${expiredCount.count} licenças expiradas ainda marcadas como activas.`,
        timestamp: new Date().toISOString()
      });
    }

    const memoryUsage = process.memoryUsage();

    res.json({
      health: "ok",
      uptime: process.uptime(),
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024)
      },
      stats: {
        totalTransactions: totalTransactions.count,
        todayTransactions: todayTransactions.count,
        activeUsers: activeUsers.count,
        totalStores: totalStores.count
      },
      recentActivity,
      systemAlerts
    });
  });

  app.get("/api/admin/reports", (req, res) => {
    // Revenue by month (last 6 months)
    const revenueByMonth = db.prepare(`
      SELECT strftime('%m', timestamp) as month, SUM(total_amount) as total
      FROM transactions
      WHERE timestamp >= date('now', '-6 months')
      GROUP BY month
      ORDER BY month ASC
    `).all();

    // Client growth (last 6 months)
    const clientGrowth = db.prepare(`
      SELECT strftime('%m', created_at) as month, COUNT(*) as count
      FROM users
      WHERE role = 'owner' AND created_at >= date('now', '-6 months')
      GROUP BY month
      ORDER BY month ASC
    `).all();

    // Licenses by plan
    const licensesByPlan = db.prepare(`
      SELECT plan_type as name, COUNT(*) as value
      FROM licenses
      WHERE status = 'active'
      GROUP BY plan_type
    `).all();

    // Support tickets by status
    const ticketsByStatus = db.prepare(`
      SELECT status as name, COUNT(*) as value
      FROM support_tickets
      GROUP BY status
    `).all();

    res.json({
      revenueByMonth,
      clientGrowth,
      licensesByPlan,
      ticketsByStatus
    });
  });

  app.get("/api/admin/plans", (req, res) => {
    const plans = db.prepare("SELECT * FROM system_plans").all();
    res.json(plans);
  });

  app.post("/api/admin/plans", (req, res) => {
    const { name, price, max_stores, max_products, features } = req.body;
    db.prepare("INSERT INTO system_plans (name, price, max_stores, max_products, features) VALUES (?, ?, ?, ?, ?)").run(name, price, max_stores, max_products, JSON.stringify(features));
    res.json({ success: true });
  });

  app.put("/api/admin/plans/:id", (req, res) => {
    const { name, price, max_stores, max_products, features } = req.body;
    db.prepare("UPDATE system_plans SET name = ?, price = ?, max_stores = ?, max_products = ?, features = ? WHERE id = ?").run(name, price, max_stores, max_products, JSON.stringify(features), req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/admin/plans/:id", (req, res) => {
    db.prepare("DELETE FROM system_plans WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/admin/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM system_settings").all();
    const settingsObj = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsObj);
  });

  app.get("/api/admin/finance", (req, res) => {
    const payments = db.prepare(`
      SELECT p.*, u.name as client_name, pl.name as plan_name 
      FROM system_payments p
      JOIN users u ON p.user_id = u.id
      JOIN system_plans pl ON p.plan_id = pl.id
      ORDER BY p.timestamp DESC
    `).all() as any[];

    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);
    const thisYear = today.substring(0, 4);

    const stats = {
      totalToday: payments.filter(p => p.timestamp.startsWith(today)).reduce((sum, p) => sum + p.amount, 0),
      totalMonth: payments.filter(p => p.timestamp.startsWith(thisMonth)).reduce((sum, p) => sum + p.amount, 0),
      totalYear: payments.filter(p => p.timestamp.startsWith(thisYear)).reduce((sum, p) => sum + p.amount, 0),
      count: payments.length
    };

    const pendingPayments = db.prepare(`
      SELECT u.id as user_id, s.id as store_id, u.name as client_name, s.name as store_name, s.license_expiry
      FROM users u
      JOIN stores s ON u.id = s.owner_id
      WHERE s.license_status = 'expired' OR s.license_expiry < date('now', '+7 days')
    `).all();

    const revenueByMonth = db.prepare(`
      SELECT strftime('%Y-%m', timestamp) as month, SUM(amount) as total
      FROM system_payments
      GROUP BY month
      ORDER BY month DESC
    `).all();

    const revenueByPlan = db.prepare(`
      SELECT pl.name as plan_name, SUM(p.amount) as total
      FROM system_payments p
      JOIN system_plans pl ON p.plan_id = pl.id
      GROUP BY plan_name
    `).all();

    const revenueByClient = db.prepare(`
      SELECT u.name as client_name, SUM(p.amount) as total
      FROM system_payments p
      JOIN users u ON p.user_id = u.id
      GROUP BY client_name
    `).all();

    const methods = db.prepare(`
      SELECT payment_method, SUM(amount) as total, COUNT(*) as count
      FROM system_payments
      GROUP BY payment_method
    `).all();

    res.json({
      payments,
      stats,
      pendingPayments,
      reports: {
        byMonth: revenueByMonth,
        byPlan: revenueByPlan,
        byClient: revenueByClient
      },
      methods
    });
  });

  app.post("/api/admin/settings", (req, res) => {
    const settings = req.body;
    const insert = db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)");
    const transaction = db.transaction((settings) => {
      for (const [key, value] of Object.entries(settings)) {
        insert.run(key, String(value));
      }
    });
    transaction(settings);
    res.json({ success: true });
  });

  app.get("/api/admin/stores", (req, res) => {
    const stores = db.prepare(`
      SELECT s.*, u.name as owner_name 
      FROM stores s 
      JOIN users u ON s.owner_id = u.id
    `).all();
    res.json(stores);
  });

  app.get("/api/admin/transactions", (req, res) => {
    const transactions = db.prepare(`
      SELECT t.*, s.name as store_name, u.name as seller_name 
      FROM transactions t 
      JOIN stores s ON t.store_id = s.id
      JOIN users u ON t.seller_id = u.id
      ORDER BY t.timestamp DESC
    `).all();
    res.json(transactions);
  });

  app.put("/api/profile/:id", (req, res) => {
    const { name, email, username, phone, nif, address, company_name, password } = req.body;
    const trimmedUsername = username?.trim();
    const trimmedEmail = email?.trim();
    
    try {
      if (password) {
        db.prepare("UPDATE users SET name = ?, email = ?, username = ?, phone = ?, nif = ?, address = ?, company_name = ?, password = ? WHERE id = ?").run(name, trimmedEmail || null, trimmedUsername || null, phone, nif, address, company_name, password, req.params.id);
      } else {
        db.prepare("UPDATE users SET name = ?, email = ?, username = ?, phone = ?, nif = ?, address = ?, company_name = ? WHERE id = ?").run(name, trimmedEmail || null, trimmedUsername || null, phone, nif, address, company_name, req.params.id);
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Owner Routes
  app.get("/api/owner/stores/:storeId/cash-registers", (req, res) => {
    const { storeId } = req.params;
    const registers = db.prepare(`
      SELECT cr.*, 
             s.status as session_status,
             s.seller_id as current_seller_id,
             u.name as current_seller_name,
             s.id as current_session_id
      FROM cash_registers cr 
      LEFT JOIN cashier_sessions s ON s.cash_register_id = cr.id AND s.status = 'open'
      LEFT JOIN users u ON s.seller_id = u.id
      WHERE cr.store_id = ?
    `).all(storeId);
    res.json(registers);
  });

  app.put("/api/seller/select-register", (req, res) => {
    const { user_id, cash_register_id } = req.body;
    db.prepare("UPDATE users SET cash_register_id = ? WHERE id = ?").run(cash_register_id, user_id);
    res.json({ success: true });
  });

  app.post("/api/owner/stores/:storeId/cash-registers", (req, res) => {
    const { storeId } = req.params;
    const { name, default_initial_balance, max_limit } = req.body;
    const code = `CX-${Math.floor(1000 + Math.random() * 9000)}`;
    const result = db.prepare(`
      INSERT INTO cash_registers (store_id, name, code, default_initial_balance, max_limit)
      VALUES (?, ?, ?, ?, ?)
    `).run(storeId, name, code, default_initial_balance, max_limit);
    res.json({ id: result.lastInsertRowid, code });
  });

  app.put("/api/owner/stores/cash-registers/:id", (req, res) => {
    const { id } = req.params;
    const { name, default_initial_balance, max_limit } = req.body;
    db.prepare(`
      UPDATE cash_registers SET name = ?, default_initial_balance = ?, max_limit = ?
      WHERE id = ?
    `).run(name, default_initial_balance, max_limit, id);
    res.json({ success: true });
  });

  app.delete("/api/owner/stores/cash-registers/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM cash_registers WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/owner/stores/:ownerId", (req, res) => {
    const stores = db.prepare(`
      SELECT s.*, 
        (SELECT count(*) FROM staff st WHERE st.store_id = s.id) as staff_count,
        (SELECT SUM(total_amount) FROM transactions t WHERE t.store_id = s.id AND date(t.timestamp) = date('now')) as today_sales
      FROM stores s 
      WHERE s.owner_id = ?
    `).all(req.params.ownerId) as any[];
    
    res.json(stores.map(s => ({
      ...s,
      bank_accounts: s.bank_accounts ? (typeof s.bank_accounts === 'string' ? JSON.parse(s.bank_accounts) : s.bank_accounts) : []
    })));
  });

  app.post("/api/owner/stores", (req, res) => {
    const { owner_id, name, address, phone, email, nif, logo_url, bank_accounts } = req.body;
    
    try {
      // Check limits
      const activeLicenses = db.prepare(`
        SELECT features FROM licenses 
        WHERE user_id = ? AND status = 'active' AND expiry_date >= DATE('now')
      `).all(owner_id) as any[];

      let maxStores = 1; // Default for new users without license
      
      if (activeLicenses.length > 0) {
        maxStores = activeLicenses.reduce((max, lic) => {
          try {
            const feat = typeof lic.features === 'string' ? JSON.parse(lic.features) : (lic.features || []);
            return Math.max(max, feat.max_stores || 0);
          } catch (e) {
            return max;
          }
        }, 0);
      }

      const currentStores = db.prepare("SELECT COUNT(*) as count FROM stores WHERE owner_id = ?").get(owner_id) as any;
      
      if (currentStores.count >= maxStores) {
        return res.status(403).json({ 
          error: `Limite de lojas atingido (${maxStores}). Por favor, atualize o seu plano.` 
        });
      }

      db.prepare(`
        INSERT INTO stores (owner_id, name, address, phone, email, nif, logo_url, license_expiry, bank_accounts) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(owner_id, name, address, phone, email, nif, logo_url, "2026-12-31", JSON.stringify(bank_accounts || []));
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/owner/stores/:storeId", (req, res) => {
    const { name, address, phone, email, nif, logo_url, status, bank_accounts } = req.body;
    db.prepare(`
      UPDATE stores 
      SET name = ?, address = ?, phone = ?, email = ?, nif = ?, logo_url = ?, status = ?, bank_accounts = ? 
      WHERE id = ?
    `).run(name, address, phone, email, nif, logo_url, status, JSON.stringify(bank_accounts || []), req.params.storeId);
    res.json({ success: true });
  });

  // --- Fiscal Documents Endpoints ---
  app.get("/api/owner/generated-files/:ownerId", (req, res) => {
    try {
      const files = db.prepare("SELECT id, owner_id, name, type, generated_by, created_at FROM generated_files WHERE owner_id = ? ORDER BY created_at DESC").all(req.params.ownerId) as any[];
      res.json(files);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/owner/download-file/:fileId", (req, res) => {
    try {
      const file = db.prepare("SELECT * FROM generated_files WHERE id = ?").get(req.params.fileId) as any;
      if (!file) return res.status(404).json({ error: "Ficheiro não encontrado." });
      
      res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
      res.send(file.file_data);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/owner/generate-saft", (req, res) => {
    const { owner_id, store_id, start_date, end_date, doc_type, user_name } = req.body;
    try {
      // Get all store IDs for this owner if no specific store is selected
      let storeIds: number[] = [];
      if (store_id) {
        storeIds = [parseInt(store_id)];
      } else {
        const stores = db.prepare("SELECT id FROM stores WHERE owner_id = ?").all(owner_id) as { id: number }[];
        storeIds = stores.map(s => s.id);
      }

      if (storeIds.length === 0) {
        return res.status(400).json({ error: "Nenhuma loja encontrada para este utilizador." });
      }

      const placeholders = storeIds.map(() => '?').join(',');

      // Fetch invoices from credit_invoices (FR, FT)
      let ciQuery = `SELECT * FROM credit_invoices WHERE store_id IN (${placeholders})`;
      let ciParams: any[] = [...storeIds];
      ciQuery += " AND date(created_at) BETWEEN ? AND ?";
      ciParams.push(start_date, end_date);
      if (doc_type && doc_type !== 'FS') {
        ciQuery += " AND doc_type = ?";
        ciParams.push(doc_type);
      } else if (doc_type === 'FS') {
        // If FS is requested, credit_invoices should return nothing
        ciQuery += " AND 1=0";
      }
      const creditInvoices = db.prepare(ciQuery).all(...ciParams) as any[];

      // Fetch invoices from transactions (FS)
      let tInvoices: any[] = [];
      if (!doc_type || doc_type === 'FS') {
        let tQuery = `SELECT * FROM transactions WHERE store_id IN (${placeholders})`;
        let tParams: any[] = [...storeIds];
        tQuery += " AND date(timestamp) BETWEEN ? AND ?";
        tParams.push(start_date, end_date);
        tInvoices = db.prepare(tQuery).all(...tParams) as any[];
      }

      // Combine and format XML
      let invoicesXml = "";
      
      creditInvoices.forEach(inv => {
        invoicesXml += `
      <Invoice>
        <InvoiceNo>${inv.invoice_number}</InvoiceNo>
        <DocumentStatus>
          <InvoiceStatus>N</InvoiceStatus>
          <InvoiceStatusDate>${inv.created_at}</InvoiceStatusDate>
          <SourceID>${inv.seller_id}</SourceID>
          <SourceBilling>P</SourceBilling>
        </DocumentStatus>
        <Hash>...</Hash>
        <InvoiceDate>${inv.invoice_date || (inv.created_at ? inv.created_at.split(' ')[0] : start_date)}</InvoiceDate>
        <InvoiceType>${inv.doc_type}</InvoiceType>
        <CustomerID>${inv.client_name}</CustomerID>
        <Line>
          <LineNumber>1</LineNumber>
          <Description>Venda de Produtos/Serviços</Description>
          <Quantity>1</Quantity>
          <UnitPrice>${inv.total_amount}</UnitPrice>
          <CreditAmount>${inv.total_amount}</CreditAmount>
        </Line>
        <DocumentTotals>
          <TaxPayable>${inv.tax_amount || 0}</TaxPayable>
          <NetTotal>${inv.total_amount - (inv.tax_amount || 0)}</NetTotal>
          <GrossTotal>${inv.total_amount}</GrossTotal>
        </DocumentTotals>
      </Invoice>`;
      });

      tInvoices.forEach(inv => {
        invoicesXml += `
      <Invoice>
        <InvoiceNo>${inv.invoice_number}</InvoiceNo>
        <DocumentStatus>
          <InvoiceStatus>N</InvoiceStatus>
          <InvoiceStatusDate>${inv.timestamp}</InvoiceStatusDate>
          <SourceID>${inv.seller_id}</SourceID>
          <SourceBilling>P</SourceBilling>
        </DocumentStatus>
        <Hash>...</Hash>
        <InvoiceDate>${inv.timestamp ? inv.timestamp.split(' ')[0] : start_date}</InvoiceDate>
        <InvoiceType>FS</InvoiceType>
        <CustomerID>${inv.client_name || 'Consumidor Final'}</CustomerID>
        <Line>
          <LineNumber>1</LineNumber>
          <Description>Venda Simplificada (PDV)</Description>
          <Quantity>1</Quantity>
          <UnitPrice>${inv.total_amount}</UnitPrice>
          <CreditAmount>${inv.total_amount}</CreditAmount>
        </Line>
        <DocumentTotals>
          <TaxPayable>${inv.tax_amount || 0}</TaxPayable>
          <NetTotal>${inv.total_amount - (inv.tax_amount || 0)}</NetTotal>
          <GrossTotal>${inv.total_amount}</GrossTotal>
        </DocumentTotals>
      </Invoice>`;
      });

      const totalCredit = (creditInvoices.reduce((sum, inv) => sum + inv.total_amount, 0) + tInvoices.reduce((sum, inv) => sum + inv.total_amount, 0)).toFixed(2);

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:AO:1.01_01">
  <Header>
    <AuditFileVersion>1.01_01</AuditFileVersion>
    <CompanyID>${owner_id}</CompanyID>
    <TaxRegistrationNumber>...</TaxRegistrationNumber>
    <StartDate>${start_date}</StartDate>
    <EndDate>${end_date}</EndDate>
    <CurrencyCode>AOA</CurrencyCode>
    <DateCreated>${new Date().toISOString().split('T')[0]}</DateCreated>
  </Header>
  <SourceDocuments>
    <SalesInvoices>
      <NumberOfEntries>${creditInvoices.length + tInvoices.length}</NumberOfEntries>
      <TotalDebit>0.00</TotalDebit>
      <TotalCredit>${totalCredit}</TotalCredit>
      ${invoicesXml}
    </SalesInvoices>
  </SourceDocuments>
</AuditFile>`;

      const fileName = `SAFT_AO_${new Date().toISOString().replace(/[:.]/g, '-')}.xml`;
      db.prepare("INSERT INTO generated_files (owner_id, name, type, generated_by, file_data) VALUES (?, ?, ?, ?, ?)").run(owner_id, fileName, 'SAFT', user_name, Buffer.from(xml));
      
      res.json({ success: true, fileName });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/owner/export", (req, res) => {
    const { owner_id, export_type, store_id, user_name } = req.body;
    try {
      let data: any[] = [];
      let fileName = "";
      let type = "Excel";
      
      if (export_type === 'sales') {
        data = db.prepare("SELECT * FROM transactions WHERE store_id = ?").all(store_id) as any[];
        fileName = `Vendas_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
      } else if (export_type === 'purchases') {
        data = db.prepare("SELECT * FROM purchases WHERE store_id = ?").all(store_id) as any[];
        fileName = `Compras_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
      } else if (export_type === 'clients') {
        data = db.prepare("SELECT * FROM users WHERE role = 'client'").all() as any[];
        fileName = `Clientes_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
      } else if (export_type === 'products') {
        data = db.prepare("SELECT * FROM products WHERE store_id = ?").all(store_id) as any[];
        fileName = `Produtos_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
      } else if (export_type === 'invoices') {
        // Mock PDF export
        type = "PDF";
        fileName = `Faturas_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`;
        const dummyPdf = Buffer.from("%PDF-1.4\n1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R>> endobj\n4 0 obj <</Length 44>> stream\nBT /F1 24 Tf 100 700 Td (Faturas Exportadas) Tj ET\nendstream endobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000212 00000 n\ntrailer <</Size 5 /Root 1 0 R>>\nstartxref\n306\n%%EOF");
        db.prepare("INSERT INTO generated_files (owner_id, name, type, generated_by, file_data) VALUES (?, ?, ?, ?, ?)").run(owner_id, fileName, type, user_name, dummyPdf);
        return res.json({ success: true, fileName });
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data");
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      db.prepare("INSERT INTO generated_files (owner_id, name, type, generated_by, file_data) VALUES (?, ?, ?, ?, ?)").run(owner_id, fileName, type, user_name, buffer);
      
      res.json({ success: true, fileName });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // --- Owner Support Endpoints ---
  app.get("/api/owner/support/:userId", (req, res) => {
    const tickets = db.prepare(`
      SELECT t.*, u.name as client_name
      FROM support_tickets t
      JOIN users u ON t.user_id = u.id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC
    `).all(req.params.userId);
    res.json(tickets);
  });

  app.post("/api/owner/support", (req, res) => {
    const { user_id, subject, description, priority } = req.body;
    const result = db.prepare(`
      INSERT INTO support_tickets (user_id, subject, description, priority, status)
      VALUES (?, ?, ?, ?, 'open')
    `).run(user_id, subject, description, priority || 'medium');
    res.json({ success: true, ticketId: result.lastInsertRowid });
  });

  app.get("/api/owner/support/ticket/:id/messages", (req, res) => {
    const messages = db.prepare(`
      SELECT m.*, u.name as sender_name
      FROM ticket_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.ticket_id = ?
      ORDER BY m.created_at ASC
    `).all(req.params.id);
    res.json(messages);
  });

  app.post("/api/owner/support/ticket/:id/messages", (req, res) => {
    const { sender_id, message } = req.body;
    db.prepare(`
      INSERT INTO ticket_messages (ticket_id, sender_id, message, is_admin)
      VALUES (?, ?, ?, 0)
    `).run(req.params.id, sender_id, message);
    
    db.prepare("UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    
    res.json({ success: true });
  });

  app.get("/api/owner/store-details/:storeId", (req, res) => {
    const storeId = req.params.storeId;
    
    const store = db.prepare("SELECT * FROM stores WHERE id = ?").get(storeId);
    
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(total_amount) as total_revenue,
        COUNT(DISTINCT seller_id) as active_sellers
      FROM transactions 
      WHERE store_id = ? AND date(timestamp) = date('now')
    `).get(storeId) as any;

    const lowStock = db.prepare("SELECT count(*) as count FROM products WHERE store_id = ? AND stock <= min_stock").get(storeId) as any;
    const staffCount = db.prepare("SELECT count(*) as count FROM staff WHERE store_id = ?").get(storeId) as any;

    res.json({
      store,
      dashboard: {
        todaySales: stats?.total_transactions || 0,
        todayRevenue: stats?.total_revenue || 0,
        activeSellers: stats?.active_sellers || 0,
        lowStockCount: lowStock?.count || 0,
        staffCount: staffCount?.count || 0
      }
    });
  });

  app.get("/api/owner/staff/:storeId", (req, res) => {
    const staff = db.prepare(`
      SELECT s.*, u.name, u.email, u.username, u.status 
      FROM staff s 
      JOIN users u ON s.user_id = u.id 
      WHERE s.store_id = ?
    `).all(req.params.storeId);
    res.json(staff);
  });

  app.post("/api/owner/staff", (req, res) => {
    const { store_id, name, email, username, password, salary, shift_info } = req.body;
    const trimmedUsername = username?.trim();
    const trimmedEmail = email?.trim();
    
    if (!trimmedUsername || !password || !name) {
      return res.status(400).json({ error: "Nome, utilizador e palavra-passe são obrigatórios." });
    }

    try {
      // Check if username already exists
      const existingUser = db.prepare("SELECT id FROM users WHERE username = ? OR (email = ? AND email IS NOT NULL)").get(trimmedUsername, trimmedEmail || '___never_match___');
      if (existingUser) {
        return res.status(400).json({ error: "Este nome de utilizador ou email já está em uso." });
      }

      db.transaction(() => {
        const userResult = db.prepare("INSERT INTO users (email, username, password, name, role) VALUES (?, ?, ?, ?, 'seller')").run(trimmedEmail || null, trimmedUsername || null, password, name);
        db.prepare("INSERT INTO staff (store_id, user_id, salary, shift_info) VALUES (?, ?, ?, ?)").run(store_id, userResult.lastInsertRowid, salary, shift_info);
      })();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Staff creation error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/owner/staff/:staffId", (req, res) => {
    const { salary, shift_info, name, email, username, password } = req.body;
    const trimmedUsername = username?.trim();
    const trimmedEmail = email?.trim();
    
    try {
      db.transaction(() => {
        const staff = db.prepare("SELECT user_id FROM staff WHERE id = ?").get(req.params.staffId) as any;
        if (staff) {
          if (password) {
            db.prepare("UPDATE users SET name = ?, email = ?, username = ?, password = ? WHERE id = ?").run(name, trimmedEmail || null, trimmedUsername || null, password, staff.user_id);
          } else {
            db.prepare("UPDATE users SET name = ?, email = ?, username = ? WHERE id = ?").run(name, trimmedEmail || null, trimmedUsername || null, staff.user_id);
          }
          db.prepare("UPDATE staff SET salary = ?, shift_info = ? WHERE id = ?").run(salary, shift_info, req.params.staffId);
        }
      })();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/owner/staff/:staffId/status", (req, res) => {
    const { status } = req.body;
    try {
      const staff = db.prepare("SELECT user_id FROM staff WHERE id = ?").get(req.params.staffId) as any;
      if (staff) {
        db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, staff.user_id);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Colaborador não encontrado" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/owner/staff/:staffId", (req, res) => {
    try {
      db.transaction(() => {
        const staff = db.prepare("SELECT user_id FROM staff WHERE id = ?").get(req.params.staffId) as any;
        if (staff) {
          db.prepare("DELETE FROM staff WHERE id = ?").run(req.params.staffId);
          // Suspend the user so they can't login anymore even if the record stays for history
          db.prepare("UPDATE users SET status = 'suspended' WHERE id = ?").run(staff.user_id);
        }
      })();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Services Routes
  app.get("/api/owner/services/:ownerId", (req, res) => {
    const services = db.prepare(`
      SELECT s.*, st.name as store_name 
      FROM services s 
      LEFT JOIN stores st ON s.store_id = st.id 
      WHERE s.owner_id = ?
    `).all(req.params.ownerId);
    res.json(services);
  });

  app.post("/api/owner/services", (req, res) => {
    const { owner_id, store_id, name, code, description, price, availability_condition, show_in_pos } = req.body;
    db.prepare(`
      INSERT INTO services (owner_id, store_id, name, code, description, price, availability_condition, show_in_pos) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(owner_id, store_id, name, code, description, price, availability_condition, show_in_pos);
    res.json({ success: true });
  });

  app.put("/api/owner/services/:id", (req, res) => {
    const { store_id, name, code, description, price, availability_condition, show_in_pos } = req.body;
    db.prepare(`
      UPDATE services 
      SET store_id = ?, name = ?, code = ?, description = ?, price = ?, availability_condition = ?, show_in_pos = ? 
      WHERE id = ?
    `).run(store_id, name, code, description, price, availability_condition, show_in_pos, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/owner/services/:id", (req, res) => {
    db.prepare("DELETE FROM services WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/seller/services/:storeId", (req, res) => {
    const services = db.prepare("SELECT * FROM services WHERE store_id = ? AND show_in_pos = 1").all(req.params.storeId);
    res.json(services);
  });

  // HR Routes
  app.get("/api/owner/hr/roles/:ownerId", (req, res) => {
    const roles = db.prepare("SELECT * FROM hr_roles WHERE owner_id = ?").all(req.params.ownerId);
    res.json(roles);
  });

  app.post("/api/owner/hr/roles", (req, res) => {
    const { owner_id, name, base_role, permissions } = req.body;
    db.prepare("INSERT INTO hr_roles (owner_id, name, base_role, permissions) VALUES (?, ?, ?, ?)").run(owner_id, name, base_role || 'seller', JSON.stringify(permissions));
    res.json({ success: true });
  });

  app.put("/api/owner/hr/roles/:id", (req, res) => {
    const { name, base_role, permissions } = req.body;
    db.prepare("UPDATE hr_roles SET name = ?, base_role = ?, permissions = ? WHERE id = ?").run(name, base_role || 'seller', JSON.stringify(permissions), req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/owner/hr/roles/:id", (req, res) => {
    db.prepare("DELETE FROM hr_roles WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/owner/hr/employees/:ownerId", (req, res) => {
    const employees = db.prepare(`
      SELECT u.*, r.name as role_name, s.base_salary, s.bonuses, s.discounts, st.name as store_name
      FROM users u
      LEFT JOIN hr_roles r ON u.role_id = r.id
      LEFT JOIN hr_salaries s ON u.id = s.user_id
      LEFT JOIN stores st ON u.store_id = st.id
      WHERE u.role IN ('seller', 'manager') AND (u.id IN (SELECT user_id FROM staff WHERE store_id IN (SELECT id FROM stores WHERE owner_id = ?)) OR u.store_id IN (SELECT id FROM stores WHERE owner_id = ?))
    `).all(req.params.ownerId, req.params.ownerId);
    res.json(employees);
  });

  app.post("/api/owner/hr/employees", (req, res) => {
    const { name, email, username, password, role: bodyRole, store_id, role_id, custom_permissions, base_salary, cash_register_id } = req.body;
    try {
      db.transaction(() => {
        let finalRole = bodyRole || 'seller';
        if (role_id) {
          const hrRole = db.prepare("SELECT base_role FROM hr_roles WHERE id = ?").get(role_id) as any;
          if (hrRole) finalRole = hrRole.base_role;
        }

        const result = db.prepare("INSERT INTO users (name, email, username, password, role, store_id, role_id, custom_permissions, status, cash_register_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
          name, email, username, password, finalRole, store_id, role_id, JSON.stringify(custom_permissions), 'active', cash_register_id
        );
        const userId = result.lastInsertRowid;
        const salary = Number(base_salary) || 0;
        db.prepare("INSERT OR REPLACE INTO hr_salaries (user_id, base_salary) VALUES (?, ?)").run(userId, salary);
        if (store_id) {
          db.prepare("INSERT OR REPLACE INTO staff (store_id, user_id, salary) VALUES (?, ?, ?)").run(store_id, userId, salary);
        }
      })();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/owner/hr/employees/:id", (req, res) => {
    const { name, email, username, role: bodyRole, store_id, role_id, custom_permissions, base_salary, status, cash_register_id } = req.body;
    try {
      db.transaction(() => {
        let finalRole = bodyRole || 'seller';
        if (role_id) {
          const hrRole = db.prepare("SELECT base_role FROM hr_roles WHERE id = ?").get(role_id) as any;
          if (hrRole) finalRole = hrRole.base_role;
        }

        db.prepare("UPDATE users SET name = ?, email = ?, username = ?, role = ?, store_id = ?, role_id = ?, custom_permissions = ?, status = ?, cash_register_id = ? WHERE id = ?").run(
          name, email, username, finalRole, store_id, role_id, JSON.stringify(custom_permissions), status, cash_register_id, req.params.id
        );
        const salary = Number(base_salary) || 0;
        db.prepare("INSERT OR REPLACE INTO hr_salaries (user_id, base_salary) VALUES (?, ?)").run(req.params.id, salary);
        if (store_id) {
          db.prepare("INSERT OR REPLACE INTO staff (store_id, user_id, salary) VALUES (?, ?, ?)").run(store_id, req.params.id, salary);
        }
      })();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/owner/hr/employees/:id", (req, res) => {
    try {
      db.transaction(() => {
        db.prepare("DELETE FROM staff WHERE user_id = ?").run(req.params.id);
        db.prepare("DELETE FROM hr_salary_payments WHERE salary_id IN (SELECT id FROM hr_salaries WHERE user_id = ?)").run(req.params.id);
        db.prepare("DELETE FROM hr_salaries WHERE user_id = ?").run(req.params.id);
        db.prepare("DELETE FROM hr_attendance WHERE user_id = ?").run(req.params.id);
        db.prepare("DELETE FROM hr_vacations WHERE user_id = ?").run(req.params.id);
        db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
      })();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/owner/hr/employees/:id/status", (req, res) => {
    const { status } = req.body;
    try {
      db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/owner/hr/salaries/:ownerId", (req, res) => {
    const salaries = db.prepare(`
      SELECT s.*, u.name as employee_name, r.name as role_name
      FROM hr_salaries s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN hr_roles r ON u.role_id = r.id
      WHERE u.role IN ('seller', 'manager') AND (u.id IN (SELECT user_id FROM staff WHERE store_id IN (SELECT id FROM stores WHERE owner_id = ?)) OR u.store_id IN (SELECT id FROM stores WHERE owner_id = ?))
    `).all(req.params.ownerId, req.params.ownerId);
    res.json(salaries);
  });

  app.get("/api/owner/hr/salaries/payments/:ownerId", (req, res) => {
    const payments = db.prepare(`
      SELECT p.*, u.name as employee_name, s.base_salary
      FROM hr_salary_payments p
      JOIN hr_salaries s ON p.salary_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE u.role IN ('seller', 'manager') AND (u.id IN (SELECT user_id FROM staff WHERE store_id IN (SELECT id FROM stores WHERE owner_id = ?)) OR u.store_id IN (SELECT id FROM stores WHERE owner_id = ?))
      ORDER BY p.timestamp DESC
    `).all(req.params.ownerId, req.params.ownerId);
    res.json(payments);
  });

  app.post("/api/owner/hr/salaries/payment", (req, res) => {
    const { salary_id, amount, bonus, type, description, month } = req.body;
    
    try {
      // Check for duplicate payment for the same month
      const existingPayment = db.prepare("SELECT id FROM hr_salary_payments WHERE salary_id = ? AND month = ?").get(salary_id, month);
      if (existingPayment) {
        return res.status(400).json({ error: "Já existe um pagamento registado para este mês." });
      }

      // Check if amount is at least the base salary
      const salary = db.prepare("SELECT base_salary FROM hr_salaries WHERE id = ?").get(salary_id) as any;
      if (salary && amount < salary.base_salary) {
        return res.status(400).json({ error: `O valor do pagamento não pode ser inferior ao salário base (${salary.base_salary} Kz).` });
      }

      db.prepare("INSERT INTO hr_salary_payments (salary_id, amount, bonus, type, description, month) VALUES (?, ?, ?, ?, ?, ?)").run(salary_id, amount, bonus || 0, type, description, month);
      if (type === 'full_payment') {
        db.prepare("UPDATE hr_salaries SET last_payment_date = CURRENT_TIMESTAMP WHERE id = ?").run(salary_id);
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/owner/hr/attendance/:ownerId", (req, res) => {
    const attendance = db.prepare(`
      SELECT a.*, u.name as employee_name, st.name as store_name
      FROM hr_attendance a
      JOIN users u ON a.user_id = u.id
      JOIN stores st ON a.store_id = st.id
      WHERE st.owner_id = ?
    `).all(req.params.ownerId);
    res.json(attendance);
  });

  app.post("/api/owner/hr/attendance", (req, res) => {
    const { user_id, store_id, entry_time, exit_time, status, date, notes } = req.body;
    db.prepare("INSERT INTO hr_attendance (user_id, store_id, entry_time, exit_time, status, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      user_id, store_id, entry_time, exit_time, status, date, notes
    );
    res.json({ success: true });
  });

  app.get("/api/owner/hr/vacations/:ownerId", (req, res) => {
    const vacations = db.prepare(`
      SELECT v.*, u.name as employee_name
      FROM hr_vacations v
      JOIN users u ON v.user_id = u.id
      WHERE u.id IN (SELECT user_id FROM staff WHERE store_id IN (SELECT id FROM stores WHERE owner_id = ?))
    `).all(req.params.ownerId);
    res.json(vacations);
  });

  app.post("/api/owner/hr/vacations", (req, res) => {
    const { user_id, start_date, end_date, days_count, notes } = req.body;
    db.prepare("INSERT INTO hr_vacations (user_id, start_date, end_date, days_count, notes) VALUES (?, ?, ?, ?, ?)").run(
      user_id, start_date, end_date, days_count, notes
    );
    res.json({ success: true });
  });

  app.put("/api/owner/hr/vacations/:id/status", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE hr_vacations SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/owner/staff-performance/:storeId", (req, res) => {
    const performance = db.prepare(`
      SELECT 
        u.id,
        u.name,
        COUNT(t.id) as total_sales,
        SUM(t.total_amount) as total_revenue
      FROM staff s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN transactions t ON t.seller_id = u.id AND t.store_id = s.store_id
      WHERE s.store_id = ?
      GROUP BY u.id
    `).all(req.params.storeId);
    res.json(performance);
  });

  app.get("/api/owner/products/:storeId", (req, res) => {
    const storeId = req.params.storeId;
    const ownerId = req.query.ownerId;

    if (storeId === 'all' && ownerId) {
      const products = db.prepare(`
        SELECT p.*, s.name as store_name,
          (SELECT pr.discount_percent FROM promotion_products pp 
           JOIN promotions pr ON pp.promotion_id = pr.id 
           WHERE pp.product_id = p.id AND date('now') BETWEEN date(pr.start_date) AND date(pr.end_date)
           LIMIT 1) as discount_percent
        FROM products p 
        JOIN stores s ON p.store_id = s.id 
        WHERE s.owner_id = ?
      `).all(ownerId);
      return res.json(products);
    }

    const products = db.prepare(`
      SELECT p.*,
        (SELECT pr.discount_percent FROM promotion_products pp 
         JOIN promotions pr ON pp.promotion_id = pr.id 
         WHERE pp.product_id = p.id AND date('now') BETWEEN date(pr.start_date) AND date(pr.end_date)
         LIMIT 1) as discount_percent
      FROM products p 
      WHERE p.store_id = ?
    `).all(storeId);
    res.json(products);
  });

  app.get("/api/owner/dashboard-stats/:storeId", (req, res) => {
    const storeId = req.params.storeId;
    const ownerId = req.query.ownerId;
    
    let whereClause = "store_id = ?";
    let params: any[] = [storeId];

    if (storeId === 'all' && ownerId) {
      whereClause = "store_id IN (SELECT id FROM stores WHERE owner_id = ?)";
      params = [ownerId];
    }
    
    // Sales of the day
    const todaySales = db.prepare(`
      SELECT SUM(total_amount) as total 
      FROM transactions 
      WHERE ${whereClause} AND date(timestamp) = date('now')
    `).get(...params) as any;

    // Low stock count (below 5)
    const lowStock = db.prepare(`
      SELECT count(*) as count 
      FROM products 
      WHERE ${whereClause} AND stock <= min_stock
    `).get(...params) as any;

    // Staff count
    const staffCount = db.prepare(`
      SELECT count(*) as count 
      FROM staff 
      WHERE ${whereClause}
    `).get(...params) as any;

    res.json({
      todaySales: todaySales?.total || 0,
      lowStockCount: lowStock?.count || 0,
      staffCount: staffCount?.count || 0
    });
  });

  app.post("/api/owner/products", (req, res) => {
    const { store_id, name, price, stock, category, image_url, min_stock } = req.body;
    
    // Check if product with same name exists in this store
    const existing = db.prepare("SELECT id FROM products WHERE store_id = ? AND LOWER(name) = LOWER(?)").get(store_id, name);
    if (existing) {
      return res.status(400).json({ error: "Já existe um produto com este nome nesta loja." });
    }

    const barcode = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
    db.prepare("INSERT INTO products (store_id, name, price, stock, category, image_url, min_stock, barcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(store_id, name, price, stock, category, image_url, min_stock || 5, barcode);
    res.json({ success: true });
  });

  app.delete("/api/owner/products/:id", (req, res) => {
    db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/owner/products/:id", (req, res) => {
    const { name, price, stock, category, image_url, min_stock } = req.body;
    
    // Get store_id for this product
    const product = db.prepare("SELECT store_id FROM products WHERE id = ?").get(req.params.id) as { store_id: number } | undefined;
    if (!product) return res.status(404).json({ error: "Produto não encontrado." });

    // Check for other products with same name in same store
    const existing = db.prepare("SELECT id FROM products WHERE store_id = ? AND LOWER(name) = LOWER(?) AND id != ?").get(product.store_id, name, req.params.id);
    if (existing) {
      return res.status(400).json({ error: "Já existe um outro produto com este nome nesta loja." });
    }

    db.prepare(`
      UPDATE products 
      SET name = ?, price = ?, stock = ?, category = ?, image_url = ?, min_stock = ? 
      WHERE id = ?
    `).run(name, price, stock, category, image_url, min_stock, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/owner/promotions/:storeId", (req, res) => {
    const promotions = db.prepare(`
      SELECT p.*, 
        (SELECT GROUP_CONCAT(pr.name, ', ') 
         FROM promotion_products pp 
         JOIN products pr ON pp.product_id = pr.id 
         WHERE pp.promotion_id = p.id) as product_names
      FROM promotions p 
      WHERE p.store_id = ?
    `).all(req.params.storeId);
    res.json(promotions);
  });

  app.post("/api/owner/promotions", (req, res) => {
    const { store_id, name, start_date, end_date, discount_percent, product_ids } = req.body;
    
    const transaction = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO promotions (store_id, name, start_date, end_date, discount_percent) 
        VALUES (?, ?, ?, ?, ?)
      `).run(store_id, name, start_date, end_date, discount_percent);
      
      const promotionId = info.lastInsertRowid;
      const insertProduct = db.prepare("INSERT INTO promotion_products (promotion_id, product_id) VALUES (?, ?)");
      
      for (const productId of product_ids) {
        insertProduct.run(promotionId, productId);
      }
      
      return promotionId;
    });

    try {
      const id = transaction();
      res.json({ success: true, id });
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar promoção" });
    }
  });

  app.delete("/api/owner/promotions/:id", (req, res) => {
    const transaction = db.transaction(() => {
      db.prepare("DELETE FROM promotion_products WHERE promotion_id = ?").run(req.params.id);
      db.prepare("DELETE FROM promotions WHERE id = ?").run(req.params.id);
    });
    transaction();
    res.json({ success: true });
  });

  app.post("/api/admin/stores/toggle-license", (req, res) => {
    const { store_id, status } = req.body;
    db.prepare("UPDATE stores SET license_status = ? WHERE id = ?").run(status, store_id);
    res.json({ success: true });
  });

  app.get("/api/owner/reports/:storeId", (req, res) => {
    const storeId = req.params.storeId;
    
    // Sales by day (last 30 days)
    const salesByDay = db.prepare(`
      SELECT date(timestamp) as date, SUM(total_amount) as revenue, COUNT(*) as sales
      FROM transactions
      WHERE store_id = ? AND timestamp >= date('now', '-30 days')
      GROUP BY date(timestamp)
      ORDER BY date ASC
    `).all(storeId);

    // Best selling products
    const transactions = db.prepare("SELECT items FROM transactions WHERE store_id = ?").all(storeId);
    const productSales: Record<string, { name: string, quantity: number, revenue: number }> = {};
    
    transactions.forEach((t: any) => {
      try {
        const items = JSON.parse(t.items);
        items.forEach((item: any) => {
          if (!productSales[item.id]) {
            productSales[item.id] = { name: item.name, quantity: 0, revenue: 0 };
          }
          productSales[item.id].quantity += item.quantity;
          productSales[item.id].revenue += item.price * item.quantity;
        });
      } catch (e) {
        console.error("Error parsing items:", e);
      }
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Sales by category
    const categorySales: Record<string, number> = {};
    const products = db.prepare("SELECT id, category FROM products WHERE store_id = ?").all(storeId);
    const productToCategory: Record<number, string> = {};
    products.forEach((p: any) => productToCategory[p.id] = p.category);

    transactions.forEach((t: any) => {
      try {
        const items = JSON.parse(t.items);
        items.forEach((item: any) => {
          const cat = productToCategory[item.id] || 'Outros';
          categorySales[cat] = (categorySales[cat] || 0) + (item.price * item.quantity);
        });
      } catch (e) {}
    });

    const salesByCategory = Object.entries(categorySales).map(([name, value]) => ({ name, value }));

    // Revenue by payment method
    const paymentMethods = db.prepare(`
      SELECT payment_method as name, SUM(total_amount) as value
      FROM transactions
      WHERE store_id = ?
      GROUP BY payment_method
    `).all(storeId);

    res.json({
      salesByDay,
      topProducts,
      salesByCategory,
      paymentMethods
    });
  });

  app.get("/api/owner/global-reports/:ownerId", (req, res) => {
    const ownerId = req.params.ownerId;
    
    // Get all stores for this owner
    const stores = db.prepare("SELECT id, name FROM stores WHERE owner_id = ?").all(ownerId) as any[];
    const storeIds = stores.map(s => s.id);
    
    if (storeIds.length === 0) {
      return res.json({ 
        totalRevenue: 0, 
        totalSales: 0, 
        revenueByStore: [], 
        salesByDay: [], 
        topProducts: [],
        paymentMethods: []
      });
    }

    const placeholders = storeIds.map(() => '?').join(',');

    // Total Revenue & Sales
    const stats = db.prepare(`
      SELECT SUM(total_amount) as totalRevenue, COUNT(*) as totalSales
      FROM transactions
      WHERE store_id IN (${placeholders})
    `).get(...storeIds) as any;

    // Revenue by Store
    const revenueByStore = db.prepare(`
      SELECT s.name, SUM(t.total_amount) as revenue
      FROM transactions t
      JOIN stores s ON t.store_id = s.id
      WHERE t.store_id IN (${placeholders})
      GROUP BY s.id
    `).all(...storeIds);

    // Sales by Day (last 30 days)
    const salesByDay = db.prepare(`
      SELECT date(timestamp) as date, SUM(total_amount) as revenue
      FROM transactions
      WHERE store_id IN (${placeholders}) AND timestamp >= date('now', '-30 days')
      GROUP BY date(timestamp)
      ORDER BY date ASC
    `).all(...storeIds);

    // Top Products
    const allTransactions = db.prepare(`
      SELECT items FROM transactions WHERE store_id IN (${placeholders})
    `).all(...storeIds);
    
    const productSales: Record<string, { id: any, name: string, quantity: number, revenue: number }> = {};
    allTransactions.forEach((t: any) => {
      try {
        const items = JSON.parse(t.items);
        items.forEach((item: any) => {
          if (!productSales[item.id]) {
            productSales[item.id] = { id: item.id, name: item.name, quantity: 0, revenue: 0 };
          }
          productSales[item.id].quantity += item.quantity;
          productSales[item.id].revenue += item.quantity * item.price;
        });
      } catch (e) {}
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Payment Methods
    const paymentMethods = db.prepare(`
      SELECT payment_method as name, COUNT(*) as value
      FROM transactions
      WHERE store_id IN (${placeholders})
      GROUP BY payment_method
    `).all(...storeIds);

    res.json({
      totalRevenue: stats.totalRevenue || 0,
      totalSales: stats.totalSales || 0,
      revenueByStore,
      salesByDay,
      topProducts,
      paymentMethods
    });
  });

  app.put("/api/owner/store-settings/:id", (req, res) => {
    const { name, nif, phone, email, address, logo_url, status, bank_accounts } = req.body;
    db.prepare(`
      UPDATE stores 
      SET name = ?, nif = ?, phone = ?, email = ?, address = ?, logo_url = ?, status = ?, bank_accounts = ?
      WHERE id = ?
    `).run(name, nif, phone, email, address, logo_url, status, JSON.stringify(bank_accounts || []), req.params.id);
    res.json({ success: true });
  });

  // Client Routes
  app.get("/api/owner/clients/:storeId", (req, res) => {
    const clients = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM transactions t WHERE t.client_nif = c.nif) as total_purchases,
        (SELECT SUM(total_amount) FROM transactions t WHERE t.client_nif = c.nif) as total_spent
      FROM clients c 
      WHERE c.store_id = ? 
      ORDER BY name ASC
    `).all(req.params.storeId);
    res.json(clients);
  });

  app.post("/api/owner/clients", (req, res) => {
    const { store_id, name, nif, email, phone, address, type } = req.body;
    db.prepare("INSERT INTO clients (store_id, name, nif, email, phone, address, type) VALUES (?, ?, ?, ?, ?, ?, ?)").run(store_id, name, nif, email, phone, address, type || 'individual');
    res.json({ success: true });
  });

  app.put("/api/owner/clients/:id", (req, res) => {
    const { name, nif, email, phone, address, type } = req.body;
    db.prepare("UPDATE clients SET name = ?, nif = ?, email = ?, phone = ?, address = ?, type = ? WHERE id = ?").run(name, nif, email, phone, address, type, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/owner/clients/:id", (req, res) => {
    db.prepare("DELETE FROM clients WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Supplier Routes
  app.get("/api/owner/suppliers/:ownerId", (req, res) => {
    const suppliers = db.prepare("SELECT * FROM suppliers WHERE owner_id = ? ORDER BY name ASC").all(req.params.ownerId);
    res.json(suppliers);
  });

  app.post("/api/owner/suppliers", (req, res) => {
    const { 
      owner_id, name, company_name, nif, phone, email, 
      country, city, address, responsible_person, 
      payment_method, payment_term, observations, status 
    } = req.body;
    db.prepare(`
      INSERT INTO suppliers (
        owner_id, name, company_name, nif, phone, email, 
        country, city, address, responsible_person, 
        payment_method, payment_term, observations, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      owner_id, name, company_name, nif, phone, email, 
      country, city, address, responsible_person, 
      payment_method, payment_term, observations, status || 'active'
    );
    res.json({ success: true });
  });

  app.put("/api/owner/suppliers/:id", (req, res) => {
    const { 
      name, company_name, nif, phone, email, 
      country, city, address, responsible_person, 
      payment_method, payment_term, observations, status 
    } = req.body;
    db.prepare(`
      UPDATE suppliers SET 
        name = ?, company_name = ?, nif = ?, phone = ?, email = ?, 
        country = ?, city = ?, address = ?, responsible_person = ?, 
        payment_method = ?, payment_term = ?, observations = ?, status = ?
      WHERE id = ?
    `).run(
      name, company_name, nif, phone, email, 
      country, city, address, responsible_person, 
      payment_method, payment_term, observations, status,
      req.params.id
    );
    res.json({ success: true });
  });

  // Purchase Routes
  app.get("/api/owner/purchases/:storeId", (req, res) => {
    const purchases = db.prepare(`
      SELECT p.*, s.name as supplier_name 
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.store_id = ?
      ORDER BY p.timestamp DESC
    `).all(req.params.storeId);
    res.json(purchases.map((p: any) => ({ ...p, items: typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || []) })));
  });

  app.get("/api/owner/suppliers/:id/purchases", (req, res) => {
    const purchases = db.prepare(`
      SELECT p.*, st.name as store_name
      FROM purchases p
      JOIN stores st ON p.store_id = st.id
      WHERE p.supplier_id = ?
      ORDER BY p.timestamp DESC
    `).all(req.params.id);
    res.json(purchases.map((p: any) => ({ ...p, items: typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || []) })));
  });

  app.get("/api/owner/suppliers/:ownerId/report", (req, res) => {
    const report = db.prepare(`
      SELECT s.id, s.name, s.nif,
        COUNT(p.id) as total_purchases,
        IFNULL(SUM(p.total_amount), 0) as total_spent,
        IFNULL(SUM(p.paid_amount), 0) as total_paid,
        IFNULL((SUM(p.total_amount) - SUM(p.paid_amount)), 0) as total_debt
      FROM suppliers s
      LEFT JOIN purchases p ON s.id = p.supplier_id
      WHERE s.owner_id = ?
      GROUP BY s.id
      ORDER BY total_spent DESC
    `).all(req.params.ownerId);
    res.json(report);
  });

  app.post("/api/owner/purchases", (req, res) => {
    const { store_id, supplier_id, total_amount, paid_amount, invoice_number, items, due_date, user_id, delivery_status, is_direct, is_stock_updated, is_closed, status } = req.body;
    
    const transaction = db.transaction(() => {
      let finalInvoiceNumber = invoice_number;
      if (!finalInvoiceNumber || finalInvoiceNumber.trim() === '') {
        const year = new Date().getFullYear();
        const lastPurchase = db.prepare("SELECT invoice_number FROM purchases WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1").get(`FCO-${year}-%`) as { invoice_number: string } | undefined;
        let sequence = 1;
        if (lastPurchase && lastPurchase.invoice_number) {
          const parts = lastPurchase.invoice_number.split('-');
          if (parts.length > 2) {
            const lastSeq = parseInt(parts[2]);
            if (!isNaN(lastSeq)) {
              sequence = lastSeq + 1;
            }
          }
        }
        finalInvoiceNumber = `FCO-${year}-${sequence.toString().padStart(4, '0')}`;
      }

      const purchaseResult = db.prepare(`
        INSERT INTO purchases (store_id, supplier_id, total_amount, paid_amount, status, invoice_number, items, due_date, delivery_status, is_direct, is_stock_updated, is_closed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(store_id, supplier_id, total_amount, (paid_amount || 0), status, finalInvoiceNumber, JSON.stringify(items), due_date, delivery_status, is_direct ? 1 : 0, is_stock_updated ? 1 : 0, is_closed ? 1 : 0);
      
      const purchaseId = purchaseResult.lastInsertRowid;

      if (paid_amount > 0) {
        db.prepare(`
          INSERT INTO purchase_payments (purchase_id, amount, payment_method)
          VALUES (?, ?, ?)
        `).run(purchaseId, paid_amount, 'Initial Payment');
      }

      // If it's a direct purchase, update stock immediately
      if (is_direct) {
        for (const item of items) {
          db.prepare(`
            UPDATE products SET stock = stock + ? WHERE id = ?
          `).run(item.quantity, item.product_id);

          db.prepare(`
            INSERT INTO stock_movements (store_id, product_id, user_id, type, quantity, reason, supplier_id, purchase_id)
            VALUES (?, ?, ?, 'in', ?, ?, ?, ?)
          `).run(store_id, item.product_id, user_id, item.quantity, `Compra Direta - Fatura ${finalInvoiceNumber}`, supplier_id, purchaseId);
        }
      }

      return purchaseId;
    });

    try {
      const id = transaction();
      res.json({ success: true, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/owner/purchase-payments", (req, res) => {
    const { purchase_id, amount, payment_method } = req.body;
    
    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO purchase_payments (purchase_id, amount, payment_method)
        VALUES (?, ?, ?)
      `).run(purchase_id, amount, payment_method);

      db.prepare(`
        UPDATE purchases 
        SET paid_amount = paid_amount + ?,
            status = CASE 
              WHEN (paid_amount + ?) >= total_amount THEN 'liquidado'
              ELSE 'devendo'
            END
        WHERE id = ?
      `).run(amount, amount, purchase_id);
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Purchase Returns / Notes
  app.post("/api/owner/purchase-returns", (req, res) => {
    const { store_id, supplier_id, purchase_id, total_amount, reason, items, type = 'credit' } = req.body;
    
    try {
      const transaction = db.transaction(() => {
        const stmt = db.prepare(`
          INSERT INTO purchase_returns (store_id, supplier_id, purchase_id, total_amount, reason, items, type)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(store_id, supplier_id, purchase_id, total_amount, reason, JSON.stringify(items), type);
        
        // Update stock for returned items (only if it's a credit note / return)
        if (type === 'credit') {
          for (const item of items) {
            db.prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND store_id = ?").run(item.quantity, item.product_id, store_id);
            
            // Record stock movement
            db.prepare(`
              INSERT INTO stock_movements (store_id, product_id, type, quantity, reason, purchase_id)
              VALUES (?, ?, 'out', ?, ?, ?)
            `).run(store_id, item.product_id, item.quantity, `Nota de Crédito (Devolução) - Motivo: ${reason}`, purchase_id);
          }
        } else if (type === 'debit') {
          // For debit notes, if it involves items, stock should go IN
          for (const item of items) {
            db.prepare("UPDATE products SET stock = stock + ? WHERE id = ? AND store_id = ?").run(item.quantity, item.product_id, store_id);
            
            // Record stock movement
            db.prepare(`
              INSERT INTO stock_movements (store_id, product_id, type, quantity, reason, purchase_id)
              VALUES (?, ?, 'in', ?, ?, ?)
            `).run(store_id, item.product_id, item.quantity, `Nota de Débito - Motivo: ${reason}`, purchase_id);
          }
        }
        
        return result.lastInsertRowid;
      });

      const id = transaction();
      res.json({ success: true, id });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Erro ao registar nota" });
    }
  });

  app.get("/api/owner/purchase-returns/:storeId", (req, res) => {
    try {
      const returns = db.prepare(`
        SELECT r.*, s.name as supplier_name 
        FROM purchase_returns r
        JOIN suppliers s ON r.supplier_id = s.id
        WHERE r.store_id = ?
        ORDER BY r.timestamp DESC
      `).all(req.params.storeId);
      res.json(returns.map((r: any) => ({ ...r, items: typeof r.items === 'string' ? JSON.parse(r.items || '[]') : (r.items || []) })));
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/owner/purchases/:id/receive", (req, res) => {
    const { id } = req.params;
    
    try {
      const purchase = db.prepare("SELECT * FROM purchases WHERE id = ?").get(id) as any;
      if (!purchase) return res.status(404).json({ error: "Compra não encontrada" });
      if (purchase.delivery_status === 'received') return res.status(400).json({ error: "Compra já recebida" });

      db.prepare("UPDATE purchases SET delivery_status = 'received', received_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
      
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao receber encomenda" });
    }
  });

  app.put("/api/owner/purchases/:id/update-stock", (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;
    
    const transaction = db.transaction(() => {
      const purchase = db.prepare("SELECT * FROM purchases WHERE id = ?").get(id) as any;
      if (!purchase) throw new Error("Compra não encontrada");
      if (purchase.delivery_status !== 'received') throw new Error("Encomenda ainda não foi recebida");
      if (purchase.is_stock_updated) throw new Error("Stock já foi atualizado");

      const items = typeof purchase.items === 'string' ? JSON.parse(purchase.items) : (purchase.items || []);
      
      for (const item of items) {
        db.prepare("UPDATE products SET stock = stock + ? WHERE id = ? AND store_id = ?").run(item.quantity, item.product_id, purchase.store_id);

        db.prepare(`
          INSERT INTO stock_movements (store_id, product_id, user_id, type, quantity, reason, supplier_id, purchase_id)
          VALUES (?, ?, ?, 'in', ?, ?, ?, ?)
        `).run(purchase.store_id, item.product_id, user_id, item.quantity, `Recebimento Encomenda - Fatura ${purchase.invoice_number}`, purchase.supplier_id, id);
      }

      db.prepare("UPDATE purchases SET is_stock_updated = 1 WHERE id = ?").run(id);
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/owner/purchases/:id/close", (req, res) => {
    const { id } = req.params;
    
    try {
      const purchase = db.prepare("SELECT * FROM purchases WHERE id = ?").get(id) as any;
      if (!purchase) return res.status(404).json({ error: "Compra não encontrada" });
      if (!purchase.is_stock_updated) return res.status(400).json({ error: "Stock deve ser atualizado antes de fechar a encomenda" });

      db.prepare("UPDATE purchases SET is_closed = 1 WHERE id = ?").run(id);
      
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao fechar encomenda" });
    }
  });

  app.put("/api/owner/purchases/:id/cancel", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("UPDATE purchases SET delivery_status = 'cancelled' WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao cancelar encomenda" });
    }
  });

  app.get("/api/seller/clients/:storeId", (req, res) => {
    const clients = db.prepare("SELECT * FROM clients WHERE store_id = ? ORDER BY name ASC").all(req.params.storeId);
    res.json(clients);
  });

  // Seller Routes
  app.get("/api/seller/products/:storeId", (req, res) => {
    const products = db.prepare(`
      SELECT p.*, 
        MAX(pr.discount_percent) as discount_percent,
        pr.name as promo_name
      FROM products p 
      LEFT JOIN promotion_products pp ON p.id = pp.product_id
      LEFT JOIN promotions pr ON pp.promotion_id = pr.id 
        AND date('now') BETWEEN date(pr.start_date) AND date(pr.end_date)
      WHERE p.store_id = ? AND p.stock > 0
      GROUP BY p.id
    `).all(req.params.storeId);
    res.json(products);
  });

  app.post("/api/seller/sale", (req, res) => {
    const { 
      store_id, seller_id, cash_register_id, total_amount, items, payment_method, 
      cash_received, split_details, client_name, client_nif,
      discount_percent, discount_amount, tax_amount
    } = req.body;

    // Check for active cashier session
    let sessionQuery = "SELECT id FROM cashier_sessions WHERE store_id = ? AND status = 'open'";
    let sessionParams: any[] = [store_id];
    if (cash_register_id) {
      sessionQuery += " AND cash_register_id = ?";
      sessionParams.push(cash_register_id);
    }
    const activeSession = db.prepare(sessionQuery).get(...sessionParams);
    if (!activeSession) {
      return res.status(403).json({ error: "O caixa deve estar aberto para realizar vendas." });
    }
    
    // Generate Sequential Invoice Number
    const year = new Date().getFullYear();
    const lastInvoice = db.prepare("SELECT invoice_number FROM transactions WHERE store_id = ? AND invoice_number LIKE ? ORDER BY id DESC LIMIT 1").get(store_id, `FS ${year}/%`) as { invoice_number: string } | undefined;
    let sequence = 1;
    if (lastInvoice) {
      const parts = lastInvoice.invoice_number.split('/');
      if (parts.length === 2) {
        sequence = parseInt(parts[1]) + 1;
      }
    }
    const invoice_number = `FS ${year}/${sequence.toString().padStart(3, '0')}`;

    const info = db.prepare(`
      INSERT INTO transactions (
        store_id, seller_id, cash_register_id, total_amount, items, payment_method, 
        cash_received, split_details, client_name, client_nif,
        discount_percent, discount_amount, tax_amount, invoice_number, agt_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      store_id, 
      seller_id, 
      cash_register_id || null,
      total_amount, 
      JSON.stringify(items),
      payment_method || 'cash',
      cash_received !== undefined && cash_received !== null ? cash_received : total_amount,
      split_details ? JSON.stringify(split_details) : null,
      client_name || 'Consumidor Final',
      client_nif || '999999999',
      discount_percent || 0,
      discount_amount || 0,
      tax_amount || 0,
      invoice_number,
      'sent'
    );
    
    // Update stock
    for (const item of items) {
      if (item.type === 'product') {
        db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(item.quantity, item.id);
      }
    }
    
    const sale = db.prepare("SELECT * FROM transactions WHERE id = ?").get(info.lastInsertRowid) as any;
    if (sale) {
      sale.items = typeof sale.items === 'string' ? JSON.parse(sale.items) : (sale.items || []);
      if (sale.split_details) sale.split_details = typeof sale.split_details === 'string' ? JSON.parse(sale.split_details) : sale.split_details;
      
      // --- SAF-T JSON Generation & AGT Submission ---
      try {
        const store = db.prepare("SELECT * FROM stores WHERE id = ?").get(store_id) as any;
        const saftData = {
          Header: {
            InvoiceNo: invoice_number,
            InvoiceDate: new Date(sale.timestamp).toISOString().split('T')[0],
            SystemEntryDate: new Date(sale.timestamp).toISOString(),
            StoreName: store.name,
            StoreNIF: store.nif,
            ClientName: client_name || 'Consumidor Final',
            ClientNIF: client_nif || '999999999'
          },
          Items: sale.items.map((item: any) => ({
            ProductCode: item.barcode || item.id,
            ProductDescription: item.name,
            Quantity: item.quantity,
            UnitPrice: item.price,
            TaxAmount: (item.price * item.quantity * 0.14), // Assuming 14% VAT
            TotalAmount: item.price * item.quantity
          })),
          Totals: {
            GrossTotal: total_amount,
            TaxPayable: tax_amount || (total_amount * 0.14),
            NetTotal: total_amount - (tax_amount || (total_amount * 0.14))
          }
        };

        // 1. Save to local folder
        const saftDir = path.join(process.cwd(), "saft_files");
        if (!fs.existsSync(saftDir)) {
          fs.mkdirSync(saftDir, { recursive: true });
        }
        const fileName = `SAFT_${invoice_number.replace(/[\/\s]/g, '_')}.json`;
        fs.writeFileSync(path.join(saftDir, fileName), JSON.stringify(saftData, null, 2));
        console.log(`SAF-T file saved: ${fileName}`);

        // 2. Submit to AGT (Mock)
        console.log(`Submitting invoice ${invoice_number} to AGT...`);
        // In a real scenario, we would use fetch() to send the JSON to AGT API
        db.prepare("UPDATE transactions SET agt_status = 'sent' WHERE id = ?").run(sale.id);
        
      } catch (saftError) {
        console.error("Error generating SAF-T or submitting to AGT:", saftError);
        db.prepare("UPDATE transactions SET agt_status = 'error' WHERE id = ?").run(sale.id);
      }
      // ----------------------------------------------
    }
    
    res.json({ success: true, sale });
  });

  app.get("/api/seller/sales/:sellerId", (req, res) => {
    const sellerId = req.params.sellerId;
    
    // Standard transactions (FS)
    const transactions = db.prepare(`
      SELECT t.*, s.name as store_name, 'FS' as doc_type
      FROM transactions t
      JOIN stores s ON t.store_id = s.id
      WHERE t.seller_id = ?
    `).all(sellerId) as any[];
    
    // Formal invoices (FR, FT)
    const formalInvoices = db.prepare(`
      SELECT 
        id, store_id, seller_id, total_amount, items, 
        client_name, client_nif, tax_amount, invoice_number,
        created_at as timestamp, doc_type, 'formal' as source
      FROM credit_invoices
      WHERE seller_id = ?
    `).all(sellerId) as any[];

    const allSales = [...transactions, ...formalInvoices].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    allSales.forEach(s => {
      s.items = typeof s.items === 'string' ? JSON.parse(s.items) : (s.items || []);
      if (s.split_details) s.split_details = typeof s.split_details === 'string' ? JSON.parse(s.split_details) : s.split_details;
    });
    
    res.json(allSales);
  });

  // Seller Dashboard Stats
  app.get("/api/seller/dashboard-stats/:sellerId", (req, res) => {
    const sellerId = req.params.sellerId;
    const today = db.prepare(`
      SELECT SUM(total_amount) as total 
      FROM transactions 
      WHERE seller_id = ? AND date(timestamp) = date('now')
    `).get(sellerId) as any;
    
    const last7Days = db.prepare(`
      SELECT SUM(total_amount) as total 
      FROM transactions 
      WHERE seller_id = ? AND timestamp >= date('now', '-7 days')
    `).get(sellerId) as any;

    res.json({
      today: today?.total || 0,
      last7Days: last7Days?.total || 0
    });
  });

  // Cash Movements
  app.get("/api/seller/cash-movements/:sellerId", (req, res) => {
    const movements = db.prepare(`
      SELECT * FROM cash_movements 
      WHERE seller_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 20
    `).all(req.params.sellerId);
    res.json(movements);
  });

  app.post("/api/seller/cash-movements", (req, res) => {
    const { store_id, seller_id, cash_register_id, type, amount, description } = req.body;
    
    if (!hasPermission(seller_id, 'pos_withdraw')) {
      return res.status(403).json({ error: "Você não tem permissão para registar movimentos de caixa." });
    }

    // Check for active cashier session
    let sessionQuery = "SELECT id FROM cashier_sessions WHERE store_id = ? AND status = 'open'";
    let sessionParams: any[] = [store_id];
    if (cash_register_id) {
      sessionQuery += " AND cash_register_id = ?";
      sessionParams.push(cash_register_id);
    }
    const activeSession = db.prepare(sessionQuery).get(...sessionParams);
    if (!activeSession) {
      return res.status(403).json({ error: "O caixa deve estar aberto para registar movimentos." });
    }

    db.prepare("INSERT INTO cash_movements (store_id, seller_id, cash_register_id, type, amount, description) VALUES (?, ?, ?, ?, ?, ?)").run(store_id, seller_id, cash_register_id || null, type, amount, description);
    res.json({ success: true });
  });

  // Cashier Sessions
  app.get("/api/seller/active-session/:storeId", (req, res) => {
    const { cash_register_id } = req.query;
    let query = "SELECT * FROM cashier_sessions WHERE store_id = ? AND status = 'open'";
    let params: any[] = [req.params.storeId];

    if (cash_register_id) {
      query += " AND cash_register_id = ?";
      params.push(cash_register_id);
    }

    query += " ORDER BY opening_time DESC LIMIT 1";

    const session = db.prepare(query).get(...params) as any;

    if (!session) return res.json(null);

    // Calculate current totals for this session across the store
    const sales = db.prepare(`
      SELECT SUM(total_amount) as total 
      FROM transactions 
      WHERE store_id = ? AND timestamp >= ? AND (cash_register_id = ? OR cash_register_id IS NULL)
    `).get(session.store_id, session.opening_time, session.cash_register_id) as any;

    const cashIn = db.prepare(`
      SELECT SUM(amount) as total 
      FROM cash_movements 
      WHERE store_id = ? AND type = 'in' AND timestamp >= ? AND (cash_register_id = ? OR cash_register_id IS NULL)
    `).get(session.store_id, session.opening_time, session.cash_register_id) as any;

    const cashOut = db.prepare(`
      SELECT SUM(amount) as total 
      FROM cash_movements 
      WHERE store_id = ? AND type = 'out' AND timestamp >= ? AND (cash_register_id = ? OR cash_register_id IS NULL)
    `).get(session.store_id, session.opening_time, session.cash_register_id) as any;

    res.json({
      ...session,
      totals: {
        sales: sales?.total || 0,
        in: cashIn?.total || 0,
        out: cashOut?.total || 0,
        expected: (session.opening_amount + (sales?.total || 0) + (cashIn?.total || 0)) - (cashOut?.total || 0)
      }
    });
  });

  app.post("/api/seller/open-session", (req, res) => {
    const { store_id, seller_id, opening_amount, cash_register_id } = req.body;
    console.log("Opening session request:", { store_id, seller_id, opening_amount, cash_register_id });
    
    if (!hasPermission(seller_id, 'pos_open_cashier')) {
      return res.status(403).json({ error: "Você não tem permissão para abrir o caixa." });
    }

    // Check if seller already has an open session (exempt owners and admins)
    const user = db.prepare("SELECT role FROM users WHERE id = ?").get(seller_id) as any;
    if (user && user.role !== 'owner' && user.role !== 'admin') {
      const existingSellerSession = db.prepare("SELECT id FROM cashier_sessions WHERE seller_id = ? AND status = 'open'").get(seller_id);
      if (existingSellerSession) {
        return res.status(400).json({ error: "Você já possui uma sessão de caixa aberta. Feche-a antes de abrir outra." });
      }
    }

    // Check if register already has an open session
    const existingRegisterSession = db.prepare("SELECT id FROM cashier_sessions WHERE cash_register_id = ? AND status = 'open'").get(cash_register_id);
    if (existingRegisterSession) {
      return res.status(400).json({ error: "Este caixa já possui uma sessão aberta por outro funcionário." });
    }

    db.prepare("INSERT INTO cashier_sessions (store_id, seller_id, opening_amount, cash_register_id) VALUES (?, ?, ?, ?)").run(store_id, seller_id, opening_amount, cash_register_id);
    res.json({ success: true });
  });

  app.post("/api/seller/close-session", (req, res) => {
    let { session_id, physical_amount, closing_amount, seller_id } = req.body;
    console.log("Closing session request:", { session_id, physical_amount, closing_amount, seller_id });

    if (!hasPermission(seller_id, 'pos_close_cashier')) {
      return res.status(403).json({ error: "Você não tem permissão para fechar o caixa." });
    }

    // If closing_amount is 0 or not provided, calculate it from transactions
    if (!closing_amount || closing_amount === 0) {
      const session = db.prepare("SELECT * FROM cashier_sessions WHERE id = ?").get(session_id) as any;
      if (session) {
        // Sum cash sales from transactions
        const sales = db.prepare(`
          SELECT SUM(total_amount) as total 
          FROM transactions 
          WHERE store_id = ? AND cash_register_id = ? AND timestamp >= ?
        `).get(session.store_id, session.cash_register_id, session.opening_time) as any;
        
        const movements = db.prepare(`
          SELECT SUM(CASE WHEN type = 'in' THEN amount ELSE -amount END) as total
          FROM cash_movements
          WHERE session_id = ?
        `).get(session_id) as any;

        closing_amount = (session.opening_amount || 0) + (sales?.total || 0) + (movements?.total || 0);
      }
    }

    db.prepare(`
      UPDATE cashier_sessions 
      SET physical_amount = ?, closing_amount = ?, closing_time = CURRENT_TIMESTAMP, status = 'closed' 
      WHERE id = ?
    `).run(physical_amount, closing_amount || 0, session_id);
    res.json({ success: true });
  });

  // Stock Management Routes
  app.get("/api/owner/stock/movements/:storeId", (req, res) => {
    const movements = db.prepare(`
      SELECT sm.*, p.name as product_name, u.name as user_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      JOIN users u ON sm.user_id = u.id
      WHERE sm.store_id = ?
      ORDER BY sm.timestamp DESC
    `).all(req.params.storeId);
    res.json(movements);
  });

  app.post("/api/owner/stock/movement", (req, res) => {
    const { store_id, product_id, user_id, type, quantity, reason, supplier_id } = req.body;
    
    try {
      db.transaction(() => {
        if (type === 'in') {
          db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(quantity, product_id);
        } else if (type === 'out' || type === 'adjustment') {
          db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(quantity, product_id);
        }
        
        db.prepare(`
          INSERT INTO stock_movements (store_id, product_id, user_id, type, quantity, reason, supplier_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(store_id, product_id, user_id, type, quantity, reason, supplier_id || null);
      })();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/owner/stock/transfer", (req, res) => {
    const { from_store_id, to_store_id, product_id, user_id, quantity, reason } = req.body;
    
    try {
      db.transaction(() => {
        const sourceProduct = db.prepare("SELECT * FROM products WHERE id = ?").get(product_id) as any;
        if (!sourceProduct) {
          throw new Error("Produto não encontrado");
        }
        if (sourceProduct.stock < quantity) {
          throw new Error(`Estoque insuficiente em ${sourceProduct.name}. Disponível: ${sourceProduct.stock}`);
        }

        // Try to find the product in the destination store by barcode first, then by name
        let destProduct;
        if (sourceProduct.barcode) {
          destProduct = db.prepare("SELECT * FROM products WHERE store_id = ? AND barcode = ?").get(to_store_id, sourceProduct.barcode) as any;
        }
        
        if (!destProduct) {
          destProduct = db.prepare("SELECT * FROM products WHERE store_id = ? AND name = ?").get(to_store_id, sourceProduct.name) as any;
        }
        
        if (!destProduct) {
          const barcode = sourceProduct.barcode || Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
          const result = db.prepare(`
            INSERT INTO products (store_id, name, price, stock, category, image_url, min_stock, barcode)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(to_store_id, sourceProduct.name, sourceProduct.price, 0, sourceProduct.category, sourceProduct.image_url, sourceProduct.min_stock || 5, barcode);
          destProduct = { id: result.lastInsertRowid };
        }

        db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(quantity, sourceProduct.id);
        db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(quantity, destProduct.id);

        const transferReason = reason || `Transferência de ${quantity} un de ${sourceProduct.name}`;

        db.prepare(`
          INSERT INTO stock_movements (store_id, product_id, user_id, type, quantity, reason, from_store_id, to_store_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(from_store_id, sourceProduct.id, user_id, 'transfer', -quantity, transferReason, from_store_id, to_store_id);

        db.prepare(`
          INSERT INTO stock_movements (store_id, product_id, user_id, type, quantity, reason, from_store_id, to_store_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(to_store_id, destProduct.id, user_id, 'transfer', quantity, transferReason, from_store_id, to_store_id);
      })();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Transfer error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/owner/stock/report/:storeId", (req, res) => {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_products,
        SUM(stock) as total_quantity,
        SUM(stock * price) as total_value
      FROM products
      WHERE store_id = ?
    `).get(req.params.storeId) as any;

    const lowStock = db.prepare(`
      SELECT * FROM products
      WHERE store_id = ? AND stock <= min_stock
    `).all(req.params.storeId);

    res.json({ stats, lowStock });
  });

  app.post("/api/owner/proforma", (req, res) => {
    const { store_id, owner_id, client_name = 'Consumidor Final', client_nif, client_address, total_amount, items } = req.body;
    try {
      // Fetch store bank accounts to include in the proforma
      const store = db.prepare("SELECT bank_accounts FROM stores WHERE id = ?").get(store_id) as any;
      const bank_accounts = store?.bank_accounts || "[]";

      // Generate invoice number
      const year = new Date().getFullYear();
      const count = db.prepare("SELECT count(*) as count FROM proforma_invoices WHERE store_id = ? AND strftime('%Y', created_at) = ?").get(store_id, year.toString()) as any;
      const invoice_number = `PF ${year}/${(count.count + 1).toString().padStart(3, '0')}`;

      const result = db.prepare(`
        INSERT INTO proforma_invoices (store_id, owner_id, client_name, client_nif, client_address, total_amount, items, bank_accounts, invoice_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(store_id, owner_id, client_name, client_nif, client_address, total_amount, JSON.stringify(items), bank_accounts, invoice_number);
      
      const newProforma = db.prepare("SELECT * FROM proforma_invoices WHERE id = ?").get(result.lastInsertRowid) as any;
      res.json({
        ...newProforma,
        items: typeof newProforma.items === 'string' ? JSON.parse(newProforma.items) : (newProforma.items || [])
      });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/owner/proforma/:storeId", (req, res) => {
    const proformas = db.prepare("SELECT * FROM proforma_invoices WHERE store_id = ? ORDER BY created_at DESC").all(req.params.storeId) as any[];
    res.json(proformas.map(p => ({
      ...p,
      items: p.items ? (typeof p.items === 'string' ? JSON.parse(p.items) : p.items) : [],
      bank_accounts: p.bank_accounts ? (typeof p.bank_accounts === 'string' ? JSON.parse(p.bank_accounts) : p.bank_accounts) : []
    })));
  });

  app.post("/api/owner/credit-invoices", (req, res) => {
    const { 
      store_id, client_nif, client_name, address, country, 
      doc_type, series: providedSeries, invoice_number: providedNumber, invoice_date, 
      currency, total_amount, tax_amount, items, seller_id,
      payment_method, parent_invoice_id, reason, note_category,
      adjustment_amount, observations
    } = req.body;

    console.log("Creating credit invoice request:", { store_id, doc_type, items_count: items?.length });

    try {
      let finalInvoice: any = null;
      db.transaction(() => {
        let finalSeries = providedSeries;
        let finalNumber = providedNumber;

        // Auto-generate series and number if not provided
        if (!finalSeries) {
          finalSeries = new Date().getFullYear().toString();
        }

        if (!finalNumber) {
          const lastInvoice = db.prepare(`
            SELECT invoice_number FROM credit_invoices 
            WHERE store_id = ? AND doc_type = ? AND series = ?
            ORDER BY id DESC LIMIT 1
          `).get(store_id, doc_type, finalSeries) as { invoice_number: string } | undefined;

          let nextNum = 1;
          if (lastInvoice) {
            const lastNumMatch = lastInvoice.invoice_number.match(/\/(\d+)$/);
            const lastNum = lastNumMatch ? parseInt(lastNumMatch[1]) : 0;
            nextNum = lastNum + 1;
          }
          finalNumber = `${doc_type} ${finalSeries}/${nextNum.toString().padStart(3, '0')}`;
        }

        const result = db.prepare(`
          INSERT INTO credit_invoices (
            store_id, client_nif, client_name, address, country, 
            doc_type, series, invoice_number, invoice_date, 
            currency, total_amount, tax_amount, items, seller_id,
            payment_method, parent_invoice_id, reason, note_category,
            adjustment_amount, observations
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          store_id, client_nif, client_name, address, country, 
          doc_type, finalSeries, finalNumber, invoice_date, 
          currency, total_amount, tax_amount, JSON.stringify(items), seller_id || null,
          payment_method || 'cash', parent_invoice_id || null, reason || null, 
          note_category || null, adjustment_amount || 0, observations || null
        );

        // Update stock for products
        for (const item of items) {
          if (item.type === 'product' && item.quantity > 0) {
            if (doc_type === 'NC') {
              // Nota de Crédito
              if (note_category === 'return') {
                // Return to stock
                db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(item.quantity, item.product_id || item.id);
                
                // Record stock movement
                db.prepare(`
                  INSERT INTO stock_movements (store_id, product_id, type, quantity, reason)
                  VALUES (?, ?, 'in', ?, ?)
                `).run(store_id, item.product_id || item.id, item.quantity, `Nota de Crédito (Devolução) - Fatura: ${finalNumber}`);
              }
            } else {
              // FT, FR, ND - Stock goes OUT
              db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(item.quantity, item.product_id || item.id);
              
              // Record stock movement
              db.prepare(`
                INSERT INTO stock_movements (store_id, product_id, type, quantity, reason)
                VALUES (?, ?, 'out', ?, ?)
              `).run(store_id, item.product_id || item.id, item.quantity, `${doc_type === 'ND' ? 'Nota de Débito' : 'Fatura'} - Nº: ${finalNumber}`);
            }
          }
        }

        finalInvoice = db.prepare("SELECT * FROM credit_invoices WHERE id = ?").get(result.lastInsertRowid) as any;
      })();

      if (finalInvoice) {
        res.json({
          ...finalInvoice,
          items: typeof finalInvoice.items === 'string' ? JSON.parse(finalInvoice.items) : (finalInvoice.items || [])
        });
      } else {
        res.status(500).json({ error: "Failed to create invoice" });
      }
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/owner/credit-invoices/:storeId", (req, res) => {
    try {
      const invoices = db.prepare("SELECT * FROM credit_invoices WHERE store_id = ? ORDER BY created_at DESC").all(req.params.storeId) as any[];
      res.json(invoices.map(inv => ({
        ...inv,
        items: inv.items ? (typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items) : []
      })));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

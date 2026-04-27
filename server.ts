import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import * as XLSX from "xlsx";
import PDFDocument from "pdfkit-table";
import QRCode from "qrcode";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("database.db");

// Handle BigInt serialization for JSON.stringify (needed for better-sqlite3 row IDs)
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// Migrations
db.exec(`
  CREATE TABLE IF NOT EXISTS owner_settings (
    owner_id INTEGER PRIMARY KEY,
    backup_enabled INTEGER DEFAULT 0,
    backup_frequency TEXT DEFAULT 'daily',
    financial_reminder_enabled INTEGER DEFAULT 0,
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );
`);

db.prepare(`
  CREATE TABLE IF NOT EXISTS cancellation_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    doc_type TEXT DEFAULT 'NC', -- 'NC' or 'ND'
    type TEXT NOT NULL, -- 'cancel', 'reduce', 'return', 'correction', etc.
    reason TEXT,
    items_json TEXT, -- If specific items are being returned
    amount DECIMAL(10, 2),
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    requested_by INTEGER NOT NULL,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_by INTEGER,
    processed_at DATETIME,
    establishment_id INTEGER,
    FOREIGN KEY(invoice_id) REFERENCES transactions(id),
    FOREIGN KEY(requested_by) REFERENCES users(id)
  )
`).run();

// Migration for existing table
try {
  db.prepare("ALTER TABLE cancellation_requests ADD COLUMN doc_type TEXT DEFAULT 'NC'").run();
} catch (e) {}

// Migrations
const usersTable = db.prepare("PRAGMA table_info(users)").all();
if (!usersTable.some((col: any) => col.name === 'bi_number')) {
  try {
    db.prepare("ALTER TABLE users ADD COLUMN bi_number TEXT").run();
    console.log("Migration: Added bi_number column to users table");
  } catch (e) {
    console.error("Migration error (users.bi_number):", e);
  }
}
if (!usersTable.some((col: any) => col.name === 'address')) {
  try {
    db.prepare("ALTER TABLE users ADD COLUMN address TEXT").run();
  } catch (e) {}
}

const hrAttendanceTable = db.prepare("PRAGMA table_info(hr_attendance)").all();
if (!hrAttendanceTable.some((col: any) => col.name === 'type')) {
  try {
    db.prepare("ALTER TABLE hr_attendance ADD COLUMN type TEXT DEFAULT 'manual'").run();
  } catch (e) {}
}

const transactionsTable = db.prepare("PRAGMA table_info(transactions)").all();
if (!transactionsTable.some((col: any) => col.name === 'cancellation_id')) {
  try {
    db.prepare("ALTER TABLE transactions ADD COLUMN cancellation_id INTEGER").run();
  } catch (e) {}
}

// Digital Signature Service
const MASTER_KEY = (process.env.SIGNATURE_MASTER_KEY || "a-very-secret-master-key-32-chars").slice(0, 32).padEnd(32, '0');
const IV_LENGTH = 16;

const DigitalSignatureService = {
  encryptPrivateKey(privateKey: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(MASTER_KEY), iv);
    let encrypted = cipher.update(privateKey);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  },

  decryptPrivateKey(encryptedData: string): string {
    const textParts = encryptedData.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(MASTER_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  },

  generateCompanyKeys(ownerId: number, userId: number) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    const encryptedPrivate = this.encryptPrivateKey(privateKey);
    
    // Deactivate old keys
    db.prepare("UPDATE company_keys SET is_active = 0 WHERE owner_id = ?").run(ownerId);

    // Get current version
    const lastKey = db.prepare("SELECT MAX(version) as max_v FROM company_keys WHERE owner_id = ?").get(ownerId) as { max_v: number };
    const nextVersion = (lastKey?.max_v || 0) + 1;

    const result = db.prepare(`
      INSERT INTO company_keys (owner_id, public_key, private_key_encrypted, version, is_active, created_by)
      VALUES (?, ?, ?, ?, 1, ?)
    `).run(ownerId, publicKey, encryptedPrivate, nextVersion, userId);

    return { id: result.lastInsertRowid, publicKey, version: nextVersion };
  },

  getActiveKey(ownerId: number) {
    return db.prepare("SELECT * FROM company_keys WHERE owner_id = ? AND is_active = 1").get(ownerId) as any;
  },

  getPrevSignature(ownerId: number, establishmentId: number) {
    // Check transactions
    const lastTrans = db.prepare(`
      SELECT signature FROM transactions 
      WHERE establishment_id = ? AND signature IS NOT NULL 
      ORDER BY timestamp DESC, id DESC LIMIT 1
    `).get(establishmentId) as { signature: string };

    // Check credit invoices
    const lastCI = db.prepare(`
      SELECT signature FROM credit_invoices 
      WHERE establishment_id = ? AND signature IS NOT NULL 
      ORDER BY created_at DESC, id DESC LIMIT 1
    `).get(establishmentId) as { signature: string };

    // Return the most recent one (this is a bit simplified, ideally we'd have a global sequence)
    // For now, let's just return the last one found in either.
    return lastTrans?.signature || lastCI?.signature || "0";
  },

  signDocument(ownerId: number, establishmentId: number, data: any) {
    let activeKey = this.getActiveKey(ownerId);
    if (!activeKey) {
      // Fallback: try to generate keys if missing
      try {
        console.log(`No active key found for owner ${ownerId} during signing. Attempting to generate...`);
        this.generateCompanyKeys(ownerId, ownerId);
        activeKey = this.getActiveKey(ownerId);
      } catch (e) {
        console.error(`Failed to generate fallback keys for owner ${ownerId}:`, e);
      }
    }

    if (!activeKey) {
      throw new Error("Nenhuma chave ativa encontrada para esta empresa.");
    }

    const privateKey = this.decryptPrivateKey(activeKey.private_key_encrypted);
    const prevSignature = this.getPrevSignature(ownerId, establishmentId);
    
    // Data to hash: invoice_number, total, date, items, prev_signature
    const dataToHash = JSON.stringify({
      invoice_number: data.invoice_number,
      total: data.total_amount,
      date: data.date,
      items: data.items,
      prev_signature: prevSignature
    });

    const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');
    
    const sign = crypto.createSign('SHA256');
    sign.update(hash);
    sign.end();
    const signature = sign.sign(privateKey, 'hex');

    return {
      hash,
      signature,
      prev_signature: prevSignature,
      key_version_id: activeKey.id
    };
  }
};

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

db.exec(`
  CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    establishment_id INTEGER,
    plan_type TEXT, -- 'basic', 'pro', 'enterprise'
    start_date TEXT,
    expiry_date TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'suspended', 'expired'
    features TEXT, -- JSON string of limits
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(establishment_id) REFERENCES establishments(id)
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
    max_establishments INTEGER,
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

  CREATE TABLE IF NOT EXISTS establishments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER,
    name TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    nif TEXT,
    logo_url TEXT,
    establishment_code TEXT,
    status TEXT DEFAULT 'active', -- 'active' or 'inactive'
    license_status TEXT DEFAULT 'active',
    license_expiry TEXT,
    bank_accounts TEXT, -- JSON string
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS financial_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    establishment_id INTEGER,
    owner_id INTEGER,
    type TEXT, -- 'income', 'expense'
    category TEXT,
    amount REAL,
    payment_method TEXT, -- 'cash', 'transfer', 'multicaixa', 'other'
    description TEXT,
    date TEXT,
    status TEXT DEFAULT 'paid', -- 'paid', 'pending'
    reference_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(establishment_id) REFERENCES establishments(id),
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS accounts_receivable (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    establishment_id INTEGER,
    owner_id INTEGER,
    client_name TEXT,
    amount REAL,
    due_date TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(establishment_id) REFERENCES establishments(id),
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS accounts_payable (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    establishment_id INTEGER,
    owner_id INTEGER,
    supplier_name TEXT,
    amount REAL,
    due_date TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(establishment_id) REFERENCES establishments(id),
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    establishment_id INTEGER,
    warehouse_id INTEGER,
    name TEXT,
    price REAL,
    stock INTEGER,
    category TEXT,
    image_url TEXT,
    is_promo INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    barcode TEXT,
    tax_id INTEGER,
    FOREIGN KEY(establishment_id) REFERENCES establishments(id),
    FOREIGN KEY(warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY(tax_id) REFERENCES taxes(id)
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_products_establishment_barcode ON products(establishment_id, barcode);

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

  CREATE TABLE IF NOT EXISTS invoice_series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    establishment_id INTEGER,
    name TEXT,
    prefix TEXT,
    start_number INTEGER,
    current_number INTEGER,
    status TEXT DEFAULT 'active', -- 'active', 'inactive'
    agt_status TEXT DEFAULT 'aprovada', -- 'pendente', 'aprovada', 'rejeitada'
    is_electronic INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(establishment_id) REFERENCES establishments(id)
  );

  CREATE TABLE IF NOT EXISTS taxes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    establishment_id INTEGER,
    name TEXT,
    percentage REAL,
    tax_code TEXT DEFAULT 'NOR', -- 'NOR', 'ISE', 'OUT'
    is_default INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active', -- 'active', 'inactive'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(establishment_id) REFERENCES establishments(id)
  );

  CREATE TABLE IF NOT EXISTS backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER,
    filename TEXT,
    size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS warehouses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    establishment_id INTEGER,
    name TEXT,
    type TEXT, -- 'principal', 'secondary', 'returns', etc.
    status TEXT DEFAULT 'active', -- 'active', 'inactive'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(establishment_id) REFERENCES establishments(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    establishment_id INTEGER,
    seller_id INTEGER,
    cash_register_id INTEGER,
    total_amount REAL,
    payment_method TEXT,
    cash_received REAL,
    discount_percent REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    invoice_number TEXT,
    agt_status TEXT DEFAULT 'pending',
    billing_mode TEXT DEFAULT 'tradicional',
    split_details TEXT,
    client_name TEXT,
    client_nif TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    items TEXT,
    FOREIGN KEY(establishment_id) REFERENCES establishments(id),
    FOREIGN KEY(seller_id) REFERENCES users(id),
    FOREIGN KEY(cash_register_id) REFERENCES cash_registers(id)
  );

  CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    establishment_id INTEGER,
    user_id INTEGER,
    salary REAL,
    shift_info TEXT,
    UNIQUE(establishment_id, user_id),
    FOREIGN KEY(establishment_id) REFERENCES establishments(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS cash_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    establishment_id INTEGER,
    seller_id INTEGER,
    cash_register_id INTEGER,
    type TEXT, -- 'in' or 'out'
    amount REAL,
    description TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(establishment_id) REFERENCES establishments(id),
    FOREIGN KEY(seller_id) REFERENCES users(id),
    FOREIGN KEY(cash_register_id) REFERENCES cash_registers(id)
  );

  CREATE TABLE IF NOT EXISTS cash_registers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    establishment_id INTEGER,
    name TEXT,
    code TEXT UNIQUE,
    default_initial_balance REAL DEFAULT 0,
    max_limit REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(establishment_id) REFERENCES establishments(id)
  );

  CREATE TABLE IF NOT EXISTS cashier_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    establishment_id INTEGER,
    cash_register_id INTEGER,
    seller_id INTEGER,
    opening_amount REAL,
    closing_amount REAL,
    physical_amount REAL,
    opening_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    closing_time DATETIME,
    status TEXT DEFAULT 'open', -- 'open' or 'closed'
    FOREIGN KEY(establishment_id) REFERENCES establishments(id),
    FOREIGN KEY(cash_register_id) REFERENCES cash_registers(id),
    FOREIGN KEY(seller_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    establishment_id INTEGER,
    name TEXT,
    start_date TEXT,
    end_date TEXT,
    discount_percent REAL,
    FOREIGN KEY(establishment_id) REFERENCES establishments(id)
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
    establishment_id INTEGER,
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
    FOREIGN KEY(establishment_id) REFERENCES establishments(id),
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS credit_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    establishment_id INTEGER,
    owner_id INTEGER,
    seller_id INTEGER,
    parent_invoice_id INTEGER,
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
    reason TEXT,
    note_category TEXT,
    adjustment_amount REAL DEFAULT 0,
    observations TEXT,
    items TEXT, -- JSON string
    due_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(establishment_id) REFERENCES establishments(id),
    FOREIGN KEY(owner_id) REFERENCES users(id),
    FOREIGN KEY(seller_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    establishment_id INTEGER,
    name TEXT,
    nif TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    type TEXT DEFAULT 'individual',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(establishment_id) REFERENCES establishments(id)
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
    bonus REAL DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(salary_id) REFERENCES hr_salaries(id)
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER,
    establishment_id INTEGER,
    name TEXT,
    code TEXT,
    description TEXT,
    price REAL,
    availability_condition TEXT, -- 'always' or 'product_purchased'
    show_in_pos INTEGER DEFAULT 1, -- 0 for NO, 1 for YES
    tax_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id),
    FOREIGN KEY(establishment_id) REFERENCES establishments(id),
    FOREIGN KEY(tax_id) REFERENCES taxes(id)
  );

  CREATE TABLE IF NOT EXISTS service_fees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER,
    name TEXT,
    amount REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(service_id) REFERENCES services(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS hr_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    establishment_id INTEGER,
    entry_time DATETIME,
    exit_time DATETIME,
    status TEXT, -- 'present', 'late', 'absent', 'half_day'
    date TEXT, -- YYYY-MM-DD
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(establishment_id) REFERENCES establishments(id)
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
    establishment_id INTEGER,
    supplier_id INTEGER,
    total_amount REAL,
    paid_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'pending', -- 'pending', 'partial', 'paid'
    delivery_status TEXT DEFAULT 'pending',
    received_at DATETIME,
    is_direct INTEGER DEFAULT 0,
    is_stock_updated INTEGER DEFAULT 0,
    is_closed INTEGER DEFAULT 0,
    invoice_number TEXT,
    items TEXT, -- JSON string of items purchased
    due_date DATETIME,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(establishment_id) REFERENCES establishments(id),
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

  CREATE TABLE IF NOT EXISTS purchase_returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    establishment_id INTEGER,
    supplier_id INTEGER,
    purchase_id INTEGER,
    total_amount REAL,
    tax_amount REAL DEFAULT 0,
    reason TEXT,
    items TEXT,
    type TEXT DEFAULT 'credit',
    note_category TEXT DEFAULT 'return',
    adjustment_amount REAL DEFAULT 0,
    observations TEXT,
    invoice_number TEXT,
    status TEXT DEFAULT 'pending',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(establishment_id) REFERENCES establishments(id),
    FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY(purchase_id) REFERENCES purchases(id)
  );

  CREATE TABLE IF NOT EXISTS billing_mode_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER,
    changed_by INTEGER,
    old_mode TEXT,
    new_mode TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id),
    FOREIGN KEY(changed_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS company_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER,
    public_key TEXT,
    private_key_encrypted TEXT,
    version INTEGER,
    is_active INTEGER DEFAULT 1,
    type TEXT DEFAULT 'internal', -- 'internal', 'external'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY(owner_id) REFERENCES users(id),
    FOREIGN KEY(created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS key_management_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER,
    user_id INTEGER,
    action TEXT,
    old_key_id INTEGER,
    new_key_id INTEGER,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Migration: Rename stores to establishments and store_id to establishment_id
try {
  // 1. Rename table 'stores' to 'establishments'
  const tableInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='stores'").get();
  if (tableInfo) {
    db.exec("ALTER TABLE stores RENAME TO establishments");
    console.log("Table 'stores' renamed to 'establishments'");
  }

  // 2. Rename 'store_id' to 'establishment_id' in all relevant tables
  const tablesToUpdate = [
    'users', 'licenses', 'financial_transactions', 'accounts_receivable', 
    'accounts_payable', 'products', 'transactions', 'cash_registers', 
    'cashier_sessions', 'cash_movements', 'hr_attendance', 'services', 
    'stock_movements', 'purchases', 'proforma_invoices', 'invoice_series'
  ];

  for (const table of tablesToUpdate) {
    try {
      const columns = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
      if (columns.some(col => col.name === 'store_id') && !columns.some(col => col.name === 'establishment_id')) {
        db.exec(`ALTER TABLE ${table} RENAME COLUMN store_id TO establishment_id`);
        console.log(`Column 'store_id' in '${table}' renamed to 'establishment_id'`);
      }
    } catch (e) {
      console.error(`Error renaming column in ${table}:`, e);
    }
  }
} catch (e) {
  console.error("Migration error (renaming stores to establishments):", e);
}

// Migration: Ensure default owner has a license
try {
  const owner = db.prepare("SELECT id FROM users WHERE email = 'owner@factu.com'").get() as any;
  if (owner) {
    const license = db.prepare("SELECT id FROM licenses WHERE user_id = ?").get(owner.id);
    if (!license) {
      db.prepare(`
        INSERT INTO licenses (user_id, establishment_id, plan_type, start_date, expiry_date, status, features)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(owner.id, 1, 'enterprise', new Date().toISOString(), '2026-12-31', 'active', '{"reports": true, "multi_establishment": true, "api_access": true}');
      console.log("Default license added for owner@factu.com");
    }
  }
} catch (e) {
  console.error("Migration error (default license):", e);
}

// Migration: Add missing columns
try {
  // Users migrations
  const userColumns = db.prepare("PRAGMA table_info(users)").all() as any[];
  if (!userColumns.some(col => col.name === 'phone')) db.exec("ALTER TABLE users ADD COLUMN phone TEXT");
  if (!userColumns.some(col => col.name === 'nif')) db.exec("ALTER TABLE users ADD COLUMN nif TEXT");
  if (!userColumns.some(col => col.name === 'address')) db.exec("ALTER TABLE users ADD COLUMN address TEXT");
  if (!userColumns.some(col => col.name === 'company_name')) db.exec("ALTER TABLE users ADD COLUMN company_name TEXT");
  if (!userColumns.some(col => col.name === 'status')) {
    db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'");
  }
  db.exec("UPDATE users SET status = 'active' WHERE status IS NULL");
  if (!userColumns.some(col => col.name === 'username')) {
    db.exec("ALTER TABLE users ADD COLUMN username TEXT");
    db.exec("UPDATE users SET username = email WHERE username IS NULL");
  }
  if (!userColumns.some(col => col.name === 'created_at')) {
    db.exec("ALTER TABLE users ADD COLUMN created_at DATETIME");
    db.exec("UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL");
  }
  if (!userColumns.some(col => col.name === 'role_id')) db.exec("ALTER TABLE users ADD COLUMN role_id INTEGER");
  if (!userColumns.some(col => col.name === 'custom_permissions')) db.exec("ALTER TABLE users ADD COLUMN custom_permissions TEXT");
  if (!userColumns.some(col => col.name === 'establishment_id')) db.exec("ALTER TABLE users ADD COLUMN establishment_id INTEGER");
  if (!userColumns.some(col => col.name === 'cash_register_id')) db.exec("ALTER TABLE users ADD COLUMN cash_register_id INTEGER");
  if (!userColumns.some(col => col.name === 'fiscal_regime')) {
    db.exec("ALTER TABLE users ADD COLUMN fiscal_regime TEXT DEFAULT 'geral'");
    db.exec("UPDATE users SET fiscal_regime = 'geral' WHERE fiscal_regime IS NULL OR fiscal_regime = ''");
  }
  if (!userColumns.some(col => col.name === 'billing_mode')) {
    db.exec("ALTER TABLE users ADD COLUMN billing_mode TEXT DEFAULT 'tradicional'");
    db.exec("UPDATE users SET billing_mode = 'tradicional' WHERE billing_mode IS NULL OR billing_mode = ''");
  }

  // Transactions migrations
  const transColumns = db.prepare("PRAGMA table_info(transactions)").all() as any[];
  if (!transColumns.some(col => col.name === 'billing_mode')) {
    db.exec("ALTER TABLE transactions ADD COLUMN billing_mode TEXT DEFAULT 'tradicional'");
    db.exec("UPDATE transactions SET billing_mode = 'tradicional' WHERE billing_mode IS NULL OR billing_mode = ''");
  }
  if (!transColumns.some(col => col.name === 'hash')) db.exec("ALTER TABLE transactions ADD COLUMN hash TEXT");
  if (!transColumns.some(col => col.name === 'signature')) db.exec("ALTER TABLE transactions ADD COLUMN signature TEXT");
  if (!transColumns.some(col => col.name === 'prev_signature')) db.exec("ALTER TABLE transactions ADD COLUMN prev_signature TEXT");
  if (!transColumns.some(col => col.name === 'key_version_id')) db.exec("ALTER TABLE transactions ADD COLUMN key_version_id INTEGER");

  const ciColumns = db.prepare("PRAGMA table_info(credit_invoices)").all() as any[];
  if (!ciColumns.some(col => col.name === 'hash')) db.exec("ALTER TABLE credit_invoices ADD COLUMN hash TEXT");
  if (!ciColumns.some(col => col.name === 'signature')) db.exec("ALTER TABLE credit_invoices ADD COLUMN signature TEXT");
  if (!ciColumns.some(col => col.name === 'prev_signature')) db.exec("ALTER TABLE credit_invoices ADD COLUMN prev_signature TEXT");
  if (!ciColumns.some(col => col.name === 'key_version_id')) db.exec("ALTER TABLE credit_invoices ADD COLUMN key_version_id INTEGER");

  const piColumns = db.prepare("PRAGMA table_info(proforma_invoices)").all() as any[];
  if (!piColumns.some(col => col.name === 'hash')) db.exec("ALTER TABLE proforma_invoices ADD COLUMN hash TEXT");
  if (!piColumns.some(col => col.name === 'signature')) db.exec("ALTER TABLE proforma_invoices ADD COLUMN signature TEXT");
  if (!piColumns.some(col => col.name === 'prev_signature')) db.exec("ALTER TABLE proforma_invoices ADD COLUMN prev_signature TEXT");
  if (!piColumns.some(col => col.name === 'key_version_id')) db.exec("ALTER TABLE proforma_invoices ADD COLUMN key_version_id INTEGER");

  // Services migrations
  const serviceColumns = db.prepare("PRAGMA table_info(services)").all() as any[];
  if (!serviceColumns.some(col => col.name === 'retention_enabled')) {
    db.exec("ALTER TABLE services ADD COLUMN retention_enabled INTEGER DEFAULT 0");
  }

  // Invoice Series migrations
  const seriesColumns = db.prepare("PRAGMA table_info(invoice_series)").all() as any[];
  if (!seriesColumns.some(col => col.name === 'agt_status')) {
    db.exec("ALTER TABLE invoice_series ADD COLUMN agt_status TEXT DEFAULT 'aprovada'");
    db.exec("UPDATE invoice_series SET agt_status = 'aprovada'");
  }
  if (!seriesColumns.some(col => col.name === 'is_electronic')) {
    db.exec("ALTER TABLE invoice_series ADD COLUMN is_electronic INTEGER DEFAULT 0");
  }
  if (!serviceColumns.some(col => col.name === 'retention_percentage')) {
    db.exec("ALTER TABLE services ADD COLUMN retention_percentage REAL DEFAULT 0");
  }

  // Stores migrations
  const establishmentColumns = db.prepare("PRAGMA table_info(establishments)").all() as any[];
  if (!establishmentColumns.some(col => col.name === 'email')) db.exec("ALTER TABLE establishments ADD COLUMN email TEXT");
  if (!establishmentColumns.some(col => col.name === 'establishment_code')) db.exec("ALTER TABLE establishments ADD COLUMN establishment_code TEXT");

  // HR migrations
  const hrPaymentColumns = db.prepare("PRAGMA table_info(hr_salary_payments)").all() as any[];
  if (!hrPaymentColumns.some(col => col.name === 'bonus')) db.exec("ALTER TABLE hr_salary_payments ADD COLUMN bonus REAL DEFAULT 0");

  // Support tickets migrations
  const ticketColumns = db.prepare("PRAGMA table_info(support_tickets)").all() as any[];
  if (!ticketColumns.some(col => col.name === 'created_at')) {
    db.exec("ALTER TABLE support_tickets ADD COLUMN created_at DATETIME");
    db.exec("UPDATE support_tickets SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL");
  }
  if (!ticketColumns.some(col => col.name === 'updated_at')) {
    db.exec("ALTER TABLE support_tickets ADD COLUMN updated_at DATETIME");
    db.exec("UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL");
  }
  if (!ticketColumns.some(col => col.name === 'priority')) {
    db.exec("ALTER TABLE support_tickets ADD COLUMN priority TEXT DEFAULT 'medium'");
  }

  // Products migrations
  const productColumns = db.prepare("PRAGMA table_info(products)").all() as any[];
  if (!productColumns.some(col => col.name === 'warehouse_id')) {
    db.exec("ALTER TABLE products ADD COLUMN warehouse_id INTEGER");
  }

  // Ensure every establishment has at least one warehouse
  const establishments = db.prepare("SELECT id FROM establishments").all() as { id: number }[];
  establishments.forEach(est => {
    const warehouse = db.prepare("SELECT id FROM warehouses WHERE establishment_id = ?").get(est.id);
    if (!warehouse) {
      db.prepare("INSERT INTO warehouses (establishment_id, name, type) VALUES (?, ?, ?)").run(est.id, 'Armazém Principal', 'principal');
    }
  });

  // Link products to a warehouse if they are not linked
  db.exec(`
    UPDATE products 
    SET warehouse_id = (
      SELECT id FROM warehouses 
      WHERE establishment_id = products.establishment_id 
      LIMIT 1
    ) 
    WHERE warehouse_id IS NULL
  `);
} catch (e) {
  console.error("Migration error:", e);
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
  const columns = db.prepare("PRAGMA table_info(establishments)").all() as any[];
  if (!columns.some(col => col.name === 'created_at')) {
    db.exec("ALTER TABLE establishments ADD COLUMN created_at DATETIME");
    db.exec("UPDATE establishments SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL");
  }
  if (!columns.some(col => col.name === 'nif')) db.exec("ALTER TABLE establishments ADD COLUMN nif TEXT");
  if (!columns.some(col => col.name === 'phone')) db.exec("ALTER TABLE establishments ADD COLUMN phone TEXT");
  if (!columns.some(col => col.name === 'bank_accounts')) db.exec("ALTER TABLE establishments ADD COLUMN bank_accounts TEXT");
} catch (e) {
  console.error("Migration error (establishments):", e);
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
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_products_establishment_barcode ON products(establishment_id, barcode)");
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
    establishment_id INTEGER,
    product_id INTEGER,
    user_id INTEGER,
    type TEXT, -- 'in', 'out', 'transfer', 'adjustment'
    quantity INTEGER,
    reason TEXT,
    from_establishment_id INTEGER,
    to_establishment_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(establishment_id) REFERENCES establishments(id),
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

  try {
    const columns = db.prepare("PRAGMA table_info(stock_movements)").all() as any[];
    if (!columns.some(col => col.name === 'from_establishment_id')) {
      db.exec("ALTER TABLE stock_movements ADD COLUMN from_establishment_id INTEGER");
    }
    if (!columns.some(col => col.name === 'to_establishment_id')) {
      db.exec("ALTER TABLE stock_movements ADD COLUMN to_establishment_id INTEGER");
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
    if (!columns.some(col => col.name === 'note_category')) {
      db.exec("ALTER TABLE purchase_returns ADD COLUMN note_category TEXT DEFAULT 'return'");
    }
    if (!columns.some(col => col.name === 'adjustment_amount')) {
      db.exec("ALTER TABLE purchase_returns ADD COLUMN adjustment_amount REAL DEFAULT 0");
    }
    if (!columns.some(col => col.name === 'observations')) {
      db.exec("ALTER TABLE purchase_returns ADD COLUMN observations TEXT");
    }
    if (!columns.some(col => col.name === 'invoice_number')) {
      db.exec("ALTER TABLE purchase_returns ADD COLUMN invoice_number TEXT");
    }
  } catch (e) {
    console.error("Migration error (purchase_returns):", e);
  }

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
    establishment_id INTEGER,
    name TEXT,
    code TEXT,
    description TEXT,
    price REAL,
    availability_condition TEXT, -- 'always' or 'product_purchased'
    show_in_pos INTEGER DEFAULT 1, -- 0 for NO, 1 for YES
    tax_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id),
    FOREIGN KEY(establishment_id) REFERENCES establishments(id),
    FOREIGN KEY(tax_id) REFERENCES taxes(id)
  );
  `);

  db.exec(`
  CREATE TABLE IF NOT EXISTS hr_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    establishment_id INTEGER,
    entry_time DATETIME,
    exit_time DATETIME,
    status TEXT, -- 'present', 'late', 'absent', 'half_day'
    date TEXT, -- YYYY-MM-DD
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(establishment_id) REFERENCES establishments(id)
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
    establishment_id INTEGER,
    supplier_id INTEGER,
    total_amount REAL,
    paid_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'pending', -- 'pending', 'partial', 'paid'
    invoice_number TEXT,
    items TEXT, -- JSON string of items purchased
    due_date DATETIME,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(establishment_id) REFERENCES establishments(id),
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
    db.exec("ALTER TABLE transactions ADD COLUMN agt_status TEXT DEFAULT 'pending'");
  }

  // Digital Signature Columns
  const tablesToUpdate = ['transactions', 'credit_invoices', 'proforma_invoices'];
  for (const table of tablesToUpdate) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
    if (!cols.some(c => c.name === 'hash')) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN hash TEXT`);
    }
    if (!cols.some(c => c.name === 'signature')) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN signature TEXT`);
    }
    if (!cols.some(c => c.name === 'prev_signature')) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN prev_signature TEXT`);
    }
    if (!cols.some(c => c.name === 'key_version_id')) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN key_version_id INTEGER`);
    }
  }

  const columnsPurchases = db.prepare("PRAGMA table_info(purchases)").all() as any[];
  if (!columnsPurchases.some(col => col.name === 'delivery_status')) {
    db.exec("ALTER TABLE purchases ADD COLUMN delivery_status TEXT DEFAULT 'pending'");
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
  if (!columnsPurchases.some(col => col.name === 'tax_amount')) {
    db.exec("ALTER TABLE purchases ADD COLUMN tax_amount REAL DEFAULT 0");
  }

  const columnsPurchaseReturns = db.prepare("PRAGMA table_info(purchase_returns)").all() as any[];
  if (!columnsPurchaseReturns.some(col => col.name === 'tax_amount')) {
    db.exec("ALTER TABLE purchase_returns ADD COLUMN tax_amount REAL DEFAULT 0");
  }

  // Finance integration migrations
  try {
    const ciCols = db.prepare("PRAGMA table_info(credit_invoices)").all() as any[];
    if (!ciCols.some(col => col.name === 'status')) {
      db.exec("ALTER TABLE credit_invoices ADD COLUMN status TEXT DEFAULT 'pending'");
    }

    const arCols = db.prepare("PRAGMA table_info(accounts_receivable)").all() as any[];
    if (!arCols.some(col => col.name === 'invoice_id')) {
      db.exec("ALTER TABLE accounts_receivable ADD COLUMN invoice_id INTEGER");
    }

    const apCols = db.prepare("PRAGMA table_info(accounts_payable)").all() as any[];
    if (!apCols.some(col => col.name === 'purchase_id')) {
      db.exec("ALTER TABLE accounts_payable ADD COLUMN purchase_id INTEGER");
    }
  } catch (e) {
    console.error("Migration error (finance integration):", e);
  }
} catch (e) {
  console.error("Migration error (purchases/returns/transactions):", e);
}


try {
  const columns = db.prepare("PRAGMA table_info(credit_invoices)").all() as any[];
  if (!columns.some(col => col.name === 'due_date')) {
    db.exec("ALTER TABLE credit_invoices ADD COLUMN due_date TEXT");
  }
  if (!columns.some(col => col.name === 'service_designation')) {
    db.exec("ALTER TABLE credit_invoices ADD COLUMN service_designation TEXT");
  }
} catch (e) {}

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
  db.prepare("INSERT INTO users (email, password, name, role, phone, nif, address) VALUES (?, ?, ?, ?, ?, ?, ?)").run("owner@factu.com", "owner", "Dono do Estabelecimento", "owner", "923000000", "540123456", "Luanda, Angola");
  db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)").run("seller@factu.com", "seller", "Vendedor 1", "seller");
  
  db.prepare("INSERT INTO establishments (owner_id, name, address, license_expiry) VALUES (?, ?, ?, ?)").run(2, "Meu Estabelecimento A", "Rua 1, Luanda", "2026-12-31");
  db.prepare("INSERT INTO establishments (owner_id, name, address, license_expiry) VALUES (?, ?, ?, ?)").run(2, "Meu Estabelecimento B", "Rua 2, Luanda", "2026-12-31");
  
  db.prepare("INSERT INTO system_plans (name, price, max_establishments, max_products, features) VALUES (?, ?, ?, ?, ?)").run("Básico", 5000, 1, 100, '{"reports": false, "multi_establishment": false}');
  db.prepare("INSERT INTO system_plans (name, price, max_establishments, max_products, features) VALUES (?, ?, ?, ?, ?)").run("Profissional", 15000, 2, 1000, '{"reports": true, "multi_establishment": true}');
  db.prepare("INSERT INTO system_plans (name, price, max_establishments, max_products, features) VALUES (?, ?, ?, ?, ?)").run("Empresarial", 35000, 10, 5000, '{"reports": true, "multi_establishment": true, "api_access": true}');
  
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
  db.prepare("INSERT INTO staff (establishment_id, user_id, salary, shift_info) VALUES (?, ?, ?, ?)").run(1, 3, 50000, "Manhã");

  // Seed License for the default owner
  db.prepare(`
    INSERT INTO licenses (user_id, establishment_id, plan_type, start_date, expiry_date, status, features)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(2, 1, 'enterprise', new Date().toISOString(), '2026-12-31', 'active', '{"reports": true, "multi_establishment": true, "api_access": true}');
}

// Migration: Generate keys for existing owners
try {
  const owners = db.prepare("SELECT id, email FROM users WHERE role = 'owner'").all() as { id: number, email: string }[];
  console.log(`Checking digital signature keys for ${owners.length} owners...`);
  for (const owner of owners) {
    const activeKey = DigitalSignatureService.getActiveKey(owner.id);
    if (!activeKey) {
      console.log(`Generating initial keys for owner ${owner.id} (${owner.email})`);
      try {
        DigitalSignatureService.generateCompanyKeys(owner.id, owner.id);
        console.log(`Successfully generated keys for owner ${owner.id}`);
      } catch (genError) {
        console.error(`Failed to generate keys for owner ${owner.id}:`, genError);
      }
    } else {
      console.log(`Owner ${owner.id} already has an active key.`);
    }
  }
} catch (e) {
  console.error("Error in digital signature migration:", e);
}

// Cleanup test products once
db.exec("DELETE FROM products WHERE establishment_id = 1 AND name IN ('Cuca Garrafa 33cl', 'Nocal Garrafa 33cl', 'Eka Garrafa 33cl', 'Doppel Munich', 'Booster Cider', 'Coca-Cola Lata', 'Pão Francês', 'Morango Fresco', 'Perfume Chanel N5', 'Blue Polpa 33cl', 'Arroz Tio Lucas 1kg', 'Sabonete Dove', 'Leite Nido 400g', 'Massa Esparguete', 'Vinho Pera Doce', 'Detergente Omo 1kg', 'Óleo Alimentar 1L', 'N''Gola Garrafa', '33 Export', 'Bolachas Maria')");

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
  
  // Request Logger
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API Request] ${req.method} ${req.path}`);
    }
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  const PORT = 3000;

  // --- API Routes ---
  app.post("/api/v1/process-checkout", (req, res) => {
    try {
      const { 
        establishment_id, seller_id, cash_register_id, total_amount, items, payment_method, 
        cash_received, split_details, client_name, client_nif,
        discount_percent, discount_amount, tax_amount
      } = req.body;

      if (!establishment_id || !seller_id || !items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Dados da venda incompletos ou inválidos." });
      }

      // Check for active cashier session
      let sessionQuery = "SELECT id FROM cashier_sessions WHERE establishment_id = ? AND status = 'open'";
      let sessionParams: any[] = [establishment_id];
      if (cash_register_id) {
        sessionQuery += " AND cash_register_id = ?";
        sessionParams.push(cash_register_id);
      }
      const activeSession = db.prepare(sessionQuery).get(...sessionParams);
      if (!activeSession) {
        return res.status(403).json({ error: "O caixa deve estar aberto para realizar vendas." });
      }
      
      // Get Billing Mode and Series
      const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
      if (!establishment) {
        return res.status(404).json({ error: "Estabelecimento não encontrado." });
      }
      const owner = db.prepare("SELECT billing_mode FROM users WHERE id = ?").get(establishment.owner_id) as any;
      const billing_mode = (owner?.billing_mode === 'eletronica') ? 'eletronica' : 'tradicional';
      const seriesPrefix = billing_mode === 'eletronica' ? 'E' : 'A';
      
      // CRITICAL: Ensure no 'E' series is active if we are in traditional mode, and vice-versa
      db.prepare("UPDATE invoice_series SET status = 'inactive' WHERE establishment_id = ? AND prefix != ? AND status = 'active'").run(establishment_id, seriesPrefix);

      // Find active series for this establishment and prefix
      let series = db.prepare("SELECT * FROM invoice_series WHERE establishment_id = ? AND prefix = ? AND status = 'active' ORDER BY id DESC LIMIT 1").get(establishment_id, seriesPrefix) as any;
      
      if (!series) {
        // Create a default series if none exists
        const seriesName = billing_mode === 'eletronica' ? 'Série Eletrónica' : 'Série Tradicional';
        const info = db.prepare(`
          INSERT INTO invoice_series (establishment_id, name, prefix, start_number, current_number, status, agt_status, is_electronic)
          VALUES (?, ?, ?, 1, 0, 'active', 'aprovada', ?)
        `).run(
          establishment_id, 
          seriesName, 
          seriesPrefix,
          billing_mode === 'eletronica' ? 1 : 0
        );
        series = db.prepare("SELECT * FROM invoice_series WHERE id = ?").get(info.lastInsertRowid) as any;
      }

      if (billing_mode === 'eletronica' && series.agt_status !== 'aprovada') {
        return res.status(403).json({ 
          error: "A série de faturação eletrónica ainda não foi aprovada pela AGT.",
          series_status: series.agt_status
        });
      }

      const year = new Date().getFullYear();
      const nextNumber = Math.max(series.current_number + 1, series.start_number);
      // FORCE: Use seriesPrefix to ensure it matches the billing mode exactly (A for traditional, E for electronic)
      const invoice_number = `FR ${seriesPrefix}/${year}/${nextNumber.toString().padStart(4, '0')}`;

      // Update series current number
      db.prepare("UPDATE invoice_series SET current_number = ? WHERE id = ?").run(nextNumber, series.id);

      // AGT Status Simulation
      let agt_status = 'pending';
      if (billing_mode === 'eletronica') {
        // Simulate AGT validation
        const isAccepted = Math.random() > 0.05; // 95% success rate
        agt_status = isAccepted ? 'accepted' : 'rejected';
      } else {
        agt_status = 'sent'; // In traditional mode, it's considered "sent" to the system
      }

      // Digital Signature
      const signatureData = DigitalSignatureService.signDocument(establishment.owner_id, establishment_id, {
        invoice_number,
        total_amount,
        date: new Date().toISOString(),
        items: JSON.stringify(items)
      });

      const info = db.prepare(`
        INSERT INTO transactions (
          establishment_id, seller_id, cash_register_id, total_amount, items, payment_method, 
          cash_received, split_details, client_name, client_nif,
          discount_percent, discount_amount, tax_amount, invoice_number, agt_status, billing_mode,
          hash, signature, prev_signature, key_version_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        establishment_id, 
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
        agt_status,
        billing_mode,
        signatureData.hash,
        signatureData.signature,
        signatureData.prev_signature,
        signatureData.key_version_id
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
        
        // Record in financial_transactions
        try {
          const establishmentData = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
          if (establishmentData) {
            db.prepare(`
              INSERT INTO financial_transactions (
                establishment_id, owner_id, type, category, amount, payment_method, description, date, status, reference_id
              ) VALUES (?, ?, 'income', 'Venda POS', ?, ?, ?, ?, 'paid', ?)
            `).run(
              establishment_id, establishmentData.owner_id, total_amount, payment_method || 'cash',
              `Venda POS - Fatura ${invoice_number}`, new Date().toISOString(), sale.id
            );
          }
        } catch (finError) {
          console.error("Error recording financial transaction for sale:", finError);
        }
        // --- SAF-T JSON Generation & AGT Submission ---
        try {
          const establishmentData = db.prepare("SELECT * FROM establishments WHERE id = ?").get(establishment_id) as any;
          const saftData = {
            Header: {
              InvoiceNo: invoice_number,
              InvoiceDate: new Date(sale.timestamp).toISOString().split('T')[0],
              SystemEntryDate: new Date(sale.timestamp).toISOString(),
              EstablishmentName: establishmentData.name,
              EstablishmentNIF: establishmentData.nif,
              ClientName: client_name || 'Consumidor Final',
              ClientNIF: client_nif || '999999999'
            },
            Items: sale.items.map((item: any) => {
              const itemTaxPercentage = item.tax_percentage !== undefined ? item.tax_percentage : 14;
              return {
                ProductCode: item.barcode || item.id,
                ProductDescription: item.name,
                Quantity: item.quantity,
                UnitPrice: item.price,
                TaxAmount: (item.price * item.quantity * (itemTaxPercentage / 100)),
                TotalAmount: item.price * item.quantity
              };
            }),
            Totals: {
              GrossTotal: total_amount,
              TaxPayable: tax_amount,
              NetTotal: total_amount - tax_amount
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
          // Only update to 'sent' if it's not already 'accepted' or 'rejected'
          if (billing_mode !== 'eletronica') {
            db.prepare("UPDATE transactions SET agt_status = 'sent' WHERE id = ?").run(sale.id);
          }
          
        } catch (saftError) {
          console.error("Error generating SAF-T or submitting to AGT:", saftError);
          db.prepare("UPDATE transactions SET agt_status = 'error' WHERE id = ?").run(sale.id);
        }
        // ----------------------------------------------
      }
      
      res.json({ success: true, sale });
    } catch (error: any) {
      console.error("Error finalizing sale:", error);
      res.status(500).json({ error: error.message || "Erro interno ao finalizar venda." });
    }
  });

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

      let establishmentId = user.establishment_id;
      let ownerId = user.id;

      if (user.role === 'seller' || user.role === 'manager') {
        if (!establishmentId) {
          const staff = db.prepare("SELECT establishment_id FROM staff WHERE user_id = ?").get(user.id) as any;
          if (staff) establishmentId = staff.establishment_id;
        }
        
        if (establishmentId) {
          const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishmentId) as any;
          if (establishment) ownerId = establishment.owner_id;
        } else if (user.role === 'seller') {
          return res.status(403).json({ error: "Esta conta de vendedor foi desativada ou não está vinculada a nenhum estabelecimento." });
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
          // Check if they have any establishments. If they do, and no active license, block.
          const establishmentCount = db.prepare("SELECT count(*) as count FROM establishments WHERE owner_id = ?").get(ownerId) as any;
          if (establishmentCount.count > 0) {
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

      let fiscalRegime = user.fiscal_regime;
      let billingMode = user.billing_mode;
      
      if (user.role === 'seller' && establishmentId) {
        const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishmentId) as any;
        if (establishment) {
          const owner = db.prepare("SELECT fiscal_regime, billing_mode FROM users WHERE id = ?").get(establishment.owner_id) as any;
          if (owner) {
            fiscalRegime = owner.fiscal_regime;
            billingMode = owner.billing_mode;
          }
        }
      }

      // Record presence (system type)
      if (user.role !== 'admin' && user.role !== 'owner') {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toISOString();
        
        try {
          db.prepare(`
            INSERT INTO hr_attendance (user_id, establishment_id, entry_time, date, type, status)
            VALUES (?, ?, ?, ?, 'system', 'present')
          `).run(user.id, establishmentId || null, timeStr, dateStr);
        } catch (e) {
          console.error("Error recording attendance on login:", e);
        }
      }

      res.json({ 
        id: user.id, 
        email: user.email, 
        username: user.username, 
        name: user.name, 
        role: user.role, 
        establishment_id: establishmentId,
        role_id: user.role_id,
        custom_permissions: user.custom_permissions,
        permissions: effectivePermissions,
        status: user.status,
        fiscal_regime: fiscalRegime || 'geral',
        billing_mode: billingMode || 'tradicional'
      });
    } else {
      res.status(401).json({ error: "Credenciais inválidas" });
    }
  });

  app.post("/api/attendance/logout", (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "UserId is required" });

    try {
      const now = new Date().toISOString();
      // Update the last system attendance record for this user that doesn't have an exit_time
      // Use subquery for compatibility as ORDER BY/LIMIT in UPDATE is not standard in all SQLite builds
      db.prepare(`
        UPDATE hr_attendance 
        SET exit_time = ? 
        WHERE id = (
          SELECT id FROM hr_attendance 
          WHERE user_id = ? AND type = 'system' AND exit_time IS NULL 
          ORDER BY id DESC LIMIT 1
        )
      `).run(now, userId);
      res.json({ success: true });
    } catch (e) {
      console.error("Error updated attendance on logout:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Middleware to check if client is suspended
  const checkSuspended = (req: any, res: any, next: any) => {
    // Skip check for admin routes or login
    if (req.path.startsWith('/api/admin') || req.path === '/api/login' || req.path === '/api/register') {
      return next();
    }

    const userId = req.headers['x-user-id'] || req.query.userId || req.body.user_id || req.body.owner_id || req.body.seller_id;
    const establishmentId = req.headers['x-establishment-id'] || req.headers['x-store-id'] || req.query.establishmentId || req.query.storeId || req.body.establishment_id || req.body.store_id;

    let ownerId = null;
    let currentEstablishmentId = establishmentId;

    // Try to extract ID from path if not found in headers/body
    let idFromPath = null;
    const pathParts = req.path.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && !isNaN(parseInt(lastPart))) {
      idFromPath = parseInt(lastPart);
    }

    const effectiveUserId = userId || (req.path.includes('user') || req.path.includes('owner') || req.path.includes('seller') ? idFromPath : null);
    const effectiveEstablishmentId = establishmentId || (req.path.includes('establishment') ? idFromPath : null);
    
    if (effectiveEstablishmentId) currentEstablishmentId = effectiveEstablishmentId;

    if (effectiveUserId) {
      const user = db.prepare("SELECT id, role, status FROM users WHERE id = ?").get(effectiveUserId) as any;
      if (user) {
        if (user.role === 'owner') {
          ownerId = user.id;
        } else if (user.role === 'seller') {
          const staff = db.prepare("SELECT establishment_id FROM staff WHERE user_id = ?").get(user.id) as any;
          if (staff) {
            currentEstablishmentId = staff.establishment_id;
            const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(staff.establishment_id) as any;
            if (establishment) ownerId = establishment.owner_id;
          }
        }
      }
    } 
    
    if (!ownerId && currentEstablishmentId) {
      const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(currentEstablishmentId) as any;
      if (establishment) ownerId = establishment.owner_id;
    }

    if (ownerId) {
      const owner = db.prepare("SELECT status, billing_mode FROM users WHERE id = ?").get(ownerId) as any;
      
      // If it's the checkout route and billing mode is electronic, we bypass the suspension/license check (simulation mode)
      if (req.path.includes('process-checkout') && owner?.billing_mode === 'eletronica') {
        return next();
      }

      if (owner && owner.status === 'suspended') {
        return res.status(403).json({ error: "Acesso suspenso. Contacte o administrador." });
      }

      // Check if owner has ANY active license to allow dashboard access
      // But if they are accessing a specific establishment, check that establishment's license
      if (currentEstablishmentId) {
        const establishment = db.prepare("SELECT license_status, license_expiry FROM establishments WHERE id = ?").get(currentEstablishmentId) as any;
        if (establishment && (establishment.license_status === 'expired' || (establishment.license_expiry && new Date(establishment.license_expiry) < new Date()))) {
          return res.status(403).json({ error: "Licença expirada para este estabelecimento. Por favor, renove a sua subscrição." });
        }
      } else {
        // Global check for owner: must have at least one active license or be in trial
        const activeLicense = db.prepare(`
          SELECT id FROM licenses 
          WHERE user_id = ? AND status = 'active' AND date(expiry_date) >= date('now')
          LIMIT 1
        `).get(ownerId);
        
        if (!activeLicense) {
          // Check if they have any establishments at all (if new user, allow)
          const establishmentCount = db.prepare("SELECT count(*) as count FROM establishments WHERE owner_id = ?").get(ownerId) as any;
          if (establishmentCount.count > 0) {
            return res.status(403).json({ error: "A sua licença expirou. Por favor, contacte o suporte para renovar." });
          }
        }
      }
    }

    next();
  };

  app.get("/api/user-status/:userId", (req, res) => {
    try {
      const { userId } = req.params;
      const user = db.prepare("SELECT id, role, status, name FROM users WHERE id = ?").get(userId) as any;
      if (!user) return res.status(404).json({ error: "Utilizador não encontrado" });

      const { ownerId } = getContextData(userId);
      let owner = null;
      let activeLicense = null;

      if (ownerId) {
        owner = db.prepare("SELECT status, fiscal_regime, billing_mode FROM users WHERE id = ?").get(ownerId) as any;
        if (owner && owner.status === 'suspended') {
          return res.status(403).json({ error: "A sua conta/acesso está suspensa. Contacte o administrador." });
        }

        // License check for owner
        activeLicense = db.prepare(`
          SELECT id FROM licenses 
          WHERE user_id = ? AND status = 'active' AND date(expiry_date) >= date('now')
          LIMIT 1
        `).get(ownerId);

        if (!activeLicense) {
          const establishmentCount = db.prepare("SELECT count(*) as count FROM establishments WHERE owner_id = ?").get(ownerId) as any;
          if (establishmentCount.count > 0) {
            return res.status(403).json({ error: "Licença expirada para o estabelecimento associado." });
          }
        }
      }

      res.json({ 
        id: user.id, 
        role: user.role, 
        status: user.status, 
        fiscal_regime: owner?.fiscal_regime || 'geral',
        billing_mode: owner?.billing_mode || 'tradicional',
        hasActiveLicense: !!activeLicense 
      });
    } catch (e: any) {
      console.error("Error in user-status:", e);
      res.status(500).json({ error: "Erro interno ao verificar estado." });
    }
  });

  app.use("/api/owner", checkSuspended);
  app.use("/api/seller", checkSuspended);

  // Admin Routes
  app.get("/api/admin/dashboard", (req, res) => {
    const totalClients = db.prepare("SELECT count(*) as count FROM users WHERE role = 'owner'").get() as any;
    const activeClients = db.prepare("SELECT count(*) as count FROM users WHERE role = 'owner' AND status = 'active'").get() as any;
    const totalEstablishments = db.prepare("SELECT count(*) as count FROM establishments").get() as any;
    const expiredLicenses = db.prepare("SELECT count(*) as count FROM establishments WHERE date(license_expiry) < date('now')").get() as any;
    const expiringSoon = db.prepare("SELECT count(*) as count FROM establishments WHERE date(license_expiry) BETWEEN date('now') AND date('now', '+7 days')").get() as any;
    
    const recentClients = db.prepare("SELECT * FROM users WHERE role = 'owner' ORDER BY created_at DESC LIMIT 5").all();
    const pendingSupport = db.prepare("SELECT count(*) as count FROM support_tickets WHERE status != 'closed'").get() as any;

    res.json({
      stats: {
        totalClients: totalClients.count,
        activeClients: activeClients.count,
        totalEstablishments: totalEstablishments.count,
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
        (SELECT count(*) FROM establishments s WHERE s.owner_id = u.id) as establishment_count,
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

    const establishments = db.prepare("SELECT * FROM establishments WHERE owner_id = ?").all(clientId);
    const licenses = db.prepare(`
      SELECT l.*, s.name as establishment_name 
      FROM licenses l 
      LEFT JOIN establishments s ON l.establishment_id = s.id 
      WHERE l.user_id = ? 
      ORDER BY l.expiry_date DESC
    `).all(clientId);
    const tickets = db.prepare("SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC").all(clientId);
    
    // Stats
    const totalUsers = db.prepare(`
      SELECT count(*) as count 
      FROM staff 
      WHERE establishment_id IN (SELECT id FROM establishments WHERE owner_id = ?)
    `).get(clientId) as any;

    const lastActivity = db.prepare(`
      SELECT timestamp 
      FROM transactions 
      WHERE establishment_id IN (SELECT id FROM establishments WHERE owner_id = ?) 
      ORDER BY timestamp DESC LIMIT 1
    `).get(clientId) as any;

    res.json({
      client,
      establishments,
      licenses,
      tickets,
      stats: {
        totalEstablishments: establishments.length,
        totalUsers: totalUsers?.count || 0,
        lastActivity: lastActivity?.timestamp || null
      }
    });
  });

  app.post("/api/admin/clients", (req, res) => {
    const { name, company_name, email, password, phone, nif, address } = req.body;
    try {
      const result = db.prepare("INSERT INTO users (name, company_name, email, password, role, phone, nif, address) VALUES (?, ?, ?, ?, 'owner', ?, ?, ?)").run(name, company_name, email, password, phone, nif, address);
      const ownerId = result.lastInsertRowid as number;
      
      // Generate digital signature keys
      DigitalSignatureService.generateCompanyKeys(ownerId, ownerId);
      
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

  app.get("/api/admin/client-establishments/:id", (req, res) => {
    const establishments = db.prepare("SELECT * FROM establishments WHERE owner_id = ?").all(req.params.id);
    res.json(establishments);
  });

  app.get("/api/admin/licenses", (req, res) => {
    const licenses = db.prepare(`
      SELECT l.*, u.name as client_name, u.company_name, s.name as establishment_name
      FROM licenses l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN establishments s ON l.establishment_id = s.id
      ORDER BY l.expiry_date DESC
    `).all();
    res.json(licenses);
  });

  app.put("/api/admin/licenses/:id/status", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE licenses SET status = ? WHERE id = ?").run(status, req.params.id);
    
    // Sync with establishment if linked
    const license = db.prepare("SELECT establishment_id FROM licenses WHERE id = ?").get(req.params.id) as any;
    if (license?.establishment_id) {
      db.prepare("UPDATE establishments SET license_status = ? WHERE id = ?").run(status, license.establishment_id);
    }
    
    res.json({ success: true });
  });

  app.put("/api/admin/licenses/:id/renew", (req, res) => {
    const { expiry_date } = req.body;
    db.prepare("UPDATE licenses SET expiry_date = ?, status = 'active' WHERE id = ?").run(expiry_date, req.params.id);
    
    // Also update establishment if linked
    const license = db.prepare("SELECT establishment_id FROM licenses WHERE id = ?").get(req.params.id) as any;
    if (license?.establishment_id) {
      db.prepare("UPDATE establishments SET license_expiry = ?, license_status = 'active' WHERE id = ?").run(expiry_date, license.establishment_id);
    }
    
    res.json({ success: true });
  });

  app.get("/api/admin/licenses/history/:userId", (req, res) => {
    const history = db.prepare(`
      SELECT l.*, s.name as establishment_name
      FROM licenses l
      LEFT JOIN establishments s ON l.establishment_id = s.id
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC
    `).all(req.params.userId);
    res.json(history);
  });

  app.post("/api/admin/licenses", (req, res) => {
    const { user_id, establishment_id, plan_type, start_date, expiry_date, features } = req.body;
    db.prepare(`
      INSERT INTO licenses (user_id, establishment_id, plan_type, start_date, expiry_date, features)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user_id, establishment_id, plan_type, start_date, expiry_date, JSON.stringify(features));
    
    // Update establishment expiry too
    if (establishment_id) {
      db.prepare("UPDATE establishments SET license_expiry = ? WHERE id = ?").run(expiry_date, establishment_id);
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
    const totalEstablishments = db.prepare("SELECT count(*) as count FROM establishments").get() as any;
    
    const recentActivity = db.prepare(`
      SELECT t.id, 'venda' as type, total_amount as value, timestamp, s.name as establishment_name
      FROM transactions t
      JOIN establishments s ON t.establishment_id = s.id
      ORDER BY timestamp DESC LIMIT 15
    `).all();

    const systemAlerts = [];
    
    // Check for low stock products across all establishments
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
        totalEstablishments: totalEstablishments.count
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
    const { name, price, max_establishments, max_products, features } = req.body;
    db.prepare("INSERT INTO system_plans (name, price, max_establishments, max_products, features) VALUES (?, ?, ?, ?, ?)").run(name, price, max_establishments, max_products, JSON.stringify(features));
    res.json({ success: true });
  });

  app.put("/api/admin/plans/:id", (req, res) => {
    const { name, price, max_establishments, max_products, features } = req.body;
    db.prepare("UPDATE system_plans SET name = ?, price = ?, max_establishments = ?, max_products = ?, features = ? WHERE id = ?").run(name, price, max_establishments, max_products, JSON.stringify(features), req.params.id);
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
      SELECT u.id as user_id, s.id as establishment_id, u.name as client_name, s.name as establishment_name, s.license_expiry
      FROM users u
      JOIN establishments s ON u.id = s.owner_id
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

  app.get("/api/admin/establishments", (req, res) => {
    const establishments = db.prepare(`
      SELECT s.*, u.name as owner_name 
      FROM establishments s 
      JOIN users u ON s.owner_id = u.id
    `).all();
    res.json(establishments);
  });

  app.get("/api/admin/transactions", (req, res) => {
    const transactions = db.prepare(`
      SELECT t.*, s.name as establishment_name, u.name as seller_name 
      FROM transactions t 
      JOIN establishments s ON t.establishment_id = s.id
      JOIN users u ON t.seller_id = u.id
      ORDER BY t.timestamp DESC
    `).all();
    res.json(transactions);
  });

  app.get("/api/owner/billing-mode-status/:ownerId", (req, res) => {
    const ownerId = req.params.ownerId;
    
    // Check for pending/draft invoices
    const pendingInvoices = db.prepare(`
      SELECT COUNT(*) as count 
      FROM transactions 
      WHERE (establishment_id IN (SELECT id FROM establishments WHERE owner_id = ?))
      AND agt_status IN ('pending', 'draft')
    `).get(ownerId) as any;

    // Check for uncommunicated invoices based on current mode
    const user = db.prepare("SELECT billing_mode FROM users WHERE id = ?").get(ownerId) as any;
    const currentMode = user?.billing_mode || 'tradicional';
    
    let uncommunicatedCount = 0;
    if (currentMode === 'tradicional') {
      // In traditional, "uncommunicated" means not yet exported
      const uncommunicated = db.prepare(`
        SELECT COUNT(*) as count 
        FROM transactions 
        WHERE (establishment_id IN (SELECT id FROM establishments WHERE owner_id = ?))
        AND billing_mode = 'tradicional'
        AND agt_status NOT IN ('sent', 'accepted')
      `).get(ownerId) as any;
      uncommunicatedCount = uncommunicated.count;
    } else {
      // In electronic, must be 'accepted' or 'rejected_treated'
      const uncommunicated = db.prepare(`
        SELECT COUNT(*) as count 
        FROM transactions 
        WHERE (establishment_id IN (SELECT id FROM establishments WHERE owner_id = ?))
        AND billing_mode = 'eletronica'
        AND agt_status NOT IN ('accepted', 'rejected_treated')
      `).get(ownerId) as any;
      uncommunicatedCount = uncommunicated.count;
    }

    // Check if there are ANY active series
    const activeSeries = db.prepare(`
      SELECT COUNT(*) as count 
      FROM invoice_series 
      WHERE establishment_id IN (SELECT id FROM establishments WHERE owner_id = ?)
      AND status = 'active'
    `).get(ownerId) as any;

    res.json({ 
      hasPendingInvoices: pendingInvoices.count > 0,
      pendingCount: pendingInvoices.count,
      hasUncommunicated: uncommunicatedCount > 0,
      uncommunicatedCount: uncommunicatedCount,
      hasActiveSeries: activeSeries.count > 0,
      currentMode
    });
  });

  app.put("/api/owner/billing-mode/:ownerId", (req, res) => {
    const ownerId = req.params.ownerId;
    const { billing_mode, changed_by } = req.body;

    if (!['tradicional', 'eletronica'].includes(billing_mode)) {
      return res.status(400).json({ error: "Modo de faturação inválido." });
    }

    const user = db.prepare("SELECT billing_mode FROM users WHERE id = ?").get(ownerId) as any;
    const oldMode = user?.billing_mode || 'tradicional';

    // 1. Check for pending/draft invoices
    const pendingInvoices = db.prepare(`
      SELECT COUNT(*) as count 
      FROM transactions 
      WHERE (establishment_id IN (SELECT id FROM establishments WHERE owner_id = ?))
      AND agt_status IN ('pending', 'draft')
    `).get(ownerId) as any;

    if (pendingInvoices.count > 0) {
      return res.status(400).json({ error: "Não é possível mudar o modo com faturas pendentes ou em rascunho." });
    }

    // 2. Check for uncommunicated invoices based on current mode
    let uncommunicatedCount = 0;
    if (oldMode === 'tradicional') {
      const uncommunicated = db.prepare(`
        SELECT COUNT(*) as count 
        FROM transactions 
        WHERE (establishment_id IN (SELECT id FROM establishments WHERE owner_id = ?))
        AND billing_mode = 'tradicional'
        AND agt_status NOT IN ('sent', 'accepted')
      `).get(ownerId) as any;
      uncommunicatedCount = uncommunicated.count;
    } else {
      const uncommunicated = db.prepare(`
        SELECT COUNT(*) as count 
        FROM transactions 
        WHERE (establishment_id IN (SELECT id FROM establishments WHERE owner_id = ?))
        AND billing_mode = 'eletronica'
        AND agt_status NOT IN ('accepted', 'rejected_treated')
      `).get(ownerId) as any;
      uncommunicatedCount = uncommunicated.count;
    }

    if (uncommunicatedCount > 0) {
      return res.status(400).json({ error: "Existem documentos não comunicados à AGT. Por favor, finalize todas as comunicações antes de mudar o modo." });
    }

    try {
      const transaction = db.transaction(() => {
        // 3. Update user billing mode
        db.prepare("UPDATE users SET billing_mode = ? WHERE id = ?").run(billing_mode, ownerId);
        
        // 4. Close current active series
        db.prepare(`
          UPDATE invoice_series 
          SET status = 'inactive' 
          WHERE establishment_id IN (SELECT id FROM establishments WHERE owner_id = ?) 
          AND status = 'active'
        `).run(ownerId);

        // 5. Create new series for each establishment
        const establishments = db.prepare("SELECT id FROM establishments WHERE owner_id = ?").all(ownerId) as any[];
        const year = new Date().getFullYear();
        const prefix = billing_mode === 'tradicional' ? 'A' : 'E';
        
        for (const establishment of establishments) {
          db.prepare(`
            INSERT INTO invoice_series (establishment_id, name, prefix, start_number, current_number, status, agt_status, is_electronic)
            VALUES (?, ?, ?, ?, ?, ?, 'aprovada', ?)
          `).run(
            establishment.id, 
            `Série ${prefix} ${year}`, 
            prefix, 
            1, 
            0, 
            'active',
            billing_mode === 'eletronica' ? 1 : 0
          );
        }

        // 6. Log history
        db.prepare(`
          INSERT INTO billing_mode_history (owner_id, changed_by, old_mode, new_mode)
          VALUES (?, ?, ?, ?)
        `).run(ownerId, changed_by || ownerId, oldMode, billing_mode);
      });

      transaction();
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao processar mudança de modo de faturação." });
    }
  });

  app.put("/api/profile/:id", (req, res) => {
    const { name, email, username, phone, nif, address, company_name, fiscal_regime, password } = req.body;
    const trimmedUsername = username?.trim();
    const trimmedEmail = email?.trim();
    
    try {
      if (password) {
        db.prepare("UPDATE users SET name = ?, email = ?, username = ?, phone = ?, nif = ?, address = ?, company_name = ?, fiscal_regime = ?, password = ? WHERE id = ?").run(name, trimmedEmail || null, trimmedUsername || null, phone, nif, address, company_name, fiscal_regime, password, req.params.id);
      } else {
        db.prepare("UPDATE users SET name = ?, email = ?, username = ?, phone = ?, nif = ?, address = ?, company_name = ?, fiscal_regime = ? WHERE id = ?").run(name, trimmedEmail || null, trimmedUsername || null, phone, nif, address, company_name, fiscal_regime, req.params.id);
      }

      // Se o regime for exclusão, aplicar automaticamente as regras
      if (fiscal_regime === 'exclusao') {
        const ownerId = req.params.id;
        const establishments = db.prepare("SELECT id FROM establishments WHERE owner_id = ?").all(ownerId) as any[];
        for (const establishment of establishments) {
          // 1. Garantir que existe um imposto ISENTO
          let isentoTax = db.prepare("SELECT id FROM taxes WHERE establishment_id = ? AND percentage = 0 AND tax_code = 'ISE'").get(establishment.id) as any;
          if (!isentoTax) {
            const result = db.prepare("INSERT INTO taxes (establishment_id, name, percentage, tax_code, is_default, status) VALUES (?, 'ISENTO', 0, 'ISE', 1, 'active')").run(establishment.id);
            isentoTax = { id: result.lastInsertRowid };
          } else {
            // 2. Definir como padrão e activo
            db.prepare("UPDATE taxes SET is_default = 0 WHERE establishment_id = ?").run(establishment.id);
            db.prepare("UPDATE taxes SET is_default = 1, status = 'active' WHERE id = ?").run(isentoTax.id);
          }
          // 3. Desactivar outros impostos para este estabelecimento
          db.prepare("UPDATE taxes SET status = 'inactive' WHERE establishment_id = ? AND id != ?").run(establishment.id, isentoTax.id);
          // 4. Actualizar todos os produtos deste estabelecimento para usar este imposto ISENTO
          db.prepare("UPDATE products SET tax_id = ? WHERE establishment_id = ?").run(isentoTax.id, establishment.id);
          // 5. Actualizar todos os serviços deste estabelecimento para usar este imposto ISENTO
          db.prepare("UPDATE services SET tax_id = ? WHERE establishment_id = ?").run(isentoTax.id, establishment.id);
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Owner Routes
  app.get("/api/owner/keys/:ownerId", (req, res) => {
    const keys = db.prepare("SELECT id, public_key, version, is_active, type, created_at, created_by FROM company_keys WHERE owner_id = ? ORDER BY version DESC").all(req.params.ownerId);
    res.json(keys);
  });

  app.post("/api/owner/keys/generate", (req, res) => {
    const { ownerId, userId } = req.body;
    try {
      const oldKey = DigitalSignatureService.getActiveKey(ownerId);
      const newKey = DigitalSignatureService.generateCompanyKeys(ownerId, userId);
      
      db.prepare(`
        INSERT INTO key_management_logs (owner_id, user_id, action, old_key_id, new_key_id, details)
        VALUES (?, ?, 'generate_internal', ?, ?, ?)
      `).run(ownerId, userId, oldKey?.id || null, newKey.id, `Nova chave gerada internamente (Versão ${newKey.version})`);
      
      res.json({ success: true, key: newKey });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/owner/keys/external", (req, res) => {
    const { ownerId, userId, publicKey, privateKey, type } = req.body;
    try {
      const encryptedPrivate = DigitalSignatureService.encryptPrivateKey(privateKey);
      
      const oldKey = DigitalSignatureService.getActiveKey(ownerId);
      db.prepare("UPDATE company_keys SET is_active = 0 WHERE owner_id = ?").run(ownerId);

      const lastKey = db.prepare("SELECT MAX(version) as max_v FROM company_keys WHERE owner_id = ?").get(ownerId) as { max_v: number };
      const nextVersion = (lastKey?.max_v || 0) + 1;

      const result = db.prepare(`
        INSERT INTO company_keys (owner_id, public_key, private_key_encrypted, version, is_active, type, created_by)
        VALUES (?, ?, ?, ?, 1, ?, ?)
      `).run(ownerId, publicKey, encryptedPrivate, nextVersion, type || 'external', userId);

      db.prepare(`
        INSERT INTO key_management_logs (owner_id, user_id, action, old_key_id, new_key_id, details)
        VALUES (?, ?, 'upload_external', ?, ?, ?)
      `).run(ownerId, userId, oldKey?.id || null, result.lastInsertRowid, `Certificado externo carregado (Versão ${nextVersion})`);

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/owner/keys/logs/:ownerId", (req, res) => {
    const logs = db.prepare(`
      SELECT l.*, u.name as user_name 
      FROM key_management_logs l
      JOIN users u ON l.user_id = u.id
      WHERE l.owner_id = ? 
      ORDER BY l.timestamp DESC
    `).all(req.params.ownerId);
    res.json(logs);
  });

  app.get("/api/owner/establishments/:establishmentId/cash-registers", (req, res) => {
    const { establishmentId } = req.params;
    const registers = db.prepare(`
      SELECT cr.*, 
             s.status as session_status,
             s.seller_id as current_seller_id,
             u.name as current_seller_name,
             s.id as current_session_id
      FROM cash_registers cr 
      LEFT JOIN cashier_sessions s ON s.cash_register_id = cr.id AND s.status = 'open'
      LEFT JOIN users u ON s.seller_id = u.id
      WHERE cr.establishment_id = ?
    `).all(establishmentId);
    res.json(registers);
  });

  app.put("/api/seller/select-register", (req, res) => {
    const { user_id, cash_register_id } = req.body;
    db.prepare("UPDATE users SET cash_register_id = ? WHERE id = ?").run(cash_register_id, user_id);
    res.json({ success: true });
  });

  app.post("/api/owner/establishments/:establishmentId/cash-registers", (req, res) => {
    const { establishmentId } = req.params;
    const { name, default_initial_balance, max_limit } = req.body;
    const code = `CX-${Math.floor(1000 + Math.random() * 9000)}`;
    const result = db.prepare(`
      INSERT INTO cash_registers (establishment_id, name, code, default_initial_balance, max_limit)
      VALUES (?, ?, ?, ?, ?)
    `).run(establishmentId, name, code, default_initial_balance, max_limit);
    res.json({ id: result.lastInsertRowid, code });
  });

  app.put("/api/owner/establishments/cash-registers/:id", (req, res) => {
    const { id } = req.params;
    const { name, default_initial_balance, max_limit } = req.body;
    db.prepare(`
      UPDATE cash_registers SET name = ?, default_initial_balance = ?, max_limit = ?
      WHERE id = ?
    `).run(name, default_initial_balance, max_limit, id);
    res.json({ success: true });
  });

  app.delete("/api/owner/establishments/cash-registers/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM cash_registers WHERE id = ?").run(id);
    res.json({ success: true });
  });



  // Helper to get establishment IDs and effective owner ID based on user role
  const getContextData = (userId: string | number) => {
    const userResult = db.prepare("SELECT role, establishment_id FROM users WHERE id = ?").get(userId) as any;
    if (!userResult) return { establishmentIds: [], ownerId: null };
    
    if (userResult.role === 'owner') {
      const establishments = db.prepare("SELECT id FROM establishments WHERE owner_id = ?").all(userId) as any[];
      return { 
        establishmentIds: establishments.map(e => e.id), 
        ownerId: Number(userId) 
      };
    } else if (userResult.role === 'manager' && userResult.establishment_id) {
      const est = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(userResult.establishment_id) as any;
      return { 
        establishmentIds: [userResult.establishment_id], 
        ownerId: est?.owner_id || null 
      };
    }
    return { establishmentIds: [], ownerId: null };
  };

  app.get("/api/owner/establishments/:ownerId", (req, res) => {
    try {
      const { establishmentIds } = getContextData(req.params.ownerId);
      if (establishmentIds.length === 0) return res.json([]);

      const placeholders = establishmentIds.map(() => '?').join(',');
      const establishments = db.prepare(`
        SELECT e.*, 
          (SELECT count(*) FROM staff st WHERE st.establishment_id = e.id) as staff_count,
          (SELECT SUM(total_amount) FROM transactions t WHERE t.establishment_id = e.id AND date(t.timestamp) = date('now')) as today_sales
        FROM establishments e 
        WHERE e.id IN (${placeholders})
      `).all(...establishmentIds) as any[];
      
      res.json(establishments.map(e => ({
        ...e,
        bank_accounts: e.bank_accounts ? (typeof e.bank_accounts === 'string' ? (function() {
          try { return JSON.parse(e.bank_accounts); } catch(err) { return []; }
        })() : e.bank_accounts) : []
      })));
    } catch (error: any) {
      console.error("Error in GET /api/owner/establishments/:ownerId:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/owner/establishments", (req, res) => {
    const { owner_id, name, address, phone, email, nif, logo_url, bank_accounts, establishment_code } = req.body;
    
    try {
      // Check limits
      const activeLicenses = db.prepare(`
        SELECT features FROM licenses 
        WHERE user_id = ? AND status = 'active' AND expiry_date >= DATE('now')
      `).all(owner_id) as any[];

      let maxEstablishments = 1; // Default for new users without license
      
      if (activeLicenses.length > 0) {
        maxEstablishments = activeLicenses.reduce((max, lic) => {
          try {
            const feat = typeof lic.features === 'string' ? JSON.parse(lic.features) : (lic.features || []);
            return Math.max(max, feat.max_establishments || feat.max_stores || 0);
          } catch (e) {
            return max;
          }
        }, 0);
      }

      const currentEstablishments = db.prepare("SELECT COUNT(*) as count FROM establishments WHERE owner_id = ?").get(owner_id) as any;
      
      if (currentEstablishments.count >= maxEstablishments) {
        return res.status(403).json({ 
          error: `Limite de estabelecimentos atingido (${maxEstablishments}). Por favor, atualize o seu plano.` 
        });
      }

      db.prepare(`
        INSERT INTO establishments (owner_id, name, address, phone, email, nif, logo_url, license_expiry, bank_accounts, establishment_code) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(owner_id, name, address, phone, email, nif, logo_url, "2026-12-31", JSON.stringify(bank_accounts || []), establishment_code || null);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/owner/establishments/:establishmentId", (req, res) => {
    const { name, address, phone, email, nif, logo_url, status, bank_accounts, establishment_code } = req.body;
    db.prepare(`
      UPDATE establishments 
      SET name = ?, address = ?, phone = ?, email = ?, nif = ?, logo_url = ?, status = ?, bank_accounts = ?, establishment_code = ? 
      WHERE id = ?
    `).run(name, address, phone, email, nif, logo_url, status, JSON.stringify(bank_accounts || []), establishment_code || null, req.params.establishmentId);
    res.json({ success: true });
  });

  // --- Fiscal Documents Endpoints ---
  app.get("/api/owner/generated-files/:ownerId", (req, res) => {
    try {
      const { ownerId } = getContextData(req.params.ownerId);
      if (!ownerId) return res.json([]);
      const files = db.prepare("SELECT id, owner_id, name, type, generated_by, created_at FROM generated_files WHERE owner_id = ? ORDER BY created_at DESC").all(ownerId) as any[];
      res.json(files);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // --- Financial Routes ---
  app.get("/api/owner/financial/transactions/:ownerId", (req, res) => {
    try {
      const { establishmentIds } = getContextData(req.params.ownerId);
      if (establishmentIds.length === 0) return res.json([]);
      const { establishmentId } = req.query;
      
      let transactions;
      if (establishmentId) {
        if (!establishmentIds.includes(Number(establishmentId))) return res.json([]);
        transactions = db.prepare("SELECT * FROM financial_transactions WHERE establishment_id = ? ORDER BY date DESC").all(establishmentId);
      } else {
        const placeholders = establishmentIds.map(() => '?').join(',');
        transactions = db.prepare(`SELECT * FROM financial_transactions WHERE establishment_id IN (${placeholders}) ORDER BY date DESC`).all(...establishmentIds);
      }
      res.json(transactions);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/owner/financial/transactions", (req, res) => {
    try {
      const { establishment_id, owner_id: requestId, type, category, amount, payment_method, description, date, status, reference_id } = req.body;
      const { ownerId } = getContextData(requestId);
      if (!ownerId) throw new Error("Owner context not found");

      const result = db.prepare(`
        INSERT INTO financial_transactions (establishment_id, owner_id, type, category, amount, payment_method, description, date, status, reference_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(establishment_id, ownerId, type, category, amount, payment_method, description, date, status || 'paid', reference_id);
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/owner/financial/receivable/:requestId", (req, res) => {
    try {
      const { establishmentIds } = getContextData(req.params.requestId);
      if (establishmentIds.length === 0) return res.json([]);
      const { establishmentId } = req.query;

      let receivables;
      if (establishmentId) {
        if (!establishmentIds.includes(Number(establishmentId))) return res.json([]);
        receivables = db.prepare("SELECT * FROM accounts_receivable WHERE establishment_id = ? ORDER BY due_date ASC").all(establishmentId);
      } else {
        const placeholders = establishmentIds.map(() => '?').join(',');
        receivables = db.prepare(`SELECT * FROM accounts_receivable WHERE establishment_id IN (${placeholders}) ORDER BY due_date ASC`).all(...establishmentIds);
      }
      res.json(receivables);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/owner/financial/receivable", (req, res) => {
    try {
      const { establishment_id, owner_id: requestId, client_name, amount, due_date, description, status } = req.body;
      const { ownerId } = getContextData(requestId);
      if (!ownerId) throw new Error("Owner context not found");

      const result = db.prepare(`
        INSERT INTO accounts_receivable (establishment_id, owner_id, client_name, amount, due_date, description, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(establishment_id, ownerId, client_name, amount, due_date, description, status || 'pending');
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/owner/financial/receivable/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      // If status is changing to 'paid', record income
      if (status === 'paid') {
        const receivable = db.prepare("SELECT * FROM accounts_receivable WHERE id = ?").get(id) as any;
        if (receivable && receivable.status !== 'paid') {
          db.prepare(`
            INSERT INTO financial_transactions (
              establishment_id, owner_id, type, category, amount, payment_method, description, date, status, reference_id
            ) VALUES (?, ?, 'income', 'Recebimento de Cliente', ?, 'other', ?, ?, 'paid', ?)
          `).run(
            receivable.establishment_id, receivable.owner_id, receivable.amount,
            `Recebimento - ${receivable.client_name} (${receivable.description || ''})`,
            new Date().toISOString(), id
          );
        }
      }

      db.prepare("UPDATE accounts_receivable SET status = ? WHERE id = ?").run(status, id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/owner/financial/payable/:ownerId", (req, res) => {
    try {
      const { establishmentIds } = getContextData(req.params.ownerId);
      if (establishmentIds.length === 0) return res.json([]);
      const { establishmentId } = req.query;

      let payables;
      if (establishmentId) {
        if (!establishmentIds.includes(Number(establishmentId))) return res.json([]);
        payables = db.prepare("SELECT * FROM accounts_payable WHERE establishment_id = ? ORDER BY due_date ASC").all(establishmentId);
      } else {
        const placeholders = establishmentIds.map(() => '?').join(',');
        payables = db.prepare(`SELECT * FROM accounts_payable WHERE establishment_id IN (${placeholders}) ORDER BY due_date ASC`).all(...establishmentIds);
      }
      res.json(payables);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/owner/financial/payable", (req, res) => {
    try {
      const { establishment_id, owner_id: requestId, supplier_name, amount, due_date, description, status } = req.body;
      const { ownerId } = getContextData(requestId);
      if (!ownerId) throw new Error("Owner context not found");

      const result = db.prepare(`
        INSERT INTO accounts_payable (establishment_id, owner_id, supplier_name, amount, due_date, description, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(establishment_id, ownerId, supplier_name, amount, due_date, description, status || 'pending');
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/owner/financial/payable/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // If status is changing to 'paid', record expense
      if (status === 'paid') {
        const payable = db.prepare("SELECT * FROM accounts_payable WHERE id = ?").get(id) as any;
        if (payable && payable.status !== 'paid') {
          db.prepare(`
            INSERT INTO financial_transactions (
              establishment_id, owner_id, type, category, amount, payment_method, description, date, status, reference_id
            ) VALUES (?, ?, 'expense', 'Pagamento de Conta', ?, 'other', ?, ?, 'paid', ?)
          `).run(
            payable.establishment_id, payable.owner_id, payable.amount,
            `Pagamento - ${payable.supplier_name} (${payable.description || ''})`,
            new Date().toISOString(), id
          );
        }
      }

      db.prepare("UPDATE accounts_payable SET status = ? WHERE id = ?").run(status, id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/owner/financial/summary/:requestId", (req, res) => {
    try {
      const { requestId } = req.params;
      const { establishmentIds, ownerId: resolvedOwnerId } = getContextData(requestId);
      if (establishmentIds.length === 0 || !resolvedOwnerId) return res.json({ today: { income: 0, expense: 0, profit: 0 }, month: { income: 0, expense: 0, profit: 0 }, balances: { cash: 0, bank: 0 }, pending: { receivable: 0, payable: 0 } });

      const { establishmentId } = req.query;
      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      let todaySummary, monthSummary, totals, pendingReceivable, pendingPayable;

      // Determine which establishment IDs to filter by
      const targetEstIds = establishmentId ? [Number(establishmentId)] : establishmentIds;
      // Security check: ensure the requested establishmentId is within the user's scope
      if (establishmentId && !establishmentIds.includes(Number(establishmentId))) {
        return res.status(403).json({ error: "Access denied to this establishment" });
      }

      const placeholders = targetEstIds.map(() => '?').join(',');

      todaySummary = db.prepare(`
        SELECT 
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
        FROM financial_transactions 
        WHERE establishment_id IN (${placeholders}) AND date LIKE ?
      `).get(...targetEstIds, `${today}%`) as any;

      monthSummary = db.prepare(`
        SELECT 
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
        FROM financial_transactions 
        WHERE establishment_id IN (${placeholders}) AND date >= ?
      `).get(...targetEstIds, firstDayOfMonth) as any;

      totals = db.prepare(`
        SELECT 
          SUM(CASE WHEN payment_method = 'cash' AND type = 'income' THEN amount WHEN payment_method = 'cash' AND type = 'expense' THEN -amount ELSE 0 END) as cash_balance,
          SUM(CASE WHEN payment_method = 'transfer' AND type = 'income' THEN amount WHEN payment_method = 'transfer' AND type = 'expense' THEN -amount ELSE 0 END) as bank_balance
        FROM financial_transactions 
        WHERE establishment_id IN (${placeholders})
      `).get(...targetEstIds) as any;

      pendingReceivable = db.prepare(`SELECT SUM(amount) as total FROM accounts_receivable WHERE establishment_id IN (${placeholders}) AND status != 'paid'`).get(...targetEstIds) as any;
      pendingPayable = db.prepare(`SELECT SUM(amount) as total FROM accounts_payable WHERE establishment_id IN (${placeholders}) AND status != 'paid'`).get(...targetEstIds) as any;

      res.json({
        today: {
          income: todaySummary?.income || 0,
          expense: todaySummary?.expense || 0,
          profit: (todaySummary?.income || 0) - (todaySummary?.expense || 0)
        },
        month: {
          income: monthSummary?.income || 0,
          expense: monthSummary?.expense || 0,
          profit: (monthSummary?.income || 0) - (monthSummary?.expense || 0)
        },
        balances: {
          cash: totals?.cash_balance || 0,
          bank: totals?.bank_balance || 0
        },
        pending: {
          receivable: pendingReceivable?.total || 0,
          payable: pendingPayable?.total || 0
        }
      });
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
    const { owner_id, establishment_id, start_date, end_date, doc_type, user_name } = req.body;
    try {
      // Fetch owner info
      const owner = db.prepare("SELECT * FROM users WHERE id = ?").get(owner_id) as any;
      if (!owner) {
        return res.status(404).json({ error: "Proprietário não encontrado." });
      }

      // Get all establishment IDs for this owner if no specific establishment is selected
      let establishmentIds: number[] = [];
      let selectedEstablishment: any = null;
      if (establishment_id) {
        establishmentIds = [parseInt(establishment_id)];
        selectedEstablishment = db.prepare("SELECT * FROM establishments WHERE id = ?").get(establishment_id);
      } else {
        const establishments = db.prepare("SELECT id FROM establishments WHERE owner_id = ?").all(owner_id) as { id: number }[];
        establishmentIds = establishments.map(s => s.id);
      }

      if (establishmentIds.length === 0) {
        return res.status(400).json({ error: "Nenhum estabelecimento encontrado para este utilizador." });
      }

      const placeholders = establishmentIds.map(() => '?').join(',');

      // Fetch all active taxes for these establishments
      const taxes = db.prepare(`SELECT * FROM taxes WHERE establishment_id IN (${placeholders}) AND status = 'active'`).all(...establishmentIds) as any[];
      
      let taxTableXml = "";
      const addedTaxCodes = new Set<string>();

      if (owner.fiscal_regime === 'exclusao') {
        taxTableXml += `
      <TaxTableEntry>
        <TaxType>IVA</TaxType>
        <TaxCountryRegion>AO</TaxCountryRegion>
        <TaxCode>ISE</TaxCode>
        <Description>Isento de IVA</Description>
        <TaxPercentage>0.00</TaxPercentage>
      </TaxTableEntry>`;
        addedTaxCodes.add('ISE');
      }

      if (taxes.length > 0) {
        taxes.forEach(t => {
          const code = t.tax_code || 'NOR';
          if (!addedTaxCodes.has(code)) {
            taxTableXml += `
      <TaxTableEntry>
        <TaxType>IVA</TaxType>
        <TaxCountryRegion>AO</TaxCountryRegion>
        <TaxCode>${code}</TaxCode>
        <Description>${t.name}</Description>
        <TaxPercentage>${(t.percentage || 0).toFixed(2)}</TaxPercentage>
      </TaxTableEntry>`;
            addedTaxCodes.add(code);
          }
        });
      } else if (addedTaxCodes.size === 0) {
        // Fallback if no taxes defined
        taxTableXml = `
      <TaxTableEntry>
        <TaxType>IVA</TaxType>
        <TaxCountryRegion>AO</TaxCountryRegion>
        <TaxCode>NOR</TaxCode>
        <Description>Taxa Normal</Description>
        <TaxPercentage>14.00</TaxPercentage>
      </TaxTableEntry>`;
      }

      // Fetch invoices from credit_invoices (FR, FT)
      let ciQuery = `SELECT * FROM credit_invoices WHERE establishment_id IN (${placeholders})`;
      let ciParams: any[] = [...establishmentIds];
      ciQuery += " AND date(created_at) BETWEEN ? AND ?";
      ciParams.push(start_date, end_date);
      if (doc_type) {
        ciQuery += " AND doc_type = ?";
        ciParams.push(doc_type);
      }
      const creditInvoices = db.prepare(ciQuery).all(...ciParams) as any[];

      // Fetch invoices from transactions (POS sales - now treated as FR)
      let tInvoices: any[] = [];
      if (!doc_type || doc_type === 'FR') {
        let tQuery = `SELECT * FROM transactions WHERE establishment_id IN (${placeholders})`;
        let tParams: any[] = [...establishmentIds];
        tQuery += " AND date(timestamp) BETWEEN ? AND ?";
        tParams.push(start_date, end_date);
        tInvoices = db.prepare(tQuery).all(...tParams) as any[];
      }

      // Combine and format XML
      let invoicesXml = "";
      let totalEntries = 0;
      let totalCreditAmount = 0;
      let totalDebitAmount = 0;
      const uniqueCustomers = new Map<string, any>();
      
      creditInvoices.forEach(inv => {
        totalEntries++;
        const isCredit = inv.doc_type === 'NC';
        if (isCredit) {
          totalDebitAmount += inv.total_amount;
        } else {
          totalCreditAmount += inv.total_amount;
        }
        
        if (inv.client_nif && inv.client_nif !== '999999999') {
          uniqueCustomers.set(inv.client_nif, {
            name: inv.client_name,
            nif: inv.client_nif,
            address: inv.address || 'Endereço não especificado'
          });
        }

        const items = JSON.parse(inv.items || '[]');
        let linesXml = "";
        
        if (items.length > 0) {
          items.forEach((item: any, index: number) => {
            const taxCode = item.tax_code || (owner.fiscal_regime === 'exclusao' ? 'ISE' : 'NOR');
            const taxPercentage = (item.tax_percentage !== undefined) ? item.tax_percentage : (owner.fiscal_regime === 'exclusao' ? 0 : 14);
            const lineTotal = (item.price || 0) * (item.quantity || 1);
            
            linesXml += `
          <Line>
            <LineNumber>${index + 1}</LineNumber>
            <ProductCode>${item.id || '000'}</ProductCode>
            <ProductDescription>${item.name || 'Produto'}</ProductDescription>
            <Quantity>${item.quantity || 1}</Quantity>
            <UnitOfMeasure>UN</UnitOfMeasure>
            <UnitPrice>${(item.price || 0).toFixed(2)}</UnitPrice>
            <TaxPointDate>${inv.invoice_date || (inv.created_at ? inv.created_at.split(' ')[0] : start_date)}</TaxPointDate>
            <Description>${item.name || 'Venda de Produtos/Serviços'}</Description>
            <${isCredit ? 'DebitAmount' : 'CreditAmount'}>${lineTotal.toFixed(2)}</${isCredit ? 'DebitAmount' : 'CreditAmount'}>
            <Tax>
              <TaxType>IVA</TaxType>
              <TaxCountryRegion>AO</TaxCountryRegion>
              <TaxCode>${taxCode}</TaxCode>
              <TaxPercentage>${taxPercentage.toFixed(2)}</TaxPercentage>
            </Tax>
            ${taxCode === 'ISE' ? `<TaxExemptionReason>Isento nos termos do regime de exclusão</TaxExemptionReason>
            <TaxExemptionCode>M02</TaxExemptionCode>` : ''}
            <SettlementAmount>0.00</SettlementAmount>
          </Line>`;
          });
        } else {
          const taxCode = owner.fiscal_regime === 'exclusao' ? 'ISE' : 'NOR';
          const taxPercentage = owner.fiscal_regime === 'exclusao' ? 0 : 14;
          linesXml = `
          <Line>
            <LineNumber>1</LineNumber>
            <ProductCode>000</ProductCode>
            <ProductDescription>Venda de Produtos/Serviços</ProductDescription>
            <Quantity>1</Quantity>
            <UnitOfMeasure>UN</UnitOfMeasure>
            <UnitPrice>${inv.total_amount.toFixed(2)}</UnitPrice>
            <TaxPointDate>${inv.invoice_date || (inv.created_at ? inv.created_at.split(' ')[0] : start_date)}</TaxPointDate>
            <Description>Venda de Produtos/Serviços</Description>
            <${isCredit ? 'DebitAmount' : 'CreditAmount'}>${inv.total_amount.toFixed(2)}</${isCredit ? 'DebitAmount' : 'CreditAmount'}>
            <Tax>
              <TaxType>IVA</TaxType>
              <TaxCountryRegion>AO</TaxCountryRegion>
              <TaxCode>${taxCode}</TaxCode>
              <TaxPercentage>${taxPercentage.toFixed(2)}</TaxPercentage>
            </Tax>
            ${taxCode === 'ISE' ? `<TaxExemptionReason>Isento nos termos do regime de exclusão</TaxExemptionReason>
            <TaxExemptionCode>M02</TaxExemptionCode>` : ''}
            <SettlementAmount>0.00</SettlementAmount>
          </Line>`;
        }

        invoicesXml += `
      <Invoice>
        <InvoiceNo>${inv.invoice_number}</InvoiceNo>
        <DocumentStatus>
          <InvoiceStatus>N</InvoiceStatus>
          <InvoiceStatusDate>${inv.created_at.replace(' ', 'T')}</InvoiceStatusDate>
          <SourceID>${inv.seller_id}</SourceID>
          <SourceBilling>P</SourceBilling>
        </DocumentStatus>
        <Hash>${inv.hash || '0'}</Hash>
        <HashControl>1</HashControl>
        <Period>${new Date(inv.created_at).getMonth() + 1}</Period>
        <InvoiceDate>${inv.invoice_date || (inv.created_at ? inv.created_at.split(' ')[0] : start_date)}</InvoiceDate>
        <InvoiceType>${inv.doc_type}</InvoiceType>
        <SourceBilling>P</SourceBilling>
        <CustomerID>${inv.client_nif || '999999999'}</CustomerID>
        ${linesXml}
        <DocumentTotals>
          <TaxPayable>${(inv.tax_amount || 0).toFixed(2)}</TaxPayable>
          <NetTotal>${(inv.total_amount - (inv.tax_amount || 0)).toFixed(2)}</NetTotal>
          <GrossTotal>${inv.total_amount.toFixed(2)}</GrossTotal>
        </DocumentTotals>
      </Invoice>`;
      });

      tInvoices.forEach(inv => {
        totalEntries++;
        totalCreditAmount += inv.total_amount;
        const items = JSON.parse(inv.items || '[]');
        let linesXml = "";
        
        if (items.length > 0) {
          items.forEach((item: any, index: number) => {
            const taxCode = item.tax_code || (owner.fiscal_regime === 'exclusao' ? 'ISE' : 'NOR');
            const taxPercentage = (item.tax_percentage !== undefined) ? item.tax_percentage : (owner.fiscal_regime === 'exclusao' ? 0 : 14);
            const lineTotal = (item.price || 0) * (item.quantity || 1);
            
            linesXml += `
          <Line>
            <LineNumber>${index + 1}</LineNumber>
            <ProductCode>${item.id || '000'}</ProductCode>
            <ProductDescription>${item.name || 'Produto'}</ProductDescription>
            <Quantity>${item.quantity || 1}</Quantity>
            <UnitOfMeasure>UN</UnitOfMeasure>
            <UnitPrice>${(item.price || 0).toFixed(2)}</UnitPrice>
            <TaxPointDate>${inv.timestamp ? inv.timestamp.split(' ')[0] : start_date}</TaxPointDate>
            <Description>${item.name || 'Venda PDV'}</Description>
            <CreditAmount>${lineTotal.toFixed(2)}</CreditAmount>
            <Tax>
              <TaxType>IVA</TaxType>
              <TaxCountryRegion>AO</TaxCountryRegion>
              <TaxCode>${taxCode}</TaxCode>
              <TaxPercentage>${taxPercentage.toFixed(2)}</TaxPercentage>
            </Tax>
            ${taxCode === 'ISE' ? `<TaxExemptionReason>Isento nos termos do regime de exclusão</TaxExemptionReason>
            <TaxExemptionCode>M02</TaxExemptionCode>` : ''}
            <SettlementAmount>0.00</SettlementAmount>
          </Line>`;
          });
        } else {
          const taxCode = owner.fiscal_regime === 'exclusao' ? 'ISE' : 'NOR';
          const taxPercentage = owner.fiscal_regime === 'exclusao' ? 0 : 14;
          linesXml = `
          <Line>
            <LineNumber>1</LineNumber>
            <ProductCode>000</ProductCode>
            <ProductDescription>Venda PDV</ProductDescription>
            <Quantity>1</Quantity>
            <UnitOfMeasure>UN</UnitOfMeasure>
            <UnitPrice>${inv.total_amount.toFixed(2)}</UnitPrice>
            <TaxPointDate>${inv.timestamp ? inv.timestamp.split(' ')[0] : start_date}</TaxPointDate>
            <Description>Venda PDV</Description>
            <CreditAmount>${inv.total_amount.toFixed(2)}</CreditAmount>
            <Tax>
              <TaxType>IVA</TaxType>
              <TaxCountryRegion>AO</TaxCountryRegion>
              <TaxCode>${taxCode}</TaxCode>
              <TaxPercentage>${taxPercentage.toFixed(2)}</TaxPercentage>
            </Tax>
            ${taxCode === 'ISE' ? `<TaxExemptionReason>Isento nos termos do regime de exclusão</TaxExemptionReason>
            <TaxExemptionCode>M02</TaxExemptionCode>` : ''}
            <SettlementAmount>0.00</SettlementAmount>
          </Line>`;
        }

        const invType = inv.invoice_number?.split(' ')[0] || 'FR';

        invoicesXml += `
      <Invoice>
        <InvoiceNo>${inv.invoice_number || invType + ' ' + inv.id}</InvoiceNo>
        <DocumentStatus>
          <InvoiceStatus>N</InvoiceStatus>
          <InvoiceStatusDate>${inv.timestamp.replace(' ', 'T')}</InvoiceStatusDate>
          <SourceID>${inv.seller_id}</SourceID>
          <SourceBilling>P</SourceBilling>
        </DocumentStatus>
        <Hash>${inv.hash || '0'}</Hash>
        <HashControl>1</HashControl>
        <Period>${new Date(inv.timestamp).getMonth() + 1}</Period>
        <InvoiceDate>${inv.timestamp ? inv.timestamp.split(' ')[0] : start_date}</InvoiceDate>
        <InvoiceType>${invType}</InvoiceType>
        <SourceBilling>P</SourceBilling>
        <CustomerID>999999999</CustomerID>
        ${linesXml}
        <DocumentTotals>
          <TaxPayable>${(inv.tax_amount || 0).toFixed(2)}</TaxPayable>
          <NetTotal>${(inv.total_amount - (inv.tax_amount || 0)).toFixed(2)}</NetTotal>
          <GrossTotal>${inv.total_amount.toFixed(2)}</GrossTotal>
        </DocumentTotals>
      </Invoice>`;
      });

      // Fetch products for MasterFiles
      const products = db.prepare(`SELECT * FROM products WHERE establishment_id IN (${placeholders})`).all(...establishmentIds) as any[];
      let productsXml = "";
      products.forEach(prod => {
        productsXml += `
    <Product>
      <ProductType>P</ProductType>
      <ProductCode>${prod.id}</ProductCode>
      <ProductGroup>${prod.category || 'Geral'}</ProductGroup>
      <ProductDescription>${prod.name}</ProductDescription>
      <ProductNumberCode>${prod.barcode || prod.id}</ProductNumberCode>
    </Product>`;
      });

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:AO:1.01_01">
  <Header>
    <AuditFileVersion>1.01_01</AuditFileVersion>
    <CompanyID>${owner.nif || '999999999'}</CompanyID>
    <TaxRegistrationNumber>${owner.nif || '999999999'}</TaxRegistrationNumber>
    <TaxAccountingBasis>F</TaxAccountingBasis>
    <CompanyName>${owner.company_name || owner.name}</CompanyName>
    <BusinessName>${selectedEstablishment ? selectedEstablishment.name : (owner.company_name || owner.name)}</BusinessName>
    <CompanyAddress>
      <AddressDetail>${selectedEstablishment ? selectedEstablishment.address : (owner.address || 'Endereço não especificado')}</AddressDetail>
      <City>Luanda</City>
      <Country>AO</Country>
    </CompanyAddress>
    <FiscalYear>${new Date(start_date).getFullYear()}</FiscalYear>
    <StartDate>${start_date}</StartDate>
    <EndDate>${end_date}</EndDate>
    <CurrencyCode>AOA</CurrencyCode>
    <DateCreated>${new Date().toISOString().split('T')[0]}</DateCreated>
    <TaxEntity>Global</TaxEntity>
    <ProductSoftwareCertificateNumber>0/AGT/2024</ProductSoftwareCertificateNumber>
    <SoftwareID>AIS-ERP/1.0</SoftwareID>
  </Header>
  <MasterFiles>
    <Customer>
      <CustomerID>999999999</CustomerID>
      <AccountID>Desconhecido</AccountID>
      <CustomerTaxID>999999999</CustomerTaxID>
      <CompanyName>Consumidor Final</CompanyName>
      <BillingAddress>
        <AddressDetail>Consumidor Final</AddressDetail>
        <City>Luanda</City>
        <Country>AO</Country>
      </BillingAddress>
      <SelfBillingIndicator>0</SelfBillingIndicator>
    </Customer>
    ${Array.from(uniqueCustomers.values()).map(cust => `
    <Customer>
      <CustomerID>${cust.nif}</CustomerID>
      <AccountID>Desconhecido</AccountID>
      <CustomerTaxID>${cust.nif}</CustomerTaxID>
      <CompanyName>${cust.name}</CompanyName>
      <BillingAddress>
        <AddressDetail>${cust.address}</AddressDetail>
        <City>Luanda</City>
        <Country>AO</Country>
      </BillingAddress>
      <SelfBillingIndicator>0</SelfBillingIndicator>
    </Customer>`).join('')}
    ${productsXml}
    <TaxTable>
      ${taxTableXml}
    </TaxTable>
  </MasterFiles>
  <SourceDocuments>
    <SalesInvoices>
      <NumberOfEntries>${totalEntries}</NumberOfEntries>
      <TotalDebit>${totalDebitAmount.toFixed(2)}</TotalDebit>
      <TotalCredit>${totalCreditAmount.toFixed(2)}</TotalCredit>
      ${invoicesXml}
    </SalesInvoices>
  </SourceDocuments>
</AuditFile>`;

      const fileName = `SAFT_AO_${new Date().toISOString().replace(/[:.]/g, '-')}.xml`;
      db.prepare("INSERT INTO generated_files (owner_id, name, type, generated_by, file_data) VALUES (?, ?, ?, ?, ?)").run(owner_id, fileName, 'SAFT', user_name, Buffer.from(xml));
      
      res.json({ success: true, fileName });
    } catch (e: any) {
      console.error("Error generating SAFT:", e);
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/owner/export", async (req, res) => {
    const { owner_id, export_type, establishment_id, user_name } = req.body;
    try {
      let fileName = "";
      let type = "Excel";
      let buffer: Buffer;

      const establishment = db.prepare("SELECT * FROM establishments WHERE id = ?").get(establishment_id) as any;
      const owner = db.prepare("SELECT * FROM users WHERE id = ?").get(owner_id) as any;

      if (export_type === 'sales') {
        const transactions = db.prepare(`
          SELECT t.*, u.name as seller_name 
          FROM transactions t 
          LEFT JOIN users u ON t.seller_id = u.id 
          WHERE t.establishment_id = ?
          ORDER BY t.timestamp DESC
        `).all(establishment_id) as any[];

        const data = transactions.map(t => ({
          'Data': t.timestamp,
          'Nº Fatura': t.invoice_number || `POS-${t.id}`,
          'Cliente': t.client_name || 'Consumidor Final',
          'NIF Cliente': t.client_nif || '999999999',
          'Vendedor': t.seller_name || 'N/A',
          'Total': t.total_amount,
          'Imposto': t.tax_amount,
          'Desconto': t.discount_amount,
          'Método Pagamento': t.payment_method,
          'Estado AGT': t.agt_status
        }));

        fileName = `Vendas_${establishment?.name || 'Geral'}_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Vendas");
        buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      } else if (export_type === 'purchases') {
        const purchases = db.prepare(`
          SELECT p.*, s.name as supplier_name 
          FROM purchases p 
          LEFT JOIN suppliers s ON p.supplier_id = s.id 
          WHERE p.establishment_id = ?
          ORDER BY p.timestamp DESC
        `).all(establishment_id) as any[];

        const data = purchases.map(p => ({
          'Data': p.timestamp,
          'Nº Fatura Fornecedor': p.invoice_number || 'N/A',
          'Fornecedor': p.supplier_name || 'N/A',
          'Total': p.total_amount,
          'Pago': p.paid_amount,
          'Imposto': p.tax_amount,
          'Estado': p.status,
          'Entrega': p.delivery_status,
          'Data Vencimento': p.due_date
        }));

        fileName = `Compras_${establishment?.name || 'Geral'}_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Compras");
        buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      } else if (export_type === 'clients') {
        const clients = db.prepare("SELECT * FROM clients WHERE establishment_id = ?").all(establishment_id) as any[];
        const data = clients.map(c => ({
          'Nome': c.name,
          'NIF': c.nif,
          'Email': c.email,
          'Telefone': c.phone,
          'Endereço': c.address,
          'Tipo': c.type,
          'Data Registo': c.created_at
        }));

        fileName = `Clientes_${establishment?.name || 'Geral'}_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Clientes");
        buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      } else if (export_type === 'products') {
        const products = db.prepare(`
          SELECT p.*, w.name as warehouse_name 
          FROM products p 
          LEFT JOIN warehouses w ON p.warehouse_id = w.id 
          WHERE p.establishment_id = ?
        `).all(establishment_id) as any[];

        const data = products.map(p => ({
          'Nome': p.name,
          'Código/Barcode': p.barcode || p.id,
          'Preço': p.price,
          'Stock Atual': p.stock,
          'Stock Mínimo': p.min_stock,
          'Categoria': p.category,
          'Armazém': p.warehouse_name || 'Principal',
          'Em Promoção': p.is_promo ? 'Sim' : 'Não'
        }));

        fileName = `Produtos_${establishment?.name || 'Geral'}_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Produtos");
        buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      } else if (export_type === 'hr_attendance') {
        const { establishmentIds, ownerId } = getContextData(owner_id);
        const records = db.prepare(`
          SELECT a.*, u.name as employee_name, st.name as establishment_name
          FROM hr_attendance a
          JOIN users u ON a.user_id = u.id
          LEFT JOIN establishments st ON a.establishment_id = st.id
          WHERE a.user_id IN (
            SELECT id FROM users WHERE id = ? OR establishment_id IN (${establishmentIds.length > 0 ? establishmentIds.map(() => '?').join(',') : 'NULL'})
            UNION
            SELECT user_id FROM staff WHERE establishment_id IN (${establishmentIds.length > 0 ? establishmentIds.map(() => '?').join(',') : 'NULL'})
          )
        `).all(ownerId, ...establishmentIds, ...establishmentIds) as any[];

        const data = records.map(r => ({
          'Data': r.date,
          'Funcionário': r.employee_name,
          'Estabelecimento': r.establishment_name || 'N/A',
          'Tipo': r.type === 'system' ? 'Acesso ao Sistema' : 'Manual',
          'Entrada': r.type === 'system' ? new Date(r.entry_time).toLocaleTimeString() : r.entry_time,
          'Saída': r.exit_time ? (r.type === 'system' ? new Date(r.exit_time).toLocaleTimeString() : r.exit_time) : 'Pendente',
          'Estado': r.status,
          'Notas': r.notes || ''
        }));

        fileName = `Relatorio_Presenca_RH_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Presenças");
        buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      } else if (export_type === 'hr_salaries') {
        const { establishmentIds, ownerId } = getContextData(owner_id);
        const payments = db.prepare(`
          SELECT p.*, s.base_salary, u.name as employee_name
          FROM hr_salary_payments p
          JOIN hr_salaries s ON p.salary_id = s.id
          JOIN users u ON s.user_id = u.id
          WHERE u.id IN (
            SELECT id FROM users WHERE id = ? OR establishment_id IN (${establishmentIds.length > 0 ? establishmentIds.map(() => '?').join(',') : 'NULL'})
            UNION
            SELECT user_id FROM staff WHERE establishment_id IN (${establishmentIds.length > 0 ? establishmentIds.map(() => '?').join(',') : 'NULL'})
          )
        `).all(ownerId, ...establishmentIds, ...establishmentIds) as any[];

        const data = payments.map(p => ({
          'Funcionário': p.employee_name,
          'Data Pagamento': new Date(p.timestamp).toLocaleString('pt-AO'),
          'Mês Referência': p.month || 'N/A',
          'Salário Base': p.base_salary,
          'Valor Pago': p.amount,
          'Bónus': p.bonus || 0,
          'Tipo': p.type,
          'Descrição': p.description || ''
        }));

        fileName = `Relatorio_Salarios_RH_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Salários");
        buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      } else if (export_type === 'hr_employees') {
        const { establishmentIds, ownerId } = getContextData(owner_id);
        const employees = db.prepare(`
          SELECT u.*, st.name as establishment_name, s.base_salary
          FROM users u
          LEFT JOIN establishments st ON u.establishment_id = st.id
          LEFT JOIN hr_salaries s ON u.id = s.user_id
          WHERE u.role IN ('seller', 'manager', 'none') AND (
            u.id IN (SELECT user_id FROM staff WHERE establishment_id IN (${establishmentIds.length > 0 ? establishmentIds.map(() => '?').join(',') : 'NULL'}))
            OR u.establishment_id IN (${establishmentIds.length > 0 ? establishmentIds.map(() => '?').join(',') : 'NULL'})
          )
        `).all(...establishmentIds, ...establishmentIds) as any[];

        const data = employees.map(e => ({
          'Nome': e.name,
          'Cargo': e.role,
          'Email': e.email || 'N/A',
          'Telefone': e.phone || 'N/A',
          'BI': e.bi_number || 'N/A',
          'Morada': e.address || 'N/A',
          'Estabelecimento': e.establishment_name || 'N/A',
          'Salário Base': e.base_salary || 0,
          'Estado': e.status,
          'Data Registo': e.created_at
        }));

        fileName = `Relatorio_Funcionarios_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Funcionários");
        buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      } else if (export_type === 'hr_vacations') {
        const { establishmentIds, ownerId } = getContextData(owner_id);
        const vacations = db.prepare(`
          SELECT v.*, u.name as employee_name
          FROM hr_vacations v
          JOIN users u ON v.user_id = u.id
          WHERE u.id IN (
            SELECT id FROM users WHERE id = ? OR establishment_id IN (${establishmentIds.length > 0 ? establishmentIds.map(() => '?').join(',') : 'NULL'})
            UNION
            SELECT user_id FROM staff WHERE establishment_id IN (${establishmentIds.length > 0 ? establishmentIds.map(() => '?').join(',') : 'NULL'})
          )
        `).all(ownerId, ...establishmentIds, ...establishmentIds) as any[];

        const data = vacations.map(v => ({
          'Funcionário': v.employee_name,
          'Data Início': v.start_date,
          'Data Fim': v.end_date,
          'Tipo': v.type,
          'Estado': v.status,
          'Notas': v.notes || ''
        }));

        fileName = `Relatorio_Ferias_RH_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Férias");
        buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      } else if (export_type === 'invoices') {
        type = "PDF";
        fileName = `Faturas_${establishment?.name || 'Geral'}_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`;
        
        const invoices = db.prepare(`
          SELECT * FROM credit_invoices 
          WHERE establishment_id = ? 
          ORDER BY created_at DESC 
          LIMIT 100
        `).all(establishment_id) as any[];

        const posSales = db.prepare(`
          SELECT * FROM transactions 
          WHERE establishment_id = ? 
          ORDER BY timestamp DESC 
          LIMIT 100
        `).all(establishment_id) as any[];

        const allDocs = [
          ...invoices.map(i => ({
            date: i.created_at,
            number: i.invoice_number,
            client: i.client_name,
            total: i.total_amount,
            type: i.doc_type,
            due_date: i.due_date,
            service_designation: i.service_designation,
            billing_mode: i.billing_mode || 'tradicional',
            nif: i.client_nif || '999999999'
          })),
          ...posSales.map(s => ({
            date: s.timestamp,
            number: s.invoice_number || `POS-${s.id}`,
            client: s.client_name || 'Consumidor Final',
            total: s.total_amount,
            type: 'FR',
            due_date: null,
            billing_mode: s.billing_mode || 'tradicional',
            nif: s.client_nif || '999999999'
          }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 100);

        const doc: any = new (PDFDocument as any)({ margin: 30, size: 'A4' });
        const chunks: any[] = [];
        doc.on('data', (chunk: any) => chunks.push(chunk));
        
        // PDF Header
        doc.fillColor('#ea580c').fontSize(20).text(`Relatório de Faturas - ${establishment?.name || 'Geral'}`, { align: 'center' });
        doc.moveDown();
        doc.fillColor('#000000').fontSize(10).text(`Empresa: ${owner?.company_name || owner?.name}`);
        doc.text(`NIF: ${owner?.nif || 'N/A'}`);
        doc.text(`Data de Exportação: ${new Date().toLocaleString()}`);
        doc.moveDown();

        const table = {
          title: "Lista de Documentos Fiscais (Últimos 100)",
          headers: ["Data", "Número", "Tipo", "Cliente", "Total (AOA)", "QR Code (Eletr.)"],
          rows: [] as any[]
        };

        for (const d of allDocs) {
          let qrStatus = "N/A";
          if (d.type === 'FR' && d.billing_mode === 'eletronica') {
            qrStatus = "Sim (Ver Fatura)";
          }
          
          table.rows.push([
            new Date(d.date).toLocaleDateString(),
            d.number,
            d.type + (d.due_date && d.type === 'FT' ? ` (Venc: ${new Date(d.due_date).toLocaleDateString()})` : ''),
            d.client,
            d.total.toFixed(2),
            qrStatus
          ]);
        }

        await doc.table(table, {
          prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8).fillColor('#ea580c'),
          prepareRow: (row: any, indexColumn: any, indexRow: any, rectRow: any, rectCell: any) => doc.font("Helvetica").fontSize(8).fillColor('#000000'),
        });

        // If it's electronic mode, add a sample QR code at the bottom for the last FR
        const lastElectronicFR = allDocs.find(d => d.type === 'FR' && d.billing_mode === 'eletronica');
        if (lastElectronicFR) {
          doc.moveDown();
          doc.fontSize(10).text("Exemplo de QR Code para Fatura Eletrónica (FR):", { underline: true });
          
          const qrData = `https://agt.minfin.gov.ao/m?nif=${owner?.nif || '000000000'}&num=${lastElectronicFR.number}&dt=${new Date(lastElectronicFR.date).toISOString().split('T')[0]}&val=${lastElectronicFR.total.toFixed(2)}`;
          const qrBuffer = await QRCode.toBuffer(qrData);
          doc.image(qrBuffer, { width: 80, align: 'center' });
          doc.fontSize(8).text(`Dados: ${lastElectronicFR.number} | Total: ${lastElectronicFR.total.toFixed(2)} AOA`, { align: 'center' });
        }

        doc.end();

        // Wait for PDF to finish
        buffer = await new Promise((resolve) => {
          doc.on('end', () => {
            resolve(Buffer.concat(chunks));
          });
        });

      } else {
        return res.status(400).json({ error: "Tipo de exportação inválido." });
      }

      db.prepare("INSERT INTO generated_files (owner_id, name, type, generated_by, file_data) VALUES (?, ?, ?, ?, ?)").run(owner_id, fileName, type, user_name, buffer);
      
      res.json({ success: true, fileName });
    } catch (e: any) {
      console.error("Export error:", e);
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

  app.get("/api/owner/establishment-details/:establishmentId", (req, res) => {
    const establishmentId = req.params.establishmentId;
    
    const establishment = db.prepare("SELECT * FROM establishments WHERE id = ?").get(establishmentId) as any;
    if (!establishment) return res.status(404).json({ error: "Estabelecimento não encontrado." });

    const ownerId = establishment.owner_id;
    
    // Unified sales calculation (PDV transactions + Admin Invoices)
    const stats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM transactions WHERE establishment_id = ? AND date(timestamp) = date('now')) +
        (SELECT COUNT(*) FROM credit_invoices WHERE establishment_id = ? AND date(invoice_date) = date('now') AND doc_type IN ('FT', 'FR', 'NC', 'ND')) as total_transactions,
        
        COALESCE((SELECT SUM(total_amount) FROM transactions WHERE establishment_id = ? AND date(timestamp) = date('now')), 0) +
        COALESCE((SELECT SUM(total_amount) FROM credit_invoices WHERE establishment_id = ? AND date(invoice_date) = date('now') AND doc_type IN ('FT', 'FR', 'ND')), 0) -
        COALESCE((SELECT SUM(total_amount) FROM credit_invoices WHERE establishment_id = ? AND date(invoice_date) = date('now') AND doc_type = 'NC'), 0) as total_revenue,
        
        (SELECT COUNT(DISTINCT seller_id) FROM transactions WHERE establishment_id = ? AND date(timestamp) = date('now')) as active_sellers
    `).get(establishmentId, establishmentId, establishmentId, establishmentId, establishmentId, establishmentId) as any;

    const lowStock = db.prepare("SELECT count(*) as count FROM products WHERE establishment_id = ? AND stock <= min_stock").get(establishmentId) as any;
    const staffCount = db.prepare("SELECT count(*) as count FROM staff WHERE establishment_id = ?").get(establishmentId) as any;

    // Financial health for reminder
    const ownerSettings = db.prepare("SELECT financial_reminder_enabled FROM owner_settings WHERE owner_id = ?").get(ownerId) as any;
    
    // Get monthly financial summary for the reminder
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const financialSummary = db.prepare(`
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM financial_transactions 
      WHERE owner_id = ? AND date(date) >= ? AND date(date) <= ?
    `).get(ownerId, firstDay, lastDay) as any;

    const totalSalaries = db.prepare(`
      SELECT SUM(salary) as total FROM staff WHERE establishment_id IN (SELECT id FROM establishments WHERE owner_id = ?)
    `).get(ownerId) as any;

    const monthlyIncome = (financialSummary?.income || 0);
    const neededForSalaries = (totalSalaries?.total || 0);
    const enoughForSalaries = monthlyIncome >= neededForSalaries;

    res.json({
      establishment,
      dashboard: {
        todaySales: stats?.total_transactions || 0,
        todayRevenue: stats?.total_revenue || 0,
        activeSellers: stats?.active_sellers || 0,
        lowStockCount: lowStock?.count || 0,
        staffCount: staffCount?.count || 0,
        financialReminder: {
          enabled: ownerSettings?.financial_reminder_enabled === 1,
          enoughForSalaries,
          monthlyIncome,
          neededForSalaries,
          daysUntilMonthEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()
        }
      }
    });
  });

  app.get("/api/owner/staff/:establishmentId", (req, res) => {
    const staff = db.prepare(`
      SELECT s.*, u.name, u.email, u.username, u.status 
      FROM staff s 
      JOIN users u ON s.user_id = u.id 
      WHERE s.establishment_id = ?
    `).all(req.params.establishmentId);
    res.json(staff);
  });

  app.post("/api/owner/staff", (req, res) => {
    const { establishment_id, name, email, username, password, salary, shift_info, role, cash_register_id } = req.body;
    const trimmedUsername = username?.trim();
    const trimmedEmail = email?.trim();
    const userRole = role || 'seller';
    
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
        const userResult = db.prepare("INSERT INTO users (email, username, password, name, role, establishment_id, cash_register_id) VALUES (?, ?, ?, ?, ?, ?, ?)").run(trimmedEmail || null, trimmedUsername || null, password, name, userRole, establishment_id, cash_register_id || null);
        db.prepare("INSERT INTO staff (establishment_id, user_id, salary, shift_info) VALUES (?, ?, ?, ?)").run(establishment_id, userResult.lastInsertRowid, salary, shift_info);
      })();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Staff creation error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/owner/staff/:staffId", (req, res) => {
    const { salary, shift_info, name, email, username, password, role, cash_register_id } = req.body;
    const trimmedUsername = username?.trim();
    const trimmedEmail = email?.trim();
    
    try {
      db.transaction(() => {
        const staff = db.prepare("SELECT user_id FROM staff WHERE id = ?").get(req.params.staffId) as any;
        if (staff) {
          if (password) {
            db.prepare("UPDATE users SET name = ?, email = ?, username = ?, password = ?, role = ?, cash_register_id = ? WHERE id = ?").run(name, trimmedEmail || null, trimmedUsername || null, password, role || 'seller', cash_register_id || null, staff.user_id);
          } else {
            db.prepare("UPDATE users SET name = ?, email = ?, username = ?, role = ?, cash_register_id = ? WHERE id = ?").run(name, trimmedEmail || null, trimmedUsername || null, role || 'seller', cash_register_id || null, staff.user_id);
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
    const { establishmentIds } = getContextData(req.params.ownerId);
    if (establishmentIds.length === 0) return res.json([]);
    const placeholders = establishmentIds.map(() => '?').join(',');

    const services = db.prepare(`
      SELECT s.*, st.name as establishment_name, t.percentage as tax_percentage, t.tax_code
      FROM services s
      LEFT JOIN establishments st ON s.establishment_id = st.id
      LEFT JOIN taxes t ON s.tax_id = t.id
      WHERE s.establishment_id IN (${placeholders})
    `).all(...establishmentIds) as any[];

    // Fetch fees for each service
    const servicesWithFees = services.map(s => {
      const fees = db.prepare("SELECT * FROM service_fees WHERE service_id = ?").all(s.id);
      return { ...s, fees };
    });

    res.json(servicesWithFees);
  });

  app.post("/api/owner/services", (req, res) => {
    const { owner_id, establishment_id, name, code, description, price, availability_condition, show_in_pos, tax_id, retention_enabled, retention_percentage, fees } = req.body;
    
    // Check for unique code per establishment
    if (code) {
      const existing = db.prepare("SELECT id FROM services WHERE establishment_id = ? AND code = ?").get(establishment_id, code);
      if (existing) {
        return res.status(400).json({ error: "Já existe um serviço com este código neste estabelecimento." });
      }
    }

    // Se o regime for exclusão, forçar imposto ISENTO
    let finalTaxId = tax_id;
    const owner = db.prepare("SELECT fiscal_regime FROM users WHERE id = ?").get(owner_id) as any;
    if (owner && owner.fiscal_regime === 'exclusao') {
      const isento = db.prepare("SELECT id FROM taxes WHERE establishment_id = ? AND percentage = 0 AND tax_code = 'ISE'").get(establishment_id) as any;
      if (isento) finalTaxId = isento.id;
    }

    const transaction = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO services (owner_id, establishment_id, name, code, description, price, availability_condition, show_in_pos, tax_id, retention_enabled, retention_percentage) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(owner_id, establishment_id, name, code, description, price, availability_condition, show_in_pos, finalTaxId || null, retention_enabled || 0, retention_percentage || 0);

      const serviceId = result.lastInsertRowid;

      if (Array.isArray(fees)) {
        const stmt = db.prepare("INSERT INTO service_fees (service_id, name, amount) VALUES (?, ?, ?)");
        for (const fee of fees) {
          stmt.run(serviceId, fee.name, fee.amount);
        }
      }

      return serviceId;
    });

    try {
      const id = transaction();
      res.json({ success: true, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/owner/services/:id", (req, res) => {
    const { establishment_id, name, code, description, price, availability_condition, show_in_pos, tax_id, retention_enabled, retention_percentage, fees } = req.body;
    
    // Check for unique code per establishment
    if (code) {
      const existing = db.prepare("SELECT id FROM services WHERE establishment_id = ? AND code = ? AND id != ?").get(establishment_id, code, req.params.id);
      if (existing) {
        return res.status(400).json({ error: "Já existe outro serviço com este código neste estabelecimento." });
      }
    }

    // Se o regime for exclusão, forçar imposto ISENTO
    let finalTaxId = tax_id;
    const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
    const owner = establishment ? db.prepare("SELECT fiscal_regime FROM users WHERE id = ?").get(establishment.owner_id) as any : null;
    if (owner && owner.fiscal_regime === 'exclusao') {
      const isento = db.prepare("SELECT id FROM taxes WHERE establishment_id = ? AND percentage = 0 AND tax_code = 'ISE'").get(establishment_id) as any;
      if (isento) finalTaxId = isento.id;
    }

    const transaction = db.transaction(() => {
      db.prepare(`
        UPDATE services 
        SET establishment_id = ?, name = ?, code = ?, description = ?, price = ?, availability_condition = ?, show_in_pos = ?, tax_id = ?, retention_enabled = ?, retention_percentage = ?
        WHERE id = ?
      `).run(establishment_id, name, code, description, price, availability_condition, show_in_pos, finalTaxId || null, retention_enabled || 0, retention_percentage || 0, req.params.id);

      // Re-sync fees: delete all and re-insert
      db.prepare("DELETE FROM service_fees WHERE service_id = ?").run(req.params.id);

      if (Array.isArray(fees)) {
        const stmt = db.prepare("INSERT INTO service_fees (service_id, name, amount) VALUES (?, ?, ?)");
        for (const fee of fees) {
          stmt.run(req.params.id, fee.name, fee.amount);
        }
      }
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/owner/services/:id", (req, res) => {
    db.prepare("DELETE FROM services WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/owner/services-report/:ownerId", (req, res) => {
    const { establishmentIds } = getContextData(req.params.ownerId);
    
    if (establishmentIds.length === 0) {
      return res.json([]);
    }

    const placeholders = establishmentIds.map(() => '?').join(',');
    const transactions = db.prepare(`
      SELECT items, timestamp, establishment_id 
      FROM transactions 
      WHERE establishment_id IN (${placeholders})
    `).all(...establishmentIds) as any[];

    const serviceSales: Record<string, { id: number, name: string, code: string, quantity: number, revenue: number, last_sold: string, establishment_id: number }> = {};

    transactions.forEach(t => {
      try {
        const items = JSON.parse(t.items);
        items.forEach((item: any) => {
          if (item.type === 'service') {
            const key = `${item.id}_${t.establishment_id}`;
            if (!serviceSales[key]) {
              serviceSales[key] = {
                id: item.id,
                name: item.name,
                code: item.code || 'N/A',
                quantity: 0,
                revenue: 0,
                last_sold: t.timestamp,
                establishment_id: t.establishment_id
              };
            }
            serviceSales[key].quantity += item.quantity || 1;
            serviceSales[key].revenue += (item.quantity || 1) * item.price;
            if (new Date(t.timestamp) > new Date(serviceSales[key].last_sold)) {
              serviceSales[key].last_sold = t.timestamp;
            }
          }
        });
      } catch (e) {
        console.error("Error parsing transaction items:", e);
      }
    });

    // Join with establishment names
    const result = Object.values(serviceSales).map(s => {
      const establishment = db.prepare("SELECT name FROM establishments WHERE id = ?").get(s.establishment_id) as { name: string };
      return { ...s, establishment_name: establishment?.name || 'Estabelecimento Desconhecido' };
    });

    res.json(result.sort((a, b) => b.revenue - a.revenue));
  });

  app.get("/api/seller/services/:establishmentId", (req, res) => {
    const showAll = req.query.all === 'true';
    const whereClause = showAll ? "WHERE s.establishment_id = ?" : "WHERE s.establishment_id = ? AND s.show_in_pos = 1";
    
    const services = db.prepare(`
      SELECT s.*, t.percentage as tax_percentage, t.tax_code
      FROM services s
      LEFT JOIN taxes t ON s.tax_id = t.id
      ${whereClause}
    `).all(req.params.establishmentId) as any[];

    // Fetch fees for each service
    const servicesWithFees = services.map(s => {
      const fees = db.prepare("SELECT * FROM service_fees WHERE service_id = ?").all(s.id);
      return { ...s, fees };
    });

    res.json(servicesWithFees);
  });

  // HR Routes
  app.get("/api/owner/hr/roles/:ownerId", (req, res) => {
    const { ownerId } = getContextData(req.params.ownerId);
    if (!ownerId) return res.json([]);
    const roles = db.prepare("SELECT * FROM hr_roles WHERE owner_id = ?").all(ownerId);
    res.json(roles);
  });

  app.post("/api/owner/hr/roles", (req, res) => {
    const { owner_id: requestId, name, base_role, permissions } = req.body;
    const { ownerId } = getContextData(requestId);
    if (!ownerId) return res.status(403).json({ error: "Owner context not found" });

    db.prepare("INSERT INTO hr_roles (owner_id, name, base_role, permissions) VALUES (?, ?, ?, ?)").run(ownerId, name, base_role || 'seller', JSON.stringify(permissions));
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
    const { establishmentIds } = getContextData(req.params.ownerId);
    if (establishmentIds.length === 0) return res.json([]);
    const placeholders = establishmentIds.map(() => '?').join(',');

    const employees = db.prepare(`
      SELECT u.*, r.name as role_name, s.base_salary, s.bonuses, s.discounts, st.name as establishment_name
      FROM users u
      LEFT JOIN hr_roles r ON u.role_id = r.id
      LEFT JOIN hr_salaries s ON u.id = s.user_id
      LEFT JOIN establishments st ON u.establishment_id = st.id
      WHERE u.role IN ('seller', 'manager', 'none') AND (u.id IN (SELECT user_id FROM staff WHERE establishment_id IN (${placeholders})) OR u.establishment_id IN (${placeholders}))
    `).all(...[...establishmentIds, ...establishmentIds]);
    res.json(employees);
  });

  app.post("/api/owner/hr/employees", (req, res) => {
    const { name, email, username, password, role: bodyRole, establishment_id, role_id, custom_permissions, base_salary, cash_register_id, bi_number, address } = req.body;
    try {
      db.transaction(() => {
        let finalRole = bodyRole || 'seller';
        if (role_id) {
          const hrRole = db.prepare("SELECT base_role FROM hr_roles WHERE id = ?").get(role_id) as any;
          if (hrRole) finalRole = hrRole.base_role;
        }

        const result = db.prepare("INSERT INTO users (name, email, username, password, role, establishment_id, role_id, custom_permissions, status, cash_register_id, bi_number, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
          name, email, username, password, finalRole, establishment_id, role_id, JSON.stringify(custom_permissions), 'active', cash_register_id, bi_number, address
        );
        const userId = result.lastInsertRowid;
        const salary = Number(base_salary) || 0;
        db.prepare("INSERT OR REPLACE INTO hr_salaries (user_id, base_salary) VALUES (?, ?)").run(userId, salary);
        if (establishment_id) {
          db.prepare("INSERT OR REPLACE INTO staff (establishment_id, user_id, salary) VALUES (?, ?, ?)").run(establishment_id, userId, salary);
        }
      })();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/owner/hr/employees/:id", (req, res) => {
    const { name, email, username, role: bodyRole, establishment_id, role_id, custom_permissions, base_salary, status, cash_register_id, bi_number, address } = req.body;
    try {
      db.transaction(() => {
        let finalRole = bodyRole || 'seller';
        if (role_id && role_id !== '') {
          const hrRole = db.prepare("SELECT base_role FROM hr_roles WHERE id = ?").get(role_id) as any;
          if (hrRole) finalRole = hrRole.base_role;
        }

        const estId = (establishment_id === '' || establishment_id === undefined) ? null : Number(establishment_id);
        const rId = (role_id === '' || role_id === undefined) ? null : Number(role_id);
        const crId = (cash_register_id === '' || cash_register_id === undefined) ? null : Number(cash_register_id);

        db.prepare("UPDATE users SET name = ?, email = ?, username = ?, role = ?, establishment_id = ?, role_id = ?, custom_permissions = ?, status = ?, cash_register_id = ?, bi_number = ?, address = ? WHERE id = ?").run(
          name, email || null, username || null, finalRole, estId, rId, JSON.stringify(custom_permissions), status, crId, bi_number || null, address || null, req.params.id
        );
        const salary = Number(base_salary) || 0;
        db.prepare("INSERT OR REPLACE INTO hr_salaries (user_id, base_salary) VALUES (?, ?)").run(req.params.id, salary);
        if (estId) {
          db.prepare("INSERT OR REPLACE INTO staff (establishment_id, user_id, salary) VALUES (?, ?, ?)").run(estId, req.params.id, salary);
        }
      })();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating employee:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Cancellation Requests
  app.post("/api/sales/request-cancellation", (req, res) => {
    const { invoice_id, doc_type, type, reason, amount, requested_by, establishment_id, items } = req.body;
    try {
      db.prepare("INSERT INTO cancellation_requests (invoice_id, doc_type, type, reason, amount, requested_by, establishment_id, items_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
        invoice_id, doc_type || 'NC', type, reason, amount, requested_by, establishment_id, JSON.stringify(items || [])
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/owner/cancellation-requests/:ownerId", (req, res) => {
    const { establishmentIds } = getContextData(req.params.ownerId);
    if (establishmentIds.length === 0) return res.json([]);
    const placeholders = establishmentIds.map(() => '?').join(',');

    const requests = db.prepare(`
      SELECT cr.*, u.name as requested_by_name, t.invoice_number
      FROM cancellation_requests cr
      JOIN users u ON cr.requested_by = u.id
      JOIN transactions t ON cr.invoice_id = t.id
      WHERE cr.establishment_id IN (${placeholders}) AND cr.status = 'pending'
    `).all(...establishmentIds);
    res.json(requests);
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
    const { establishmentIds } = getContextData(req.params.ownerId);
    if (establishmentIds.length === 0) return res.json([]);
    const placeholders = establishmentIds.map(() => '?').join(',');

    const salaries = db.prepare(`
      SELECT s.*, u.name as employee_name, r.name as role_name
      FROM hr_salaries s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN hr_roles r ON u.role_id = r.id
      WHERE u.role IN ('seller', 'manager', 'none') AND (u.id IN (SELECT user_id FROM staff WHERE establishment_id IN (${placeholders})) OR u.establishment_id IN (${placeholders}))
    `).all(...[...establishmentIds, ...establishmentIds]);
    res.json(salaries);
  });

  app.get("/api/owner/hr/salaries/payments/:ownerId", (req, res) => {
    const { establishmentIds } = getContextData(req.params.ownerId);
    if (establishmentIds.length === 0) return res.json([]);
    const placeholders = establishmentIds.map(() => '?').join(',');

    const payments = db.prepare(`
      SELECT p.*, u.name as employee_name, s.base_salary
      FROM hr_salary_payments p
      JOIN hr_salaries s ON p.salary_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE u.role IN ('seller', 'manager', 'none') AND (u.id IN (SELECT user_id FROM staff WHERE establishment_id IN (${placeholders})) OR u.establishment_id IN (${placeholders}))
      ORDER BY p.timestamp DESC
    `).all(...[...establishmentIds, ...establishmentIds]);
    res.json(payments);
  });

  app.post("/api/owner/hr/salaries/payment", (req, res) => {
    const { salary_id, amount, bonus, type, description, month } = req.body;
    
    try {
      db.transaction(() => {
        // Check for duplicate payment for the same month
        const existingPayment = db.prepare("SELECT id FROM hr_salary_payments WHERE salary_id = ? AND month = ?").get(salary_id, month);
        if (existingPayment) {
          throw new Error("Já existe um pagamento registado para este mês.");
        }

        // Check if amount is at least the base salary
        const salary = db.prepare("SELECT base_salary FROM hr_salaries WHERE id = ?").get(salary_id) as any;
        if (salary && Number(amount) < salary.base_salary) {
          throw new Error(`O valor do pagamento não pode ser inferior ao salário base (${salary.base_salary} Kz).`);
        }

        const result = db.prepare("INSERT INTO hr_salary_payments (salary_id, amount, bonus, type, description, month) VALUES (?, ?, ?, ?, ?, ?)").run(salary_id, amount, bonus || 0, type, description, month);
        const paymentId = result.lastInsertRowid;

        // Record in financial_transactions
        const salaryInfo = db.prepare(`
          SELECT s.base_salary, u.name as employee_name, u.establishment_id
          FROM hr_salaries s
          JOIN users u ON s.user_id = u.id
          WHERE s.id = ?
        `).get(salary_id) as any;

        if (salaryInfo) {
          const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(salaryInfo.establishment_id) as any;
          if (establishment) {
            db.prepare(`
              INSERT INTO financial_transactions (
                establishment_id, owner_id, type, category, amount, payment_method, description, date, status, reference_id
              ) VALUES (?, ?, 'expense', 'Salários e Benefícios', ?, 'bank_transfer', ?, ?, 'paid', ?)
            `).run(
              salaryInfo.establishment_id, establishment.owner_id, Number(amount) + Number(bonus || 0),
              `Pagamento Salário - ${salaryInfo.employee_name} (${month})`,
              new Date().toISOString(), paymentId
            );
          }
        }

        if (type === 'full_payment') {
          db.prepare("UPDATE hr_salaries SET last_payment_date = CURRENT_TIMESTAMP WHERE id = ?").run(salary_id);
        }
      })();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Salary payment error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/owner/hr/attendance/:ownerId", (req, res) => {
    const { establishmentIds, ownerId } = getContextData(req.params.ownerId);
    
    // We want all attendance for users belonging to these establishments
    // OR attendance where the user_id is the owner themselves or their staff
    const attendance = db.prepare(`
      SELECT a.*, u.name as employee_name, st.name as establishment_name
      FROM hr_attendance a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN establishments st ON a.establishment_id = st.id
      WHERE a.user_id IN (
        SELECT id FROM users WHERE id = ? OR establishment_id IN (${establishmentIds.length > 0 ? establishmentIds.map(() => '?').join(',') : 'NULL'})
        UNION
        SELECT user_id FROM staff WHERE establishment_id IN (${establishmentIds.length > 0 ? establishmentIds.map(() => '?').join(',') : 'NULL'})
      )
      ORDER BY a.date DESC, a.entry_time DESC
    `).all(ownerId, ...establishmentIds, ...establishmentIds);
    res.json(attendance);
  });

  app.post("/api/owner/hr/attendance", (req, res) => {
    const { user_id, establishment_id, entry_time, exit_time, status, date, notes } = req.body;
    db.prepare("INSERT INTO hr_attendance (user_id, establishment_id, entry_time, exit_time, status, date, notes, type) VALUES (?, ?, ?, ?, ?, ?, ?, 'manual')").run(
      user_id, establishment_id, entry_time, exit_time, status, date, notes
    );
    res.json({ success: true });
  });

  app.get("/api/owner/hr/vacations/:ownerId", (req, res) => {
    const { establishmentIds } = getContextData(req.params.ownerId);
    if (establishmentIds.length === 0) return res.json([]);
    const placeholders = establishmentIds.map(() => '?').join(',');

    const vacations = db.prepare(`
      SELECT v.*, u.name as employee_name
      FROM hr_vacations v
      JOIN users u ON v.user_id = u.id
      WHERE u.id IN (SELECT user_id FROM staff WHERE establishment_id IN (${placeholders}))
    `).all(...establishmentIds);
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

  app.get("/api/owner/staff-performance/:establishmentId", (req, res) => {
    const performance = db.prepare(`
      SELECT 
        u.id,
        u.name,
        COUNT(t.id) as total_sales,
        SUM(t.total_amount) as total_revenue
      FROM staff s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN transactions t ON t.seller_id = u.id AND t.establishment_id = s.establishment_id
      WHERE s.establishment_id = ?
      GROUP BY u.id
    `).all(req.params.establishmentId);
    res.json(performance);
  });

  app.get("/api/owner/products/:establishmentId", (req, res) => {
    const establishmentId = req.params.establishmentId;
    const ownerId = req.query.ownerId;

    if (establishmentId === 'all' && ownerId) {
      const products = db.prepare(`
        SELECT p.*, s.name as establishment_name, w.name as warehouse_name,
          (SELECT pr.discount_percent FROM promotion_products pp 
           JOIN promotions pr ON pp.promotion_id = pr.id 
           WHERE pp.product_id = p.id AND date('now') BETWEEN date(pr.start_date) AND date(pr.end_date)
           LIMIT 1) as discount_percent
        FROM products p 
        JOIN establishments s ON p.establishment_id = s.id 
        LEFT JOIN warehouses w ON p.warehouse_id = w.id
        WHERE s.owner_id = ?
      `).all(ownerId);
      return res.json(products);
    }

    const products = db.prepare(`
      SELECT p.*, w.name as warehouse_name,
        (SELECT pr.discount_percent FROM promotion_products pp 
         JOIN promotions pr ON pp.promotion_id = pr.id 
         WHERE pp.product_id = p.id AND date('now') BETWEEN date(pr.start_date) AND date(pr.end_date)
         LIMIT 1) as discount_percent
      FROM products p 
      LEFT JOIN warehouses w ON p.warehouse_id = w.id
      WHERE p.establishment_id = ?
    `).all(establishmentId);
    res.json(products);
  });

  app.get("/api/owner/dashboard-stats/:establishmentId", (req, res) => {
    const establishmentId = req.params.establishmentId;
    const ownerId = req.query.ownerId;
    
    let whereClause = "establishment_id = ?";
    let params: any[] = [establishmentId];

    if (establishmentId === 'all' && ownerId) {
      const { establishmentIds } = getContextData(ownerId as string);
      if (establishmentIds.length === 0) {
        return res.json({ todaySales: 0, todayCount: 0, monthlySales: 0, lowStockCount: 0, staffCount: 0, topProducts: [], recentTransactions: [], salesByDay: [], salesByEstablishment: [], paymentMethods: [], totalExpenses: 0 });
      }
      const placeholders = establishmentIds.map(() => '?').join(',');
      whereClause = `establishment_id IN (${placeholders})`;
      params = [...establishmentIds];
    }
    
    // Sales of the day (Transactions + Credit Invoices)
    const todaySales = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM transactions WHERE ${whereClause} AND date(timestamp) = date('now')) +
        (SELECT COUNT(*) FROM credit_invoices WHERE ${whereClause} AND date(invoice_date) = date('now') AND doc_type IN ('FT', 'FR')) as count
    `).get(...[...params, ...params]) as any;

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

    // Top Products - Unified JS processing for better JSON error handling
    const productSales: Record<string, { id: any, name: string, quantity: number, revenue: number }> = {};
    const processItems = (rows: any[]) => {
      rows.forEach((t: any) => {
        try {
          const items = typeof t.items === 'string' ? JSON.parse(t.items) : t.items;
          if (!Array.isArray(items)) return;
          items.forEach((item: any) => {
            const id = item.id || item.ProductCode;
            if (!id) return;
            if (!productSales[id]) {
              productSales[id] = { id, name: item.name || item.ProductDescription, quantity: 0, revenue: 0 };
            }
            productSales[id].quantity += (Number(item.quantity) || 0);
          });
        } catch (e) {}
      });
    };

    processItems(db.prepare(`SELECT items FROM transactions WHERE ${whereClause}`).all(...params));
    // Also include credit invoices in top products for dashboard
    processItems(db.prepare(`SELECT items FROM credit_invoices WHERE ${whereClause} AND doc_type IN ('FT', 'FR')`).all(...params));

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map(p => ({ name: p.name, total_qty: p.quantity }));

    // Recent Transactions
    const recentTransactions = db.prepare(`
      SELECT t.*, s.name as establishment_name
      FROM transactions t
      JOIN establishments s ON t.establishment_id = s.id
      WHERE t.${whereClause}
      ORDER BY t.timestamp DESC
      LIMIT 5
    `).all(...params) as any[];

    // Sales by Day (Last 7 days)
    const salesByDay = db.prepare(`
      SELECT date(timestamp) as day, SUM(total_amount) as total
      FROM transactions
      WHERE ${whereClause} AND timestamp >= date('now', '-7 days')
      GROUP BY day
      ORDER BY day ASC
    `).all(...params) as any[];

    // Sales by Establishment
    const salesByEstablishment = db.prepare(`
      SELECT s.name, SUM(t.total_amount) as total
      FROM transactions t
      JOIN establishments s ON t.establishment_id = s.id
      WHERE s.owner_id = ?
      GROUP BY s.id
      ORDER BY total DESC
    `).all(ownerId) as any[];

    // Payment Methods Distribution
    const paymentMethods = db.prepare(`
      SELECT payment_method as name, SUM(total_amount) as value
      FROM transactions
      WHERE ${whereClause}
      GROUP BY payment_method
    `).all(...params) as any[];

    // Financial Summary (Real values)
    const financialToday = db.prepare(`
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM financial_transactions 
      WHERE ${whereClause} AND date LIKE date('now') || '%'
    `).get(...params) as any;

    const financialMonth = db.prepare(`
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM financial_transactions 
      WHERE ${whereClause} AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
    `).get(...params) as any;

    // Financial Health for Salaries (Employee Payment Reminder)
    const salaries = db.prepare(`
      SELECT SUM(base_salary) as total 
      FROM hr_salaries 
      WHERE user_id IN (SELECT user_id FROM staff WHERE ${whereClause})
    `).get(...params) as any;

    const ownerSettings = ownerId ? db.prepare("SELECT financial_reminder_enabled FROM owner_settings WHERE owner_id = ?").get(ownerId) as any : null;
    
    // Monthly stats for financial health
    const monthlyIncome = financialMonth?.income || 0;
    const totalSalaries = salaries?.total || 0;
    const enoughForSalaries = monthlyIncome >= totalSalaries;

    res.json({
      todaySales: financialToday?.income || 0,
      todayCount: todaySales?.count || 0,
      todayExpense: financialToday?.expense || 0,
      monthlySales: monthlyIncome,
      monthlyExpense: financialMonth?.expense || 0,
      lowStockCount: lowStock?.count || 0,
      staffCount: staffCount?.count || 0,
      topProducts,
      recentTransactions,
      salesByDay,
      salesByEstablishment,
      paymentMethods,
      totalExpenses: financialMonth?.expense || 0,
      financialHealth: {
        enabled: ownerSettings?.financial_reminder_enabled === 1,
        totalSalaries: totalSalaries,
        enoughForSalaries: enoughForSalaries,
        monthlyIncome: monthlyIncome
      }
    });
  });

  app.post("/api/owner/products", (req, res) => {
    const { establishment_id, warehouse_id, name, price, stock, category, image_url, min_stock, tax_id } = req.body;
    
    // Check if product with same name exists in this establishment
    const existing = db.prepare("SELECT id FROM products WHERE establishment_id = ? AND LOWER(name) = LOWER(?)").get(establishment_id, name);
    if (existing) {
      return res.status(400).json({ error: "Já existe um produto com este nome neste estabelecimento." });
    }

    // Se o regime for exclusão, forçar imposto ISENTO
    let finalTaxId = tax_id;
    const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
    const owner = establishment ? db.prepare("SELECT fiscal_regime FROM users WHERE id = ?").get(establishment.owner_id) as any : null;
    if (owner && owner.fiscal_regime === 'exclusao') {
      const isento = db.prepare("SELECT id FROM taxes WHERE establishment_id = ? AND percentage = 0 AND tax_code = 'ISE'").get(establishment_id) as any;
      if (isento) finalTaxId = isento.id;
    }

    const barcode = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
    db.prepare("INSERT INTO products (establishment_id, warehouse_id, name, price, stock, category, image_url, min_stock, barcode, tax_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(establishment_id, warehouse_id || null, name, price, stock, category, image_url, min_stock || 5, barcode, finalTaxId || null);
    res.json({ success: true });
  });

  app.delete("/api/owner/products/:id", (req, res) => {
    db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/owner/products/:id", (req, res) => {
    const { warehouse_id, name, price, stock, category, image_url, min_stock, tax_id } = req.body;
    
    // Get establishment_id for this product
    const product = db.prepare("SELECT establishment_id FROM products WHERE id = ?").get(req.params.id) as { establishment_id: number } | undefined;
    if (!product) return res.status(404).json({ error: "Produto não encontrado." });

    // Check for other products with same name in same establishment
    const existing = db.prepare("SELECT id FROM products WHERE establishment_id = ? AND LOWER(name) = LOWER(?) AND id != ?").get(product.establishment_id, name, req.params.id);
    if (existing) {
      return res.status(400).json({ error: "Já existe um outro produto com este nome neste estabelecimento." });
    }

    // Se o regime for exclusão, forçar imposto ISENTO
    let finalTaxId = tax_id;
    const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(product.establishment_id) as any;
    const owner = establishment ? db.prepare("SELECT fiscal_regime FROM users WHERE id = ?").get(establishment.owner_id) as any : null;
    if (owner && owner.fiscal_regime === 'exclusao') {
      const isento = db.prepare("SELECT id FROM taxes WHERE establishment_id = ? AND percentage = 0 AND tax_code = 'ISE'").get(product.establishment_id) as any;
      if (isento) finalTaxId = isento.id;
    }

    db.prepare(`
      UPDATE products 
      SET name = ?, price = ?, stock = ?, category = ?, image_url = ?, min_stock = ?, tax_id = ?, warehouse_id = ? 
      WHERE id = ?
    `).run(name, price, stock, category, image_url, min_stock, finalTaxId || null, warehouse_id || null, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/owner/promotions/:establishmentId", (req, res) => {
    const promotions = db.prepare(`
      SELECT p.*, 
        (SELECT GROUP_CONCAT(pr.name, ', ') 
         FROM promotion_products pp 
         JOIN products pr ON pp.product_id = pr.id 
         WHERE pp.promotion_id = p.id) as product_names
      FROM promotions p 
      WHERE p.establishment_id = ?
    `).all(req.params.establishmentId);
    res.json(promotions);
  });

  app.post("/api/owner/promotions", (req, res) => {
    const { establishment_id, name, start_date, end_date, discount_percent, product_ids } = req.body;
    
    const transaction = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO promotions (establishment_id, name, start_date, end_date, discount_percent) 
        VALUES (?, ?, ?, ?, ?)
      `).run(establishment_id, name, start_date, end_date, discount_percent);
      
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

  app.post("/api/admin/establishments/toggle-license", (req, res) => {
    const { establishment_id, status } = req.body;
    db.prepare("UPDATE establishments SET license_status = ? WHERE id = ?").run(status, establishment_id);
    res.json({ success: true });
  });

  app.get("/api/owner/reports/:establishmentId", (req, res) => {
    const establishmentId = req.params.establishmentId;
    
    // Sales by day (last 30 days) - Unified Transactions and Credit Invoices
    const salesByDay = db.prepare(`
      SELECT day as date, SUM(revenue) as revenue, SUM(count) as sales
      FROM (
        SELECT date(timestamp) as day, total_amount as revenue, 1 as count
        FROM transactions
        WHERE establishment_id = ? AND timestamp >= date('now', '-30 days')
        UNION ALL
        SELECT invoice_date as day, total_amount as revenue, 1 as count
        FROM credit_invoices
        WHERE establishment_id = ? AND invoice_date >= date('now', '-30 days') AND doc_type IN ('FT', 'FR', 'ND')
        UNION ALL
        SELECT invoice_date as day, -total_amount as revenue, 1 as count
        FROM credit_invoices
        WHERE establishment_id = ? AND invoice_date >= date('now', '-30 days') AND doc_type = 'NC'
      )
      GROUP BY day
      ORDER BY day ASC
    `).all(establishmentId, establishmentId, establishmentId);

    // Best selling products - Unified
    const transactions = db.prepare("SELECT items FROM transactions WHERE establishment_id = ?").all(establishmentId);
    const invoices = db.prepare("SELECT items FROM credit_invoices WHERE establishment_id = ? AND doc_type IN ('FT', 'FR')").all(establishmentId);
    
    const productSales: Record<string, { name: string, quantity: number, revenue: number }> = {};
    
    const processItems = (itemStr: string) => {
      try {
        const items = JSON.parse(itemStr);
        items.forEach((item: any) => {
          const id = item.id || item.ProductCode; // Handle different item structures
          if (!id) return;
          if (!productSales[id]) {
            productSales[id] = { name: item.name || item.ProductDescription, quantity: 0, revenue: 0 };
          }
          productSales[id].quantity += (Number(item.quantity) || 0);
          productSales[id].revenue += ((Number(item.price) || 0) * (Number(item.quantity) || 0));
        });
      } catch (e) {
        console.error("Error parsing items:", e);
      }
    };

    transactions.forEach((t: any) => processItems(t.items));
    invoices.forEach((i: any) => processItems(i.items));

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Sales by category
    const categorySales: Record<string, number> = {};
    const products = db.prepare("SELECT id, category FROM products WHERE establishment_id = ?").all(establishmentId);
    const productToCategory: Record<string, string> = {};
    products.forEach((p: any) => productToCategory[String(p.id)] = p.category);

    const processCategoryItems = (itemStr: string) => {
      try {
        const items = JSON.parse(itemStr);
        items.forEach((item: any) => {
          const id = String(item.id || item.ProductCode);
          const cat = productToCategory[id] || 'Outros';
          categorySales[cat] = (categorySales[cat] || 0) + ((Number(item.price) || 0) * (Number(item.quantity) || 0));
        });
      } catch (e) {}
    };

    transactions.forEach((t: any) => processCategoryItems(t.items));
    invoices.forEach((i: any) => processCategoryItems(i.items));

    const salesByCategory = Object.entries(categorySales).map(([name, value]) => ({ name, value }));

    // Revenue by payment method
    const paymentMethods = db.prepare(`
      SELECT name, SUM(value) as value
      FROM (
        SELECT payment_method as name, total_amount as value
        FROM transactions
        WHERE establishment_id = ?
        UNION ALL
        SELECT payment_method as name, total_amount as value
        FROM credit_invoices
        WHERE establishment_id = ? AND doc_type IN ('FT', 'FR')
      )
      GROUP BY name
    `).all(establishmentId, establishmentId);

    res.json({
      salesByDay,
      topProducts,
      salesByCategory,
      paymentMethods
    });
  });

  app.get("/api/owner/global-reports/:ownerId", (req, res) => {
    const { establishmentIds } = getContextData(req.params.ownerId);
    
    if (establishmentIds.length === 0) {
      return res.json({ 
        totalRevenue: 0, 
        totalSales: 0, 
        revenueByEstablishment: [], 
        salesByDay: [], 
        topProducts: [],
        paymentMethods: [],
        establishmentComparison: [],
        promotionsEfficiency: []
      });
    }

    const establishments = db.prepare(`SELECT id, name FROM establishments WHERE id IN (${establishmentIds.map(() => '?').join(',')})`).all(...establishmentIds) as any[];
    
    const placeholders = establishmentIds.map(() => '?').join(',');

    // Unified Revenue & Sales for global stats
    const stats = db.prepare(`
      SELECT SUM(revenue) as totalRevenue, SUM(count) as totalSales
      FROM (
        SELECT total_amount as revenue, 1 as count FROM transactions WHERE establishment_id IN (${placeholders})
        UNION ALL
        SELECT total_amount as revenue, 1 as count FROM credit_invoices WHERE establishment_id IN (${placeholders}) AND doc_type IN ('FT', 'FR')
      )
    `).get(...[...establishmentIds, ...establishmentIds]) as any;

    // Revenue, Profit, and Comparison by Establishment
    const establishmentComparison = establishments.map(establishment => {
      const unifiedRevenue = db.prepare(`
        SELECT SUM(revenue) as total, SUM(count) as count FROM (
          SELECT total_amount as revenue, 1 as count FROM transactions WHERE establishment_id = ?
          UNION ALL
          SELECT total_amount as revenue, 1 as count FROM credit_invoices WHERE establishment_id = ? AND doc_type IN ('FT', 'FR')
        )
      `).get(establishment.id, establishment.id) as any;

      const purchases = db.prepare(`
        SELECT SUM(total_amount) as total FROM purchases WHERE establishment_id = ?
      `).get(establishment.id) as any;

      const salaries = db.prepare(`
        SELECT SUM(p.amount) as total 
        FROM hr_salary_payments p
        JOIN hr_salaries s ON p.salary_id = s.id
        JOIN users u ON s.user_id = u.id
        WHERE u.establishment_id = ?
      `).get(establishment.id) as any;

      const totalRevenue = unifiedRevenue?.total || 0;
      const totalExpenses = (purchases?.total || 0) + (salaries?.total || 0);
      const profit = totalRevenue - totalExpenses;
      const salesCount = unifiedRevenue?.count || 0;
      const ticketMedio = salesCount > 0 ? totalRevenue / salesCount : 0;

      return {
        id: establishment.id,
        name: establishment.name,
        revenue: totalRevenue,
        expenses: totalExpenses,
        profit: profit,
        salesCount: salesCount,
        ticketMedio: ticketMedio,
        margin: totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0
      };
    });

    // Sales by Day (last 30 days) - Unified
    const salesByDay = db.prepare(`
      SELECT day as date, SUM(revenue) as revenue
      FROM (
        SELECT date(timestamp) as day, total_amount as revenue
        FROM transactions
        WHERE establishment_id IN (${placeholders}) AND timestamp >= date('now', '-30 days')
        UNION ALL
        SELECT invoice_date as day, total_amount as revenue
        FROM credit_invoices
        WHERE establishment_id IN (${placeholders}) AND invoice_date >= date('now', '-30 days') AND doc_type IN ('FT', 'FR')
      )
      GROUP BY day
      ORDER BY day ASC
    `).all(...[...establishmentIds, ...establishmentIds]);

    // Top Products - Unified
    const productSales: Record<string, { id: any, name: string, quantity: number, revenue: number }> = {};
    const processItems = (rows: any[]) => {
      rows.forEach((t: any) => {
        try {
          const items = JSON.parse(t.items);
          items.forEach((item: any) => {
            const id = item.id || item.ProductCode;
            if (!id) return;
            if (!productSales[id]) {
              productSales[id] = { id, name: item.name || item.ProductDescription, quantity: 0, revenue: 0 };
            }
            productSales[id].quantity += (Number(item.quantity) || 0);
            productSales[id].revenue += (Number(item.quantity) || 0) * (Number(item.price) || 0);
          });
        } catch (e) {}
      });
    };

    processItems(db.prepare(`SELECT items FROM transactions WHERE establishment_id IN (${placeholders})`).all(...establishmentIds));
    processItems(db.prepare(`SELECT items FROM credit_invoices WHERE establishment_id IN (${placeholders}) AND doc_type IN ('FT', 'FR')`).all(...establishmentIds));

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Payment Methods (Sales by Channel) - Unified
    const paymentMethods = db.prepare(`
      SELECT name, SUM(value) as value
      FROM (
        SELECT payment_method as name, total_amount as value FROM transactions WHERE establishment_id IN (${placeholders})
        UNION ALL
        SELECT payment_method as name, total_amount as value FROM credit_invoices WHERE establishment_id IN (${placeholders}) AND doc_type IN ('FT', 'FR')
      )
      GROUP BY name
    `).all(...[...establishmentIds, ...establishmentIds]);

    // Promotions Efficiency
    const promotions = db.prepare(`
      SELECT id, name, start_date, end_date, discount_percent, establishment_id
      FROM promotions
      WHERE establishment_id IN (${placeholders})
    `).all(...establishmentIds) as any[];

    const promotionsEfficiency = promotions.map(promo => {
      const promoProducts = db.prepare(`
        SELECT product_id FROM promotion_products WHERE promotion_id = ?
      `).all(promo.id) as any[];
      const promoProductIds = promoProducts.map(p => p.product_id);

      let promoSalesCount = 0;
      let promoRevenue = 0;

      const transactionsDuringPromo = db.prepare(`
        SELECT items FROM transactions 
        WHERE establishment_id = ? AND timestamp BETWEEN ? AND ?
      `).all(promo.establishment_id, promo.start_date, promo.end_date) as any[];

      transactionsDuringPromo.forEach(t => {
        try {
          const items = JSON.parse(t.items);
          items.forEach((item: any) => {
            if (promoProductIds.includes(item.id)) {
              promoSalesCount += item.quantity;
              promoRevenue += item.quantity * item.price;
            }
          });
        } catch (e) {}
      });

      return {
        name: promo.name,
        sales: promoSalesCount,
        revenue: promoRevenue,
        discount: promo.discount_percent
      };
    }).sort((a, b) => b.revenue - a.revenue);

    res.json({
      totalRevenue: stats.totalRevenue || 0,
      totalSales: stats.totalSales || 0,
      revenueByEstablishment: establishmentComparison.map(s => ({ name: s.name, revenue: s.revenue })),
      salesByDay,
      topProducts,
      paymentMethods,
      establishmentComparison,
      promotionsEfficiency
    });
  });

  app.put("/api/owner/establishment-settings/:id", (req, res) => {
    const { name, nif, phone, email, address, logo_url, status, bank_accounts } = req.body;
    db.prepare(`
      UPDATE establishments 
      SET name = ?, nif = ?, phone = ?, email = ?, address = ?, logo_url = ?, status = ?, bank_accounts = ?
      WHERE id = ?
    `).run(name, nif, phone, email, address, logo_url, status, JSON.stringify(bank_accounts || []), req.params.id);
    res.json({ success: true });
  });

  // Client Routes
  app.get("/api/owner/clients/:establishmentId", (req, res) => {
    const { userId } = req.query;
    const establishmentId = req.params.establishmentId;

    if (userId) {
      const { establishmentIds } = getContextData(userId as string);
      if (establishmentId !== 'all' && !establishmentIds.includes(Number(establishmentId))) {
        return res.status(403).json({ error: "Acesso negado para este estabelecimento." });
      }
    }

    let whereClause = "c.establishment_id = ?";
    let params: any[] = [establishmentId];

    if (establishmentId === 'all') {
      const { establishmentIds } = getContextData(userId as string);
      if (establishmentIds.length === 0) return res.json([]);
      const placeholders = establishmentIds.map(() => '?').join(',');
      whereClause = `c.establishment_id IN (${placeholders})`;
      params = [...establishmentIds];
    }

    const clients = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM transactions t WHERE t.client_nif = c.nif) as total_purchases,
        (SELECT SUM(total_amount) FROM transactions t WHERE t.client_nif = c.nif) as total_spent
      FROM clients c 
      WHERE ${whereClause}
      ORDER BY name ASC
    `).all(...params);
    res.json(clients);
  });

  app.post("/api/owner/clients", (req, res) => {
    const { establishment_id, name, nif, email, phone, address, type } = req.body;
    db.prepare("INSERT INTO clients (establishment_id, name, nif, email, phone, address, type) VALUES (?, ?, ?, ?, ?, ?, ?)").run(establishment_id, name, nif, email, phone, address, type || 'individual');
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
    const { ownerId: effectiveOwnerId } = getContextData(req.params.ownerId);
    const suppliers = db.prepare("SELECT * FROM suppliers WHERE owner_id = ? ORDER BY name ASC").all(effectiveOwnerId);
    res.json(suppliers);
  });

  app.post("/api/owner/suppliers", (req, res) => {
    const { 
      owner_id, name, company_name, nif, phone, email, 
      country, city, address, responsible_person, 
      payment_method, payment_term, observations, status 
    } = req.body;
    const { ownerId: effectiveOwnerId } = getContextData(owner_id);
    db.prepare(`
      INSERT INTO suppliers (
        owner_id, name, company_name, nif, phone, email, 
        country, city, address, responsible_person, 
        payment_method, payment_term, observations, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      effectiveOwnerId, name, company_name, nif, phone, email, 
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
  app.get("/api/owner/purchases/:establishmentId", (req, res) => {
    const purchases = db.prepare(`
      SELECT p.*, s.name as supplier_name 
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.establishment_id = ?
      ORDER BY p.timestamp DESC
    `).all(req.params.establishmentId);
    res.json(purchases.map((p: any) => ({ ...p, items: typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || []) })));
  });

  app.get("/api/owner/suppliers/:id/purchases", (req, res) => {
    const purchases = db.prepare(`
      SELECT p.*, st.name as establishment_name
      FROM purchases p
      JOIN establishments st ON p.establishment_id = st.id
      WHERE p.supplier_id = ?
      ORDER BY p.timestamp DESC
    `).all(req.params.id);
    res.json(purchases.map((p: any) => ({ ...p, items: typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || []) })));
  });

  app.get("/api/owner/suppliers/:ownerId/report", (req, res) => {
    const { ownerId: effectiveOwnerId } = getContextData(req.params.ownerId);
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
    `).all(effectiveOwnerId);
    res.json(report);
  });

  app.post("/api/owner/purchases", (req, res) => {
    const { establishment_id, supplier_id, total_amount, tax_amount = 0, paid_amount, invoice_number, items, due_date, user_id, delivery_status, is_direct, is_stock_updated, is_closed, status } = req.body;
    
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
        INSERT INTO purchases (establishment_id, supplier_id, total_amount, tax_amount, paid_amount, status, invoice_number, items, due_date, delivery_status, is_direct, is_stock_updated, is_closed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(establishment_id, supplier_id, total_amount, tax_amount, (paid_amount || 0), status, finalInvoiceNumber, JSON.stringify(items), due_date, delivery_status, is_direct ? 1 : 0, is_stock_updated ? 1 : 0, is_closed ? 1 : 0);
      
      const purchaseId = purchaseResult.lastInsertRowid;

      // New Finance Integration: Orders -> Payables
      if (paid_amount < total_amount) {
        try {
          const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
          const supplier = db.prepare("SELECT name FROM suppliers WHERE id = ?").get(supplier_id) as any;
          if (establishment && supplier) {
            db.prepare(`
              INSERT INTO accounts_payable (establishment_id, owner_id, supplier_name, amount, due_date, description, status, purchase_id)
              VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
            `).run(establishment_id, establishment.owner_id, supplier.name, (total_amount - (paid_amount || 0)), due_date, `Compra/Encomenda - ${finalInvoiceNumber}`, purchaseId);
          }
        } catch (e) {
          console.error("Error creating payable for purchase:", e);
        }
      }

      if (paid_amount > 0) {
        db.prepare(`
          INSERT INTO purchase_payments (purchase_id, amount, payment_method)
          VALUES (?, ?, ?)
        `).run(purchaseId, paid_amount, 'Initial Payment');

        // Record in financial_transactions
        try {
          const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
          if (establishment) {
            db.prepare(`
              INSERT INTO financial_transactions (
                establishment_id, owner_id, type, category, amount, payment_method, description, date, status, reference_id
              ) VALUES (?, ?, 'expense', 'Compra de Mercadoria', ?, ?, ?, ?, 'paid', ?)
            `).run(
              establishment_id, establishment.owner_id, paid_amount, 'cash',
              `Pagamento Inicial - Compra ${finalInvoiceNumber}`, new Date().toISOString(), purchaseId
            );
          }
        } catch (finError) {
          console.error("Error recording financial transaction for purchase:", finError);
        }
      }

      // If it's a direct purchase, update stock immediately
      if (is_direct) {
        for (const item of items) {
          db.prepare(`
            UPDATE products SET stock = stock + ? WHERE id = ?
          `).run(item.quantity, item.product_id);

          db.prepare(`
            INSERT INTO stock_movements (establishment_id, product_id, user_id, type, quantity, reason, supplier_id, purchase_id)
            VALUES (?, ?, ?, 'in', ?, ?, ?, ?)
          `).run(establishment_id, item.product_id, user_id, item.quantity, `Compra Direta - Fatura ${finalInvoiceNumber}`, supplier_id, purchaseId);
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

      // New Finance Integration: Update Accounts Payable status if liquidated
      const updatedPurchase = db.prepare("SELECT paid_amount, total_amount FROM purchases WHERE id = ?").get(purchase_id) as any;
      if (updatedPurchase && updatedPurchase.paid_amount >= updatedPurchase.total_amount) {
        db.prepare("UPDATE accounts_payable SET status = 'paid' WHERE purchase_id = ?").run(purchase_id);
      }

      // Record in financial_transactions
      try {
        const purchase = db.prepare("SELECT establishment_id, invoice_number FROM purchases WHERE id = ?").get(purchase_id) as any;
        if (purchase) {
          const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(purchase.establishment_id) as any;
          if (establishment) {
            db.prepare(`
              INSERT INTO financial_transactions (
                establishment_id, owner_id, type, category, amount, payment_method, description, date, status, reference_id
              ) VALUES (?, ?, 'expense', 'Pagamento Fornecedor', ?, ?, ?, ?, 'paid', ?)
            `).run(
              purchase.establishment_id, establishment.owner_id, amount, payment_method || 'cash',
              `Pagamento Fornecedor - Compra ${purchase.invoice_number}`, new Date().toISOString(), purchase_id
            );
          }
        }
      } catch (finError) {
        console.error("Error recording financial transaction for purchase payment:", finError);
      }
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
    const { establishment_id, supplier_id, purchase_id, total_amount, tax_amount = 0, reason, items, type = 'credit', note_category = 'return', adjustment_amount = 0, observations = '' } = req.body;
    
    try {
      const transaction = db.transaction(() => {
        // Generate invoice number for the note
        const year = new Date().getFullYear();
        const prefix = type === 'credit' ? 'NC' : 'ND';
        const lastNote = db.prepare("SELECT invoice_number FROM purchase_returns WHERE establishment_id = ? AND type = ? AND invoice_number LIKE ? ORDER BY id DESC LIMIT 1").get(establishment_id, type, `${prefix}-${year}-%`) as { invoice_number: string } | undefined;
        
        let sequence = 1;
        if (lastNote && lastNote.invoice_number) {
          const parts = lastNote.invoice_number.split('-');
          sequence = parseInt(parts[parts.length - 1]) + 1;
        }
        const invoice_number = `${prefix}-${year}-${sequence.toString().padStart(3, '0')}`;

        const stmt = db.prepare(`
          INSERT INTO purchase_returns (establishment_id, supplier_id, purchase_id, total_amount, tax_amount, reason, items, type, note_category, adjustment_amount, observations, invoice_number)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(establishment_id, supplier_id, purchase_id, total_amount, tax_amount, reason, JSON.stringify(items), type, note_category, adjustment_amount, observations, invoice_number);
        const noteId = result.lastInsertRowid;

        // Record in financial_transactions
        try {
          const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
          if (establishment) {
            const finType = type === 'credit' ? 'income' : 'expense';
            const finCategory = type === 'credit' ? 'Devolução de Compra' : 'Acréscimo de Compra';
            db.prepare(`
              INSERT INTO financial_transactions (
                establishment_id, owner_id, type, category, amount, payment_method, description, date, status, reference_id
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)
            `).run(
              establishment_id, establishment.owner_id, finType, finCategory, total_amount, 'other',
              `${finCategory} - Nota ${invoice_number}`, new Date().toISOString(), noteId
            );
          }
        } catch (finError) {
          console.error("Error recording financial transaction for purchase return:", finError);
        }
        
        // Update stock for returned items (only if it's a credit note / return)
        if (type === 'credit' && note_category === 'return') {
          for (const item of items) {
            db.prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND establishment_id = ?").run(item.quantity, item.product_id, establishment_id);
            
            // Record stock movement
            db.prepare(`
              INSERT INTO stock_movements (establishment_id, product_id, type, quantity, reason, purchase_id)
              VALUES (?, ?, 'out', ?, ?, ?)
            `).run(establishment_id, item.product_id, item.quantity, `Nota de Crédito (Devolução) - Motivo: ${reason}`, purchase_id);
          }
        } else if (type === 'debit' && note_category === 'return') {
          // For debit notes, if it involves items (acréscimo), stock should go IN
          for (const item of items) {
            db.prepare("UPDATE products SET stock = stock + ? WHERE id = ? AND establishment_id = ?").run(item.quantity, item.product_id, establishment_id);
            
            // Record stock movement
            db.prepare(`
              INSERT INTO stock_movements (establishment_id, product_id, type, quantity, reason, purchase_id)
              VALUES (?, ?, 'in', ?, ?, ?)
            `).run(establishment_id, item.product_id, item.quantity, `Nota de Débito (Acréscimo) - Motivo: ${reason}`, purchase_id);
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

  app.get("/api/owner/purchase-returns/:establishmentId", (req, res) => {
    try {
      const returns = db.prepare(`
        SELECT r.*, s.name as supplier_name, p.invoice_number as purchase_invoice_number
        FROM purchase_returns r
        JOIN suppliers s ON r.supplier_id = s.id
        LEFT JOIN purchases p ON r.purchase_id = p.id
        WHERE r.establishment_id = ?
        ORDER BY r.timestamp DESC
      `).all(req.params.establishmentId);
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
        db.prepare("UPDATE products SET stock = stock + ? WHERE id = ? AND establishment_id = ?").run(item.quantity, item.product_id, purchase.establishment_id);

        db.prepare(`
          INSERT INTO stock_movements (establishment_id, product_id, user_id, type, quantity, reason, supplier_id, purchase_id)
          VALUES (?, ?, ?, 'in', ?, ?, ?, ?)
        `).run(purchase.establishment_id, item.product_id, user_id, item.quantity, `Recebimento Encomenda - Fatura ${purchase.invoice_number}`, purchase.supplier_id, id);
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

  app.get("/api/seller/clients/:establishmentId", (req, res) => {
    const clients = db.prepare("SELECT * FROM clients WHERE establishment_id = ? ORDER BY name ASC").all(req.params.establishmentId);
    res.json(clients);
  });

  // Seller Routes
  app.get("/api/seller/products/:establishmentId", (req, res) => {
    const products = db.prepare(`
      SELECT p.*, 
        MAX(pr.discount_percent) as discount_percent,
        pr.name as promo_name,
        t.percentage as tax_percentage,
        t.tax_code
      FROM products p 
      LEFT JOIN promotion_products pp ON p.id = pp.product_id
      LEFT JOIN promotions pr ON pp.promotion_id = pr.id 
        AND date('now') BETWEEN date(pr.start_date) AND date(pr.end_date)
      LEFT JOIN taxes t ON p.tax_id = t.id
      WHERE p.establishment_id = ? AND p.stock > 0
      GROUP BY p.id
    `).all(req.params.establishmentId);
    res.json(products);
  });

  app.get("/api/owner/establishments/:establishmentId/invoice-series", (req, res) => {
    const series = db.prepare("SELECT * FROM invoice_series WHERE establishment_id = ? ORDER BY created_at DESC").all(req.params.establishmentId);
    res.json(series);
  });

  app.post("/api/owner/invoice-series/:seriesId/request-approval", (req, res) => {
    const seriesId = req.params.seriesId;
    const series = db.prepare("SELECT * FROM invoice_series WHERE id = ?").get(seriesId) as any;
    
    if (!series) return res.status(404).json({ error: "Série não encontrada." });

    // Automatically approve for now as requested
    db.prepare("UPDATE invoice_series SET agt_status = 'aprovada' WHERE id = ?").run(seriesId);
    res.json({ success: true, message: "Série aprovada automaticamente (Simulação AGT)." });
  });

  app.get("/api/seller/sales/:sellerId", (req, res) => {
    const sellerId = req.params.sellerId;
    
    // Standard transactions (FR)
    const transactions = db.prepare(`
      SELECT t.*, s.name as establishment_name, 'FR' as doc_type
      FROM transactions t
      JOIN establishments s ON t.establishment_id = s.id
      WHERE t.seller_id = ?
    `).all(sellerId) as any[];
    
    // Formal invoices (FR, FT)
    const formalInvoices = db.prepare(`
      SELECT 
        id, establishment_id, seller_id, total_amount, items, 
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
    const { establishment_id, seller_id, cash_register_id, type, amount, description } = req.body;
    
    if (!hasPermission(seller_id, 'pos_withdraw')) {
      return res.status(403).json({ error: "Você não tem permissão para registar movimentos de caixa." });
    }

    // Check for active cashier session
    let sessionQuery = "SELECT id FROM cashier_sessions WHERE establishment_id = ? AND status = 'open'";
    let sessionParams: any[] = [establishment_id];
    if (cash_register_id) {
      sessionQuery += " AND cash_register_id = ?";
      sessionParams.push(cash_register_id);
    }
    const activeSession = db.prepare(sessionQuery).get(...sessionParams);
    if (!activeSession) {
      return res.status(403).json({ error: "O caixa deve estar aberto para registar movimentos." });
    }

    db.prepare("INSERT INTO cash_movements (establishment_id, seller_id, cash_register_id, type, amount, description) VALUES (?, ?, ?, ?, ?, ?)").run(establishment_id, seller_id, cash_register_id || null, type, amount, description);
    const movementId = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };

    // Record in financial_transactions
    try {
      const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
      if (establishment) {
        const finType = type === 'in' ? 'income' : 'expense';
        const finCategory = type === 'in' ? 'Entrada de Caixa (PDV)' : 'Saída de Caixa (PDV)';
        db.prepare(`
          INSERT INTO financial_transactions (
            establishment_id, owner_id, type, category, amount, payment_method, description, date, status, reference_id
          ) VALUES (?, ?, ?, ?, ?, 'cash', ?, ?, 'paid', ?)
        `).run(
          establishment_id, establishment.owner_id, finType, finCategory, amount,
          `Movimento de Caixa PDV: ${description || ''}`,
          new Date().toISOString(), movementId.id
        );
      }
    } catch (finError) {
      console.error("Error recording financial transaction for cash movement:", finError);
    }

    res.json({ success: true });
  });

  // Cashier Sessions
  app.get("/api/seller/active-session/:establishmentId", (req, res) => {
    const { cash_register_id } = req.query;
    let query = "SELECT * FROM cashier_sessions WHERE establishment_id = ? AND status = 'open'";
    let params: any[] = [req.params.establishmentId];

    if (cash_register_id) {
      query += " AND cash_register_id = ?";
      params.push(cash_register_id);
    }

    query += " ORDER BY opening_time DESC LIMIT 1";

    const session = db.prepare(query).get(...params) as any;

    if (!session) return res.json(null);

    // Calculate current totals for this session across the establishment
    const sales = db.prepare(`
      SELECT SUM(total_amount) as total 
      FROM transactions 
      WHERE establishment_id = ? AND timestamp >= ? AND (cash_register_id = ? OR cash_register_id IS NULL)
    `).get(session.establishment_id, session.opening_time, session.cash_register_id) as any;

    const cashIn = db.prepare(`
      SELECT SUM(amount) as total 
      FROM cash_movements 
      WHERE establishment_id = ? AND type = 'in' AND timestamp >= ? AND (cash_register_id = ? OR cash_register_id IS NULL)
    `).get(session.establishment_id, session.opening_time, session.cash_register_id) as any;

    const cashOut = db.prepare(`
      SELECT SUM(amount) as total 
      FROM cash_movements 
      WHERE establishment_id = ? AND type = 'out' AND timestamp >= ? AND (cash_register_id = ? OR cash_register_id IS NULL)
    `).get(session.establishment_id, session.opening_time, session.cash_register_id) as any;

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
    const { establishment_id, seller_id, opening_amount, cash_register_id } = req.body;
    console.log("Opening session request:", { establishment_id, seller_id, opening_amount, cash_register_id });
    
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

    db.prepare("INSERT INTO cashier_sessions (establishment_id, seller_id, opening_amount, cash_register_id) VALUES (?, ?, ?, ?)").run(establishment_id, seller_id, opening_amount, cash_register_id);
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
          WHERE establishment_id = ? AND timestamp >= ? AND (cash_register_id = ? OR cash_register_id IS NULL)
        `).get(session.establishment_id, session.opening_time, session.cash_register_id) as any;
        
        const movements = db.prepare(`
          SELECT SUM(CASE WHEN type = 'in' THEN amount ELSE -amount END) as total
          FROM cash_movements
          WHERE establishment_id = ? AND timestamp >= ? AND (cash_register_id = ? OR cash_register_id IS NULL)
        `).get(session.establishment_id, session.opening_time, session.cash_register_id) as any;

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
  app.get("/api/owner/stock/movements/:establishmentId", (req, res) => {
    const movements = db.prepare(`
      SELECT sm.*, p.name as product_name, u.name as user_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      JOIN users u ON sm.user_id = u.id
      WHERE sm.establishment_id = ?
      ORDER BY sm.timestamp DESC
    `).all(req.params.establishmentId);
    res.json(movements);
  });

  app.post("/api/owner/stock/movement", (req, res) => {
    const { establishment_id, product_id, user_id, type, quantity, reason, supplier_id } = req.body;
    
    try {
      db.transaction(() => {
        if (type === 'in') {
          db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(quantity, product_id);
        } else if (type === 'out' || type === 'adjustment') {
          db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(quantity, product_id);
        }
        
        db.prepare(`
          INSERT INTO stock_movements (establishment_id, product_id, user_id, type, quantity, reason, supplier_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(establishment_id, product_id, user_id, type, quantity, reason, supplier_id || null);
      })();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/owner/stock/transfer", (req, res) => {
    const { from_establishment_id, to_establishment_id, product_id, user_id, quantity, reason } = req.body;
    
    try {
      db.transaction(() => {
        const sourceProduct = db.prepare("SELECT * FROM products WHERE id = ?").get(product_id) as any;
        if (!sourceProduct) {
          throw new Error("Produto não encontrado");
        }
        if (sourceProduct.stock < quantity) {
          throw new Error(`Estoque insuficiente em ${sourceProduct.name}. Disponível: ${sourceProduct.stock}`);
        }

        // Try to find the product in the destination establishment by barcode first, then by name
        let destProduct;
        if (sourceProduct.barcode) {
          destProduct = db.prepare("SELECT * FROM products WHERE establishment_id = ? AND barcode = ?").get(to_establishment_id, sourceProduct.barcode) as any;
        }
        
        if (!destProduct) {
          destProduct = db.prepare("SELECT * FROM products WHERE establishment_id = ? AND name = ?").get(to_establishment_id, sourceProduct.name) as any;
        }
        
        if (!destProduct) {
          const barcode = sourceProduct.barcode || Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
          const result = db.prepare(`
            INSERT INTO products (establishment_id, name, price, stock, category, image_url, min_stock, barcode)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(to_establishment_id, sourceProduct.name, sourceProduct.price, 0, sourceProduct.category, sourceProduct.image_url, sourceProduct.min_stock || 5, barcode);
          destProduct = { id: result.lastInsertRowid };
        }

        db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(quantity, sourceProduct.id);
        db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(quantity, destProduct.id);

        const transferReason = reason || `Transferência de ${quantity} un de ${sourceProduct.name}`;

        db.prepare(`
          INSERT INTO stock_movements (establishment_id, product_id, user_id, type, quantity, reason, from_establishment_id, to_establishment_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(from_establishment_id, sourceProduct.id, user_id, 'transfer', -quantity, transferReason, from_establishment_id, to_establishment_id);

        db.prepare(`
          INSERT INTO stock_movements (establishment_id, product_id, user_id, type, quantity, reason, from_establishment_id, to_establishment_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(to_establishment_id, destProduct.id, user_id, 'transfer', quantity, transferReason, from_establishment_id, to_establishment_id);
      })();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Transfer error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/owner/stock/report/:establishmentId", (req, res) => {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_products,
        SUM(stock) as total_quantity,
        SUM(stock * price) as total_value
      FROM products
      WHERE establishment_id = ?
    `).get(req.params.establishmentId) as any;

    const lowStock = db.prepare(`
      SELECT * FROM products
      WHERE establishment_id = ? AND stock <= min_stock
    `).all(req.params.establishmentId);

    res.json({ stats, lowStock });
  });

  app.post("/api/owner/proforma", (req, res) => {
    const { establishment_id, owner_id, client_name = 'Consumidor Final', client_nif, client_address, total_amount, items } = req.body;
    try {
      // Fetch establishment bank accounts to include in the proforma
      const establishment = db.prepare("SELECT bank_accounts FROM establishments WHERE id = ?").get(establishment_id) as any;
      const bank_accounts = establishment?.bank_accounts || "[]";

      // Generate invoice number
      const year = new Date().getFullYear();
      const count = db.prepare("SELECT count(*) as count FROM proforma_invoices WHERE establishment_id = ? AND strftime('%Y', created_at) = ?").get(establishment_id, year.toString()) as any;
      const invoice_number = `PF ${year}/${(count.count + 1).toString().padStart(3, '0')}`;

      const result = db.prepare(`
        INSERT INTO proforma_invoices (establishment_id, owner_id, client_name, client_nif, client_address, total_amount, items, bank_accounts, invoice_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(establishment_id, owner_id, client_name, client_nif, client_address, total_amount, JSON.stringify(items), bank_accounts, invoice_number);
      
      const newProforma = db.prepare("SELECT * FROM proforma_invoices WHERE id = ?").get(result.lastInsertRowid) as any;
      res.json({
        ...newProforma,
        items: typeof newProforma.items === 'string' ? JSON.parse(newProforma.items) : (newProforma.items || [])
      });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/owner/proforma/:establishmentId", (req, res) => {
    const proformas = db.prepare("SELECT * FROM proforma_invoices WHERE establishment_id = ? ORDER BY created_at DESC").all(req.params.establishmentId) as any[];
    res.json(proformas.map(p => ({
      ...p,
      items: p.items ? (typeof p.items === 'string' ? JSON.parse(p.items) : p.items) : [],
      bank_accounts: p.bank_accounts ? (typeof p.bank_accounts === 'string' ? JSON.parse(p.bank_accounts) : p.bank_accounts) : []
    })));
  });

  app.post("/api/owner/credit-invoices", (req, res) => {
    const { 
      establishment_id, client_nif, client_name, address, country, 
      doc_type, series: providedSeries, invoice_number: providedNumber, invoice_date, 
      currency, total_amount, tax_amount, items, seller_id,
      payment_method, parent_invoice_id, reason, note_category,
      adjustment_amount, observations
    } = req.body;

    console.log("Creating credit invoice request:", { establishment_id, doc_type, items_count: items?.length });

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
          const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
          const owner = db.prepare("SELECT billing_mode FROM users WHERE id = ?").get(establishment.owner_id) as any;
          const billing_mode = (owner?.billing_mode === 'eletronica') ? 'eletronica' : 'tradicional';
          const seriesPrefix = billing_mode === 'eletronica' ? 'E' : 'A';

          const lastInvoice = db.prepare(`
            SELECT invoice_number FROM credit_invoices 
            WHERE establishment_id = ? AND doc_type = ? AND series = ?
            ORDER BY id DESC LIMIT 1
          `).get(establishment_id, doc_type, finalSeries) as { invoice_number: string } | undefined;

          let nextNum = 1;
          if (lastInvoice) {
            const lastNumMatch = lastInvoice.invoice_number.match(/\/(\d+)$/);
            const lastNum = lastNumMatch ? parseInt(lastNumMatch[1]) : 0;
            nextNum = lastNum + 1;
          }
          finalNumber = `${doc_type} ${seriesPrefix}/${finalSeries}/${nextNum.toString().padStart(4, '0')}`;
        }

        // Digital Signature
        const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
        const signatureData = DigitalSignatureService.signDocument(establishment.owner_id, establishment_id, {
          invoice_number: finalNumber,
          total_amount,
          date: invoice_date || new Date().toISOString(),
          items: JSON.stringify(items)
        });

        const result = db.prepare(`
          INSERT INTO credit_invoices (
            establishment_id, client_nif, client_name, address, country, 
            doc_type, series, invoice_number, invoice_date, 
            currency, total_amount, tax_amount, items, seller_id,
            payment_method, parent_invoice_id, reason, note_category,
            adjustment_amount, observations, due_date, service_designation,
            hash, signature, prev_signature, key_version_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          establishment_id, client_nif, client_name, address, country, 
          doc_type, finalSeries, finalNumber, invoice_date, 
          currency, total_amount, tax_amount, JSON.stringify(items), seller_id || null,
          payment_method || 'cash', parent_invoice_id || null, reason || null, 
          note_category || null, adjustment_amount || 0, observations || null, req.body.due_date || null, req.body.service_designation || null,
          signatureData.hash, signatureData.signature, signatureData.prev_signature, signatureData.key_version_id
        );

        const invoiceId = result.lastInsertRowid;

        // Mark cancellation request as approved if applicable
        if ((doc_type === 'NC' || doc_type === 'ND') && parent_invoice_id) {
          db.prepare("UPDATE cancellation_requests SET status = 'approved', processed_at = CURRENT_TIMESTAMP WHERE invoice_id = ? AND doc_type = ?").run(parent_invoice_id, doc_type);
        }

        // New Finance Integration: FT -> Receivables
        if (doc_type === 'FT') {
          try {
            const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
            if (establishment) {
              db.prepare(`
                INSERT INTO accounts_receivable (establishment_id, owner_id, client_name, amount, due_date, description, status, invoice_id)
                VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
              `).run(establishment_id, establishment.owner_id, client_name, total_amount, req.body.due_date, `Fatura Crédito - ${finalNumber}`, invoiceId);
            }
          } catch (e) {
            console.error("Error creating receivable for FT:", e);
          }
        }

        // New Finance Integration: RC -> Liquidate FT
        if (doc_type === 'RC' && parent_invoice_id) {
          try {
            db.prepare("UPDATE credit_invoices SET status = 'paid' WHERE id = ?").run(parent_invoice_id);
            db.prepare("UPDATE accounts_receivable SET status = 'paid' WHERE invoice_id = ?").run(parent_invoice_id);
          } catch (e) {
            console.error("Error liquidating FT with RC:", e);
          }
        }

        // Record in financial_transactions - SKIP FOR PROFORMAS (PP) AND CREDIT INVOICES (FT)
        // FT will only count as income once it is paid (RC created)
        if (doc_type !== 'PP' && doc_type !== 'FT') {
          try {
            const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
            if (establishment) {
              const finType = doc_type === 'NC' ? 'expense' : 'income';
              const finCategory = doc_type === 'NC' ? 'Nota de Crédito (Venda)' : 
                                  doc_type === 'RC' ? 'Recibo de Pagamento (FT)' : 'Venda Faturada';
              db.prepare(`
                INSERT INTO financial_transactions (
                  establishment_id, owner_id, type, category, amount, payment_method, description, date, status, reference_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)
              `).run(
                establishment_id, establishment.owner_id, finType, finCategory, total_amount, payment_method || 'cash',
                `${finCategory} - Documento ${finalNumber}${parent_invoice_id ? ' (Ref: ' + parent_invoice_id + ')' : ''}`, 
                new Date().toISOString(), invoiceId
              );
            }
          } catch (finError) {
            console.error("Error recording financial transaction for credit invoice:", finError);
          }
        }

        // Update stock for products - SKIP FOR PROFORMAS (PP)
        if (doc_type !== 'PP') {
          for (const item of items) {
            if (item.type === 'product' && item.quantity > 0) {
              if (doc_type === 'NC') {
                // Nota de Crédito
                if (note_category === 'return') {
                  // Return to stock
                  db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(item.quantity, item.product_id || item.id);
                  
                  // Record stock movement
                  db.prepare(`
                    INSERT INTO stock_movements (establishment_id, product_id, type, quantity, reason)
                    VALUES (?, ?, 'in', ?, ?)
                  `).run(establishment_id, item.product_id || item.id, item.quantity, `Nota de Crédito (Devolução) - Fatura: ${finalNumber}`);
                }
              } else if (doc_type !== 'RC') {
                // FT, FR, ND - Stock goes OUT (RC is just a payment for an existing FT, so stock was already reduced)
                db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(item.quantity, item.product_id || item.id);
                
                // Record stock movement
                db.prepare(`
                  INSERT INTO stock_movements (establishment_id, product_id, type, quantity, reason)
                  VALUES (?, ?, 'out', ?, ?)
                `).run(establishment_id, item.product_id || item.id, item.quantity, `${doc_type === 'ND' ? 'Nota de Débito' : 'Fatura'} - Nº: ${finalNumber}`);
              }
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

  app.get("/api/owner/credit-invoices/:establishmentId", (req, res) => {
    try {
      const invoices = db.prepare(`
        SELECT 
          t1.id, t1.establishment_id, t1.owner_id, t1.seller_id, t1.parent_invoice_id, 
          t1.client_name, t1.client_nif, t1.address, t1.country, t1.doc_type, 
          t1.series, t1.invoice_number, t1.invoice_date, t1.currency, t1.total_amount, 
          t1.tax_amount, t1.payment_method, t1.reason, t1.note_category, 
          t1.adjustment_amount, t1.observations, t1.items, t1.due_date, t1.created_at,
          t1.status,
          t2.invoice_number as parent_invoice_number,
          0 as is_pos
        FROM credit_invoices t1
        LEFT JOIN credit_invoices t2 ON t1.parent_invoice_id = t2.id
        WHERE t1.establishment_id = ? 
        
        UNION ALL

        SELECT 
          id, establishment_id, NULL as owner_id, seller_id, NULL as parent_invoice_id,
          '🛒 PDV - ' || client_name as client_name, client_nif, '' as address, 'Angola' as country, 'FR' as doc_type,
          '' as series, invoice_number, timestamp as invoice_date, 'AOA' as currency, total_amount,
          tax_amount, payment_method, '' as reason, '' as note_category,
          0 as adjustment_amount, '' as observations, items, NULL as due_date, timestamp as created_at,
          'liquidado' as status,
          NULL as parent_invoice_number,
          1 as is_pos
        FROM transactions
        WHERE establishment_id = ?

        ORDER BY created_at DESC
      `).all(req.params.establishmentId, req.params.establishmentId) as any[];
      res.json(invoices.map(inv => ({
        ...inv,
        items: inv.items ? (typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items) : []
      })));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // --- Invoice Series ---
  app.get("/api/owner/invoice-series/:ownerId", (req, res) => {
    const { establishmentIds } = getContextData(req.params.ownerId);
    if (establishmentIds.length === 0) return res.json([]);
    const placeholders = establishmentIds.map(() => '?').join(',');
    const series = db.prepare(`
      SELECT s.*, st.name as establishment_name 
      FROM invoice_series s
      JOIN establishments st ON s.establishment_id = st.id
      WHERE s.establishment_id IN (${placeholders})
    `).all(...establishmentIds);
    res.json(series);
  });

  app.post("/api/owner/invoice-series", (req, res) => {
    const { establishment_id, name, prefix: providedPrefix, start_number } = req.body;
    
    // Force prefix based on billing mode
    const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
    const owner = db.prepare("SELECT billing_mode FROM users WHERE id = ?").get(establishment.owner_id) as any;
    const billing_mode = (owner?.billing_mode === 'eletronica') ? 'eletronica' : 'tradicional';
    const forcedPrefix = billing_mode === 'eletronica' ? 'E' : 'A';
    
    db.prepare(`
      INSERT INTO invoice_series (establishment_id, name, prefix, start_number, current_number, agt_status, is_electronic)
      VALUES (?, ?, ?, ?, ?, 'aprovada', ?)
    `).run(establishment_id, name, forcedPrefix, start_number, 0, billing_mode === 'eletronica' ? 1 : 0);
    res.json({ success: true });
  });

  app.put("/api/owner/invoice-series/:id/status", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE invoice_series SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/owner/invoice-series/:id", (req, res) => {
    const series = db.prepare("SELECT current_number FROM invoice_series WHERE id = ?").get(req.params.id) as any;
    if (series && series.current_number > 0) {
      return res.status(400).json({ error: "Não é possível apagar uma série que já possui faturas emitidas." });
    }
    db.prepare("DELETE FROM invoice_series WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // --- Taxes ---
  app.get("/api/owner/taxes/establishment/:establishmentId", (req, res) => {
    const establishmentId = req.params.establishmentId;
    const taxes = db.prepare(`
      SELECT t.*, st.name as establishment_name 
      FROM taxes t
      JOIN establishments st ON t.establishment_id = st.id
      WHERE t.establishment_id = ?
    `).all(establishmentId);
    res.json(taxes);
  });

  app.get("/api/owner/taxes/:ownerId", (req, res) => {
    const { establishmentIds } = getContextData(req.params.ownerId);
    if (establishmentIds.length === 0) return res.json([]);
    const placeholders = establishmentIds.map(() => '?').join(',');
    const taxes = db.prepare(`
      SELECT t.*, st.name as establishment_name 
      FROM taxes t
      JOIN establishments st ON t.establishment_id = st.id
      WHERE t.establishment_id IN (${placeholders})
    `).all(...establishmentIds);
    res.json(taxes);
  });

  app.post("/api/owner/taxes", (req, res) => {
    let { establishment_id, name, percentage, tax_code } = req.body;
    
    // Enforce Exclusion Regime if applicable
    const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
    if (establishment) {
      const owner = db.prepare("SELECT fiscal_regime FROM users WHERE id = ?").get(establishment.owner_id) as any;
      if (owner && owner.fiscal_regime === 'exclusao') {
        percentage = 0;
        tax_code = 'ISE';
      }
    }

    db.prepare(`
      INSERT INTO taxes (establishment_id, name, percentage, tax_code)
      VALUES (?, ?, ?, ?)
    `).run(establishment_id, name, percentage, tax_code || 'NOR');
    res.json({ success: true });
  });

  app.put("/api/owner/taxes/:id", (req, res) => {
    let { establishment_id, name, percentage, tax_code } = req.body;

    // Enforce Exclusion Regime if applicable
    const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
    if (establishment) {
      const owner = db.prepare("SELECT fiscal_regime FROM users WHERE id = ?").get(establishment.owner_id) as any;
      if (owner && owner.fiscal_regime === 'exclusao') {
        percentage = 0;
        tax_code = 'ISE';
      }
    }

    db.prepare(`
      UPDATE taxes 
      SET establishment_id = ?, name = ?, percentage = ?, tax_code = ?
      WHERE id = ?
    `).run(establishment_id, name, percentage, tax_code || 'NOR', req.params.id);
    res.json({ success: true });
  });

  app.put("/api/owner/taxes/:id/default", (req, res) => {
    const { establishment_id } = req.body;
    db.transaction(() => {
      // Unset current default for this establishment
      db.prepare("UPDATE taxes SET is_default = 0 WHERE establishment_id = ?").run(establishment_id);
      // Set new default
      db.prepare("UPDATE taxes SET is_default = 1 WHERE id = ?").run(req.params.id);
    })();
    res.json({ success: true });
  });

  app.put("/api/owner/taxes/:id/status", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE taxes SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/owner/taxes/:id", (req, res) => {
    const taxId = req.params.id;
    
    // Check if tax is used in products
    const productCount = db.prepare("SELECT COUNT(*) as count FROM products WHERE tax_id = ?").get(taxId) as { count: number };
    if (productCount.count > 0) {
      return res.status(400).json({ error: "Este imposto está a ser utilizado por produtos e não pode ser excluído." });
    }

    // Check if tax is used in services
    const serviceCount = db.prepare("SELECT COUNT(*) as count FROM services WHERE tax_id = ?").get(taxId) as { count: number };
    if (serviceCount.count > 0) {
      return res.status(400).json({ error: "Este imposto está a ser utilizado por serviços e não pode ser excluído." });
    }

    // Check if it's a default tax
    const tax = db.prepare("SELECT is_default FROM taxes WHERE id = ?").get(taxId) as { is_default: number };
    if (tax && tax.is_default === 1) {
      return res.status(400).json({ error: "Não é possível excluir o imposto padrão. Defina outro imposto como padrão primeiro." });
    }

    db.prepare("DELETE FROM taxes WHERE id = ?").run(taxId);
    res.json({ success: true });
  });

  // --- Backups ---
  app.get("/api/owner/backups/:ownerId", (req, res) => {
    const ownerId = req.params.ownerId;
    const backups = db.prepare("SELECT * FROM backups WHERE owner_id = ? ORDER BY created_at DESC").all(ownerId);
    const settings = db.prepare("SELECT * FROM owner_settings WHERE owner_id = ?").get(ownerId) || { backup_enabled: 0, backup_frequency: 'daily', financial_reminder_enabled: 0 };
    res.json({ backups, settings });
  });

  app.post("/api/owner/backups/settings", (req, res) => {
    const { owner_id, backup_enabled, backup_frequency, financial_reminder_enabled } = req.body;
    db.prepare(`
      INSERT INTO owner_settings (owner_id, backup_enabled, backup_frequency, financial_reminder_enabled)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(owner_id) DO UPDATE SET
        backup_enabled = excluded.backup_enabled,
        backup_frequency = excluded.backup_frequency,
        financial_reminder_enabled = excluded.financial_reminder_enabled
    `).run(owner_id, backup_enabled ? 1 : 0, backup_frequency, financial_reminder_enabled ? 1 : 0);
    res.json({ success: true });
  });

  app.post("/api/owner/backups/generate", (req, res) => {
    const { owner_id } = req.body;
    const filename = `backup_${owner_id}_${Date.now()}.db`;
    const size = Math.floor(Math.random() * 1000000) + 500000; // Simulated size
    db.prepare("INSERT INTO backups (owner_id, filename, size) VALUES (?, ?, ?)").run(owner_id, filename, size);
    res.json({ success: true });
  });

  app.get("/api/owner/backups/download/:id", (req, res) => {
    const backup = db.prepare("SELECT * FROM backups WHERE id = ?").get(req.params.id) as any;
    if (!backup) return res.status(404).json({ error: "Backup not found" });
    
    // In a real system, we'd send the actual file. Here we'll send a dummy blob.
    res.setHeader('Content-Disposition', `attachment; filename=${backup.filename}`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(Buffer.from("Simulated backup data for " + backup.filename));
  });

  // --- Warehouses ---
  app.get("/api/owner/warehouses/:ownerId", (req, res) => {
    const { establishmentIds } = getContextData(req.params.ownerId);
    if (establishmentIds.length === 0) return res.json([]);
    const placeholders = establishmentIds.map(() => '?').join(',');

    const warehouses = db.prepare(`
      SELECT w.*, st.name as establishment_name 
      FROM warehouses w
      JOIN establishments st ON w.establishment_id = st.id
      WHERE w.establishment_id IN (${placeholders})
    `).all(...establishmentIds);
    res.json(warehouses);
  });

  app.post("/api/owner/warehouses", (req, res) => {
    const { establishment_id, name, type } = req.body;
    db.prepare(`
      INSERT INTO warehouses (establishment_id, name, type)
      VALUES (?, ?, ?)
    `).run(establishment_id, name, type);
    res.json({ success: true });
  });

  app.put("/api/owner/warehouses/:id", (req, res) => {
    const { name, type, status } = req.body;
    db.prepare("UPDATE warehouses SET name = ?, type = ?, status = ? WHERE id = ?").run(name, type, status, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/owner/warehouses/:id", (req, res) => {
    db.prepare("DELETE FROM warehouses WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `Rota API não encontrada: ${req.method} ${req.originalUrl}` });
  });

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Global Error Handler:", err);
    res.status(err.status || 500).json({ 
      error: err.message || "Erro interno do servidor.",
      path: req.path,
      method: req.method
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      console.log("Initializing Vite dev server...");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite dev server initialized.");
    } catch (viteError) {
      console.error("Failed to initialize Vite server:", viteError);
    }
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

startServer().catch(err => {
  console.error("FATAL: Failed to start server:", err);
  process.exit(1);
});

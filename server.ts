import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("database.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    role TEXT,
    phone TEXT,
    nif TEXT,
    address TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'suspended'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

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
    nif TEXT,
    logo_url TEXT,
    status TEXT DEFAULT 'active', -- 'active' or 'inactive'
    license_status TEXT DEFAULT 'active',
    license_expiry TEXT,
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
    FOREIGN KEY(store_id) REFERENCES stores(id)
  );
`);

  // Migration: Add missing columns to users
  try {
    const columns = db.prepare("PRAGMA table_info(users)").all() as any[];
    if (!columns.some(col => col.name === 'phone')) db.exec("ALTER TABLE users ADD COLUMN phone TEXT");
    if (!columns.some(col => col.name === 'nif')) db.exec("ALTER TABLE users ADD COLUMN nif TEXT");
    if (!columns.some(col => col.name === 'address')) db.exec("ALTER TABLE users ADD COLUMN address TEXT");
    if (!columns.some(col => col.name === 'company_name')) db.exec("ALTER TABLE users ADD COLUMN company_name TEXT");
    if (!columns.some(col => col.name === 'status')) db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'");
    if (!columns.some(col => col.name === 'created_at')) {
      db.exec("ALTER TABLE users ADD COLUMN created_at DATETIME");
      db.exec("UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL");
    }
  } catch (e) {
    console.error("Migration error (users):", e);
  }

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
} catch (e) {
  console.error("Migration error (stores):", e);
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

  CREATE TABLE IF NOT EXISTS cashier_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER,
    seller_id INTEGER,
    opening_amount REAL,
    closing_amount REAL,
    physical_amount REAL,
    opening_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    closing_time DATETIME,
    status TEXT DEFAULT 'open', -- 'open' or 'closed'
    FOREIGN KEY(store_id) REFERENCES stores(id),
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
`);

// Seed Data (if empty)
const userCount = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)").run("admin@factu.com", "admin", "Admin Master", "admin");
  db.prepare("INSERT INTO users (email, password, name, role, phone, nif, address) VALUES (?, ?, ?, ?, ?, ?, ?)").run("owner@factu.com", "owner", "Dono da Loja", "owner", "923000000", "540123456", "Luanda, Angola");
  db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)").run("seller@factu.com", "seller", "Vendedor 1", "seller");
  
  db.prepare("INSERT INTO stores (owner_id, name, address, license_expiry) VALUES (?, ?, ?, ?)").run(2, "Minha Loja A", "Rua 1, Luanda", "2026-12-31");
  db.prepare("INSERT INTO stores (owner_id, name, address, license_expiry) VALUES (?, ?, ?, ?)").run(2, "Minha Loja B", "Rua 2, Luanda", "2026-12-31");
  
  db.prepare("INSERT INTO system_plans (name, price, max_stores, max_products, features) VALUES (?, ?, ?, ?, ?)").run("Básico", 5000, 1, 100, '{"reports": false, "multi_store": false}');
  db.prepare("INSERT INTO system_plans (name, price, max_stores, max_products, features) VALUES (?, ?, ?, ?, ?)").run("Profissional", 15000, 5, 1000, '{"reports": true, "multi_store": true}');
  
  db.prepare("INSERT INTO system_settings (key, value) VALUES (?, ?)").run("expiration_notice", "true");
  db.prepare("INSERT INTO system_settings (key, value) VALUES (?, ?)").run("weekly_reports", "false");
  db.prepare("INSERT INTO system_settings (key, value) VALUES (?, ?)").run("system_name", "FactuModern");
  
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

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // --- API Routes ---

  // Auth (Mock for now)
  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password) as any;
    if (user) {
      let storeId = null;
      if (user.role === 'seller') {
        const staff = db.prepare("SELECT store_id FROM staff WHERE user_id = ?").get(user.id) as any;
        storeId = staff?.store_id;
      }
      res.json({ id: user.id, email: user.email, name: user.name, role: user.role, store_id: storeId });
    } else {
      res.status(401).json({ error: "Credenciais inválidas" });
    }
  });

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
      SELECT 'venda' as type, total_amount as value, timestamp, s.name as store_name
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
      SELECT u.name as client_name, s.name as store_name, s.license_expiry
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
    const { name, email, phone, nif, address, company_name, password } = req.body;
    if (password) {
      db.prepare("UPDATE users SET name = ?, email = ?, phone = ?, nif = ?, address = ?, company_name = ?, password = ? WHERE id = ?").run(name, email, phone, nif, address, company_name, password, req.params.id);
    } else {
      db.prepare("UPDATE users SET name = ?, email = ?, phone = ?, nif = ?, address = ?, company_name = ? WHERE id = ?").run(name, email, phone, nif, address, company_name, req.params.id);
    }
    res.json({ success: true });
  });

  // Owner Routes
  app.get("/api/owner/stores/:ownerId", (req, res) => {
    const stores = db.prepare(`
      SELECT s.*, 
        (SELECT count(*) FROM staff st WHERE st.store_id = s.id) as staff_count,
        (SELECT SUM(total_amount) FROM transactions t WHERE t.store_id = s.id AND date(t.timestamp) = date('now')) as today_sales
      FROM stores s 
      WHERE s.owner_id = ?
    `).all(req.params.ownerId);
    res.json(stores);
  });

  app.post("/api/owner/stores", (req, res) => {
    const { owner_id, name, address, phone, nif, logo_url } = req.body;
    db.prepare(`
      INSERT INTO stores (owner_id, name, address, phone, nif, logo_url, license_expiry) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(owner_id, name, address, phone, nif, logo_url, "2026-12-31");
    res.json({ success: true });
  });

  app.put("/api/owner/stores/:storeId", (req, res) => {
    const { name, address, phone, nif, logo_url, status } = req.body;
    db.prepare(`
      UPDATE stores 
      SET name = ?, address = ?, phone = ?, nif = ?, logo_url = ?, status = ? 
      WHERE id = ?
    `).run(name, address, phone, nif, logo_url, status, req.params.storeId);
    res.json({ success: true });
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
      SELECT s.*, u.name, u.email 
      FROM staff s 
      JOIN users u ON s.user_id = u.id 
      WHERE s.store_id = ?
    `).all(req.params.storeId);
    res.json(staff);
  });

  app.put("/api/owner/staff/:staffId", (req, res) => {
    const { salary, shift_info, name, email } = req.body;
    try {
      db.transaction(() => {
        const staff = db.prepare("SELECT user_id FROM staff WHERE id = ?").get(req.params.staffId) as any;
        if (staff) {
          db.prepare("UPDATE users SET name = ?, email = ? WHERE id = ?").run(name, email, staff.user_id);
          db.prepare("UPDATE staff SET salary = ?, shift_info = ? WHERE id = ?").run(salary, shift_info, req.params.staffId);
        }
      })();
      res.json({ success: true });
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
          // We might want to keep the user for historical transactions, or delete if no transactions exist
          // For simplicity, we just remove the staff link. If we delete the user, transactions might break FKs.
          // db.prepare("DELETE FROM users WHERE id = ?").run(staff.user_id);
        }
      })();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/owner/staff-performance/:storeId", (req, res) => {
    const performance = db.prepare(`
      SELECT 
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
    db.prepare("INSERT INTO products (store_id, name, price, stock, category, image_url, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?)").run(store_id, name, price, stock, category, image_url, min_stock || 5);
    res.json({ success: true });
  });

  app.delete("/api/owner/products/:id", (req, res) => {
    db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/owner/products/:id", (req, res) => {
    const { name, price, stock, category, image_url, min_stock } = req.body;
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

  app.put("/api/owner/store-settings/:id", (req, res) => {
    const { name, nif, phone, address, logo_url, status } = req.body;
    db.prepare(`
      UPDATE stores 
      SET name = ?, nif = ?, phone = ?, address = ?, logo_url = ?, status = ?
      WHERE id = ?
    `).run(name, nif, phone, address, logo_url, status, req.params.id);
    res.json({ success: true });
  });

  // Seller Routes
  app.get("/api/seller/products/:storeId", (req, res) => {
    const products = db.prepare(`
      SELECT p.*, 
        pr.discount_percent,
        pr.name as promo_name
      FROM products p 
      LEFT JOIN promotion_products pp ON p.id = pp.product_id
      LEFT JOIN promotions pr ON pp.promotion_id = pr.id 
        AND date('now') BETWEEN date(pr.start_date) AND date(pr.end_date)
      WHERE p.store_id = ? AND p.stock > 0
    `).all(req.params.storeId);
    res.json(products);
  });

  app.post("/api/seller/sale", (req, res) => {
    const { store_id, seller_id, total_amount, items, payment_method, cash_received } = req.body;
    const info = db.prepare("INSERT INTO transactions (store_id, seller_id, total_amount, items, payment_method, cash_received) VALUES (?, ?, ?, ?, ?, ?)").run(
      store_id, 
      seller_id, 
      total_amount, 
      JSON.stringify(items),
      payment_method || 'cash',
      cash_received || total_amount
    );
    
    // Update stock
    for (const item of items) {
      db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(item.quantity, item.id);
    }
    
    res.json({ success: true, transactionId: info.lastInsertRowid });
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
    const { store_id, seller_id, type, amount, description } = req.body;
    db.prepare("INSERT INTO cash_movements (store_id, seller_id, type, amount, description) VALUES (?, ?, ?, ?, ?)").run(store_id, seller_id, type, amount, description);
    res.json({ success: true });
  });

  // Cashier Sessions
  app.get("/api/seller/active-session/:sellerId", (req, res) => {
    const session = db.prepare(`
      SELECT * FROM cashier_sessions 
      WHERE seller_id = ? AND status = 'open'
      ORDER BY opening_time DESC LIMIT 1
    `).get(req.params.sellerId) as any;

    if (!session) return res.json(null);

    // Calculate current totals for this session
    const sales = db.prepare(`
      SELECT SUM(total_amount) as total 
      FROM transactions 
      WHERE seller_id = ? AND timestamp >= ?
    `).get(session.seller_id, session.opening_time) as any;

    const cashIn = db.prepare(`
      SELECT SUM(amount) as total 
      FROM cash_movements 
      WHERE seller_id = ? AND type = 'in' AND timestamp >= ?
    `).get(session.seller_id, session.opening_time) as any;

    const cashOut = db.prepare(`
      SELECT SUM(amount) as total 
      FROM cash_movements 
      WHERE seller_id = ? AND type = 'out' AND timestamp >= ?
    `).get(session.seller_id, session.opening_time) as any;

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
    const { store_id, seller_id, opening_amount } = req.body;
    db.prepare("INSERT INTO cashier_sessions (store_id, seller_id, opening_amount) VALUES (?, ?, ?)").run(store_id, seller_id, opening_amount);
    res.json({ success: true });
  });

  app.post("/api/seller/close-session", (req, res) => {
    const { session_id, physical_amount, closing_amount } = req.body;
    db.prepare(`
      UPDATE cashier_sessions 
      SET physical_amount = ?, closing_amount = ?, closing_time = CURRENT_TIMESTAMP, status = 'closed' 
      WHERE id = ?
    `).run(physical_amount, closing_amount, session_id);
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
    const { store_id, product_id, user_id, type, quantity, reason } = req.body;
    
    try {
      db.transaction(() => {
        if (type === 'in') {
          db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(quantity, product_id);
        } else if (type === 'out' || type === 'adjustment') {
          db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(quantity, product_id);
        }
        
        db.prepare(`
          INSERT INTO stock_movements (store_id, product_id, user_id, type, quantity, reason)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(store_id, product_id, user_id, type, quantity, reason);
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
        if (!sourceProduct || sourceProduct.stock < quantity) {
          throw new Error("Estoque insuficiente para transferência");
        }

        let destProduct = db.prepare("SELECT * FROM products WHERE store_id = ? AND name = ?").get(to_store_id, sourceProduct.name) as any;
        
        if (!destProduct) {
          const result = db.prepare(`
            INSERT INTO products (store_id, name, price, stock, category, image_url, min_stock)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(to_store_id, sourceProduct.name, sourceProduct.price, 0, sourceProduct.category, sourceProduct.image_url, sourceProduct.min_stock || 5);
          destProduct = { id: result.lastInsertRowid };
        }

        db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(quantity, sourceProduct.id);
        db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(quantity, destProduct.id);

        db.prepare(`
          INSERT INTO stock_movements (store_id, product_id, user_id, type, quantity, reason, from_store_id, to_store_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(from_store_id, sourceProduct.id, user_id, 'transfer', -quantity, reason, from_store_id, to_store_id);

        db.prepare(`
          INSERT INTO stock_movements (store_id, product_id, user_id, type, quantity, reason, from_store_id, to_store_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(to_store_id, destProduct.id, user_id, 'transfer', quantity, reason, from_store_id, to_store_id);
      })();
      res.json({ success: true });
    } catch (error: any) {
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

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
    role TEXT
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
    FOREIGN KEY(store_id) REFERENCES stores(id)
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
`);

// Seed Data (if empty)
const userCount = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)").run("admin@factu.com", "admin", "Admin Master", "admin");
  db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)").run("owner@factu.com", "owner", "Dono da Loja", "owner");
  db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)").run("seller@factu.com", "seller", "Vendedor 1", "seller");
  
  db.prepare("INSERT INTO stores (owner_id, name, address, license_expiry) VALUES (?, ?, ?, ?)").run(2, "Minha Loja A", "Rua 1, Luanda", "2026-12-31");
  db.prepare("INSERT INTO stores (owner_id, name, address, license_expiry) VALUES (?, ?, ?, ?)").run(2, "Minha Loja B", "Rua 2, Luanda", "2026-12-31");
  
  db.prepare("INSERT INTO products (store_id, name, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(1, "Cuca Garrafa 33cl", 350, 150, "Bebidas", "https://grupocastelangola.com/wp-content/uploads/2021/05/cuca-garrafa-33cl.png");
  db.prepare("INSERT INTO products (store_id, name, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(1, "Nocal Garrafa 33cl", 350, 120, "Bebidas", "https://grupocastelangola.com/wp-content/uploads/2021/05/nocal-garrafa.png");
  db.prepare("INSERT INTO products (store_id, name, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(1, "Eka Garrafa 33cl", 350, 100, "Bebidas", "https://grupocastelangola.com/wp-content/uploads/2021/05/eka-garrafa.png");
  db.prepare("INSERT INTO products (store_id, name, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(1, "Doppel Munich", 450, 60, "Bebidas", "https://grupocastelangola.com/wp-content/uploads/2021/05/doppel-garrafa.png");
  db.prepare("INSERT INTO products (store_id, name, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(1, "Booster Cider", 450, 80, "Bebidas", "https://grupocastelangola.com/wp-content/uploads/2021/05/booster-lata.png");
  db.prepare("INSERT INTO products (store_id, name, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(1, "Coca-Cola Lata", 400, 200, "Bebidas", "https://purepng.com/public/uploads/large/purepng.com-coca-cola-can-classiccoca-cola-cancoca-coladrinkclassic-14115272332616y7k3.png");
  db.prepare("INSERT INTO products (store_id, name, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(1, "Pão Francês", 50, 500, "Alimentos", "https://pngimg.com/uploads/bread/bread_PNG2296.png");
  db.prepare("INSERT INTO products (store_id, name, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(1, "Morango Fresco", 2500, 30, "Alimentos", "https://pngimg.com/uploads/strawberry/strawberry_PNG2595.png");
  db.prepare("INSERT INTO products (store_id, name, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(1, "Perfume Chanel N5", 85000, 10, "Cosméticos", "https://pngimg.com/uploads/perfume/perfume_PNG10287.png");
  db.prepare("INSERT INTO products (store_id, name, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(1, "Blue Polpa 33cl", 300, 120, "Bebidas", "https://blue.co.ao/wp-content/uploads/2021/05/blue-polpa.png");
  db.prepare("INSERT INTO products (store_id, name, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(1, "Arroz Tio Lucas 1kg", 1800, 100, "Alimentos", "https://pngimg.com/uploads/rice/rice_PNG18.png");
  db.prepare("INSERT INTO products (store_id, name, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(1, "Sabonete Dove", 850, 60, "Cosméticos", "https://pngimg.com/uploads/soap/soap_PNG46.png");
  db.prepare("INSERT INTO products (store_id, name, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(1, "Leite Nido 400g", 4500, 40, "Alimentos", "https://pngimg.com/uploads/milk/milk_PNG12726.png");
  db.prepare("INSERT INTO products (store_id, name, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(1, "Massa Esparguete", 750, 90, "Alimentos", "https://pngimg.com/uploads/pasta/pasta_PNG56.png");
  db.prepare("INSERT INTO products (store_id, name, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(1, "Vinho Pera Doce", 3200, 25, "Bebidas", "https://pngimg.com/uploads/wine/wine_PNG9474.png");
  db.prepare("INSERT INTO products (store_id, name, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(1, "Detergente Omo 1kg", 2200, 45, "Cosméticos", "https://pngimg.com/uploads/washing_powder/washing_powder_PNG41.png");
  db.prepare("INSERT INTO products (store_id, name, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(1, "Óleo Alimentar 1L", 1400, 70, "Alimentos", "https://pngimg.com/uploads/oil/oil_PNG62.png");
  db.prepare("INSERT INTO products (store_id, name, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(1, "N'Gola Garrafa", 350, 90, "Bebidas", "https://grupocastelangola.com/wp-content/uploads/2021/05/ngola-garrafa.png");
  db.prepare("INSERT INTO products (store_id, name, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(1, "33 Export", 350, 110, "Bebidas", "https://grupocastelangola.com/wp-content/uploads/2021/05/33export-garrafa.png");
  db.prepare("INSERT INTO products (store_id, name, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(1, "Bolachas Maria", 250, 150, "Alimentos", "https://pngimg.com/uploads/biscuits/biscuits_PNG63.png");

  // Seed Staff
  db.prepare("INSERT INTO staff (store_id, user_id, salary, shift_info) VALUES (?, ?, ?, ?)").run(1, 3, 50000, "Manhã");
}

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
      res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
    } else {
      res.status(401).json({ error: "Credenciais inválidas" });
    }
  });

  // Admin Routes
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

    const lowStock = db.prepare("SELECT count(*) as count FROM products WHERE store_id = ? AND stock < 5").get(storeId) as any;
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

  app.get("/api/owner/products/:storeId", (req, res) => {
    const storeId = req.params.storeId;
    const ownerId = req.query.ownerId;

    if (storeId === 'all' && ownerId) {
      const products = db.prepare(`
        SELECT p.*, s.name as store_name 
        FROM products p 
        JOIN stores s ON p.store_id = s.id 
        WHERE s.owner_id = ?
      `).all(ownerId);
      return res.json(products);
    }

    const products = db.prepare("SELECT * FROM products WHERE store_id = ?").all(storeId);
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
      WHERE ${whereClause} AND stock < 5
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
    const { store_id, name, price, stock, category, image_url } = req.body;
    db.prepare("INSERT INTO products (store_id, name, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(store_id, name, price, stock, category, image_url);
    res.json({ success: true });
  });

  app.post("/api/admin/stores/toggle-license", (req, res) => {
    const { store_id, status } = req.body;
    db.prepare("UPDATE stores SET license_status = ? WHERE id = ?").run(status, store_id);
    res.json({ success: true });
  });

  // Seller Routes
  app.get("/api/seller/products/:storeId", (req, res) => {
    const products = db.prepare("SELECT * FROM products WHERE store_id = ? AND stock > 0").all(req.params.storeId);
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

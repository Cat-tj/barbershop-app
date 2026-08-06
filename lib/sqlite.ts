import Database from 'better-sqlite3'
import path from 'path'
import bcrypt from 'bcryptjs'

const dbPath = path.join(process.cwd(), 'romebois.db')
const db = new Database(dbPath)

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS user_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    category TEXT NOT NULL CHECK (category IN ('product', 'consumable')),
    stock_threshold INTEGER DEFAULT 5,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    duration INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS capsters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    subtotal REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    payment_method TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    item_type TEXT NOT NULL,
    product_id INTEGER,
    service_id INTEGER,
    capster_id INTEGER,
    qty INTEGER NOT NULL DEFAULT 1,
    price REAL NOT NULL DEFAULT 0,
    subtotal REAL NOT NULL DEFAULT 0,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    tier_id INTEGER DEFAULT 1,
    total_points INTEGER DEFAULT 0,
    total_spent REAL DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('product', 'consumable')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL CHECK (unit_price >= 0),
    total_price REAL NOT NULL CHECK (total_price >= 0),
    place_of_purchase TEXT NOT NULL DEFAULT '',
    is_new_item INTEGER NOT NULL DEFAULT 0,
    created_product_id INTEGER,
    purchased_by INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    capster_id INTEGER,
    booking_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT DEFAULT 'confirmed',
    booking_type TEXT DEFAULT 'potong_di_tempat',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

// Seed default settings (QRIS Static Payload)
db.prepare(`
  INSERT OR IGNORE INTO settings (key, value) VALUES ('qris_static_payload', '00020101021226670016ID.CO.QRIS.WWW01189360091430000000000215ID10200000000000303039365204581253033605802ID5914ROMEBOIS POS6007JAKARTA610512110622207QRIS1234566304ABCD')
`).run()

// Seed default services
const countServices = (db.prepare('SELECT COUNT(*) as count FROM services').get() as { count: number }).count
if (countServices === 0) {
  const insertService = db.prepare('INSERT INTO services (name, price, duration) VALUES (?, ?, ?)')
  insertService.run('Potong Cukur Gentleman', 50000, 30)
  insertService.run('Cukur + Keramas + Head Massage', 75000, 45)
  insertService.run('Coloring / Semir Hair Trend', 120000, 60)
  insertService.run('Cukur Anak / Kids Haircut', 40000, 30)
}

// Seed default capsters
const countCapsters = (db.prepare('SELECT COUNT(*) as count FROM capsters').get() as { count: number }).count
if (countCapsters === 0) {
  const insertCapster = db.prepare('INSERT INTO capsters (name, phone, active) VALUES (?, ?, 1)')
  insertCapster.run('Budi Barbershop', '081234567890')
  insertCapster.run('Rian Hair Stylist', '081298765432')
  insertCapster.run('Doni Fade Master', '081311223344')
}

// Seed default products
const countProducts = (db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number }).count
if (countProducts === 0) {
  const insertProd = db.prepare('INSERT INTO products (name, price, stock, category, stock_threshold) VALUES (?, ?, ?, ?, ?)')
  insertProd.run('Pomade Waterbased Altora', 85000, 15, 'product', 5)
  insertProd.run('Hair Tonic Gingseng', 65000, 8, 'product', 3)
  insertProd.run('Shampoo Barbershop 1L', 110000, 4, 'consumable', 2)
}

// Seed default members
const countMembers = (db.prepare('SELECT COUNT(*) as count FROM members').get() as { count: number }).count
if (countMembers === 0) {
  const insertMem = db.prepare('INSERT INTO members (name, phone, tier_id, total_points, total_spent, visit_count) VALUES (?, ?, ?, ?, ?, ?)')
  insertMem.run('Alexander The Great', '085200000000', 1, 120, 350000, 5)
  insertMem.run('Budi Santoso', '081299887766', 2, 340, 850000, 12)
}

// Seed default users
const hash = bcrypt.hashSync('romebois123icat', 10)
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO user_accounts (username, password_hash, role, active)
  VALUES (?, ?, ?, 1)
`)

insertUser.run('anang@gmail.com', hash, 'admin')
insertUser.run('capper@gmail.com', hash, 'admin')
insertUser.run('kasir', hash, 'user')
insertUser.run('admin', hash, 'admin')

export default db

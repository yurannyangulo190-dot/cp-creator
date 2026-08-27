const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "cpcreator.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('creator','brand')),
  niche TEXT DEFAULT '',
  followers INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  budget INTEGER NOT NULL,
  goal TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  status TEXT DEFAULT 'abierta',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  status TEXT DEFAULT 'Pendiente',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(campaign_id) REFERENCES campaigns(id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  UNIQUE(campaign_id, user_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  commission INTEGER NOT NULL,
  status TEXT DEFAULT 'pendiente',
  wompi_ref TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(application_id) REFERENCES applications(id)
);
`);

module.exports = db;

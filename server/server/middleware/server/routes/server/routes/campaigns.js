const express = require("express");
const db = require("../db/db");
const { auth } = require("../middleware/auth");

const router = express.Router();

router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM campaigns ORDER BY created_at DESC").all();
  res.json({ campaigns: rows });
});

router.get("/mine", auth, (req, res) => {
  const rows = db.prepare("SELECT * FROM campaigns WHERE owner_id = ? ORDER BY created_at DESC").all(req.user.id);
  res.json({ campaigns: rows });
});

router.post("/", auth, (req, res) => {
  if (req.user.type !== "brand") return res.status(403).json({ error: "Solo las marcas pueden publicar campañas." });
  const { title, category, budget, goal } = req.body;
  if (!title || !category || !budget || !goal) return res.status(400).json({ error: "Faltan campos." });

  const brand = db.prepare("SELECT name FROM users WHERE id = ?").get(req.user.id);
  const info = db
    .prepare("INSERT INTO campaigns (owner_id, title, category, budget, goal, brand_name) VALUES (?, ?, ?, ?, ?, ?)")
    .run(req.user.id, title, category, +budget, goal, brand.name);

  res.json({ campaign: db.prepare("SELECT * FROM campaigns WHERE id = ?").get(info.lastInsertRowid) });
});

router.get("/:id", (req, res) => {
  const c = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(req.params.id);
  if (!c) return res.status(404).json({ error: "Campaña no encontrada." });
  res.json({ campaign: c });
});

module.exports = router;

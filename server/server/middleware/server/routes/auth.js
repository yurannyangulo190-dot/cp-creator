const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db/db");
const { auth, SECRET } = require("../middleware/auth");

const router = express.Router();

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, type: u.type, niche: u.niche, followers: u.followers };
}

router.post("/register", (req, res) => {
  const { name, email, password, type } = req.body;
  if (!name || !email || !password || !["creator", "brand"].includes(type)) {
    return res.status(400).json({ error: "Datos incompletos o inválidos." });
  }
  if (password.length < 6) return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });

  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (exists) return res.status(409).json({ error: "Ese correo ya está registrado." });

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare("INSERT INTO users (name, email, password, type) VALUES (?, ?, ?, ?)")
    .run(name, email.toLowerCase(), hash, type);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  const token = jwt.sign({ id: user.id, type: user.type }, SECRET, { expiresIn: "30d" });
  res.json({ token, user: publicUser(user) });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get((email || "").toLowerCase());
  if (!user || !bcrypt.compareSync(password || "", user.password)) {
    return res.status(401).json({ error: "Correo o contraseña incorrectos." });
  }
  const token = jwt.sign({ id: user.id, type: user.type }, SECRET, { expiresIn: "30d" });
  res.json({ token, user: publicUser(user) });
});

router.get("/me", auth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado." });
  res.json({ user: publicUser(user) });
});

router.put("/me", auth, (req, res) => {
  const { niche, followers, name } = req.body;
  db.prepare("UPDATE users SET niche = COALESCE(?, niche), followers = COALESCE(?, followers), name = COALESCE(?, name) WHERE id = ?")
    .run(niche, followers, name, req.user.id);
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  res.json({ user: publicUser(user) });
});

module.exports = router;

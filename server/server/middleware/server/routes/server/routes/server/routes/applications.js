const express = require("express");
const db = require("../db/db");
const { auth } = require("../middleware/auth");

const router = express.Router();

router.post("/", auth, (req, res) => {
  if (req.user.type !== "creator") return res.status(403).json({ error: "Solo los creadores pueden aplicar." });
  const { campaign_id } = req.body;
  const campaign = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(campaign_id);
  if (!campaign) return res.status(404).json({ error: "Campaña no encontrada." });

  const exists = db.prepare("SELECT id FROM applications WHERE campaign_id = ? AND user_id = ?").get(campaign_id, req.user.id);
  if (exists) return res.status(409).json({ error: "Ya aplicaste a esta campaña." });

  const info = db.prepare("INSERT INTO applications (campaign_id, user_id) VALUES (?, ?)").run(campaign_id, req.user.id);
  res.json({ application: db.prepare("SELECT * FROM applications WHERE id = ?").get(info.lastInsertRowid) });
});

router.get("/mine", auth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT a.*, c.title, c.budget, c.brand_name FROM applications a
       JOIN campaigns c ON c.id = a.campaign_id
       WHERE a.user_id = ? ORDER BY a.created_at DESC`
    )
    .all(req.user.id);
  res.json({ applications: rows });
});

router.get("/for-campaign/:campaignId", auth, (req, res) => {
  const campaign = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(req.params.campaignId);
  if (!campaign || campaign.owner_id !== req.user.id) return res.status(403).json({ error: "No autorizado." });
  const rows = db
    .prepare(
      `SELECT a.*, u.name, u.email, u.niche, u.followers FROM applications a
       JOIN users u ON u.id = a.user_id
       WHERE a.campaign_id = ? ORDER BY a.created_at DESC`
    )
    .all(req.params.campaignId);
  res.json({ applications: rows });
});

router.put("/:id/status", auth, (req, res) => {
  const { status } = req.body;
  if (!["Pendiente", "Aceptada", "Rechazada", "Completada"].includes(status)) {
    return res.status(400).json({ error: "Estado inválido." });
  }
  const app = db
    .prepare(`SELECT a.*, c.owner_id, c.budget FROM applications a JOIN campaigns c ON c.id = a.campaign_id WHERE a.id = ?`)
    .get(req.params.id);
  if (!app || app.owner_id !== req.user.id) return res.status(403).json({ error: "No autorizado." });

  db.prepare("UPDATE applications SET status = ? WHERE id = ?").run(status, req.params.id);

  if (status === "Completada") {
    const commission = Math.round(app.budget * 0.12);
    const exists = db.prepare("SELECT id FROM payments WHERE application_id = ?").get(app.id);
    if (!exists) {
      db.prepare("INSERT INTO payments (application_id, amount, commission) VALUES (?, ?, ?)").run(
        app.id,
        app.budget,
        commission
      );
    }
  }

  res.json({ ok: true });
});

module.exports = router;

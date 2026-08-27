const express = require("express");
const crypto = require("crypto");
const db = require("../db/db");
const { auth } = require("../middleware/auth");

const router = express.Router();

const WOMPI_PUBLIC_KEY = process.env.WOMPI_PUBLIC_KEY || "";
const WOMPI_INTEGRITY_SECRET = process.env.WOMPI_INTEGRITY_SECRET || "";

router.post("/:paymentId/checkout", auth, (req, res) => {
  const payment = db
    .prepare(
      `SELECT p.*, a.user_id FROM payments p JOIN applications a ON a.id = p.application_id WHERE p.id = ?`
    )
    .get(req.params.paymentId);
  if (!payment) return res.status(404).json({ error: "Pago no encontrado." });
  if (!WOMPI_PUBLIC_KEY || !WOMPI_INTEGRITY_SECRET) {
    return res.status(500).json({
      error: "Falta configurar WOMPI_PUBLIC_KEY y WOMPI_INTEGRITY_SECRET en el archivo .env (llaves de tu cuenta Wompi).",
    });
  }

  const reference = `cp-${payment.id}-${Date.now()}`;
  const amountInCents = payment.amount * 100;
  const currency = "COP";

  const signatureBase = `${reference}${amountInCents}${currency}${WOMPI_INTEGRITY_SECRET}`;
  const signature = crypto.createHash("sha256").update(signatureBase).digest("hex");

  db.prepare("UPDATE payments SET wompi_ref = ? WHERE id = ?").run(reference, payment.id);

  res.json({
    publicKey: WOMPI_PUBLIC_KEY,
    reference,
    amountInCents,
    currency,
    signature,
  });
});

router.post("/webhook", express.json(), (req, res) => {
  const event = req.body;
  const txn = event?.data?.transaction;
  if (!txn) return res.sendStatus(200);

  const payment = db.prepare("SELECT * FROM payments WHERE wompi_ref = ?").get(txn.reference);
  if (payment) {
    const status = txn.status === "APPROVED" ? "pagado" : txn.status === "DECLINED" ? "rechazado" : "pendiente";
    db.prepare("UPDATE payments SET status = ? WHERE id = ?").run(status, payment.id);
  }
  res.sendStatus(200);
});

router.get("/mine", auth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT pay.*, c.title FROM payments pay
       JOIN applications a ON a.id = pay.application_id
       JOIN campaigns c ON c.id = a.campaign_id
       WHERE a.user_id = ? ORDER BY pay.created_at DESC`
    )
    .all(req.user.id);
  res.json({ payments: rows });
});

module.exports = router;

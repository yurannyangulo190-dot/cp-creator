const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "cambia-esta-clave-en-produccion";

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No autenticado." });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado." });
  }
}

module.exports = { auth, SECRET };

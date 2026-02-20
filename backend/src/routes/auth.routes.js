const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { z } = require("zod");

const prisma = require("../prisma");

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
});

router.post("/register", async (req, res) => {
  const body = registerSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json(body.error);

  const { email, password, fullName } = body.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ message: "Email already used" });

  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, password: hash, fullName, role: "PATIENT" },
  });

  res.json({ id: user.id, email: user.email });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: "JWT_SECRET manquant dans .env" });
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role, fullName: user.fullName, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token, role: user.role, fullName: user.fullName, email: user.email });
});

module.exports = router;

const express = require("express");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { sendConfirmEmail } = require("../services/mailer");

const prisma = new PrismaClient();
const router = express.Router();

router.post("/", requireAuth, requireRole("PATIENT"), async (req, res) => {
  const { doctorId, dateTime } = req.body;

  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) return res.status(404).json({ message: "Doctor not found" });

  const token = crypto.randomBytes(24).toString("hex");

  const appt = await prisma.appointment.create({
    data: {
      patientId: req.user.sub,
      doctorId,
      dateTime: new Date(dateTime),
      confirmToken: token
    },
    include: { patient: true, doctor: true }
  });

  const confirmUrl = `${process.env.FRONTEND_URL}/confirm?token=${token}`;

  await sendConfirmEmail({
    to: appt.patient.email,
    fullName: appt.patient.fullName,
    confirmUrl,
    doctorName: appt.doctor.fullName,
    dateTime: new Date(appt.dateTime).toLocaleString()
  });

  res.json({ ok: true, status: appt.status });
});

router.get("/confirm", async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).send("Missing token");

  const appt = await prisma.appointment.findUnique({ where: { confirmToken: String(token) } });
  if (!appt) return res.status(404).send("Token invalid");

  await prisma.appointment.update({
    where: { id: appt.id },
    data: { status: "CONFIRMED" }
  });

  // redirect UX propre (page Angular)
  return res.redirect(`${process.env.FRONTEND_URL}/confirmed?token=${token}`);
});

router.get("/my", requireAuth, requireRole("PATIENT"), async (req, res) => {
  const appts = await prisma.appointment.findMany({
    where: { patientId: req.user.sub },
    include: { doctor: true },
    orderBy: { createdAt: "desc" }
  });

  res.json(appts);
});

router.get("/hospital", requireAuth, requireRole("HOSPITAL"), async (req, res) => {
  const doctors = await prisma.doctor.findMany({ where: { hospitalUserId: req.user.sub } });
  const ids = doctors.map(d => d.id);

  const appts = await prisma.appointment.findMany({
    where: { doctorId: { in: ids } },
    include: { patient: true, doctor: true },
    orderBy: { createdAt: "desc" }
  });

  res.json(appts);
});

module.exports = router;

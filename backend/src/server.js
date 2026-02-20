require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const Stripe = require("stripe");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

const PORT = Number(process.env.PORT || 4000);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:4201";
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// ✅ Stripe (ne plante pas si clé absente, mais renverra erreur côté route)
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// ---------- HELPERS ----------
function mapDoctor(d) {
  return {
    ...d,
    about: d.aboutJson ? JSON.parse(d.aboutJson) : [],
    availability: d.availabilityJson ? JSON.parse(d.availabilityJson) : [],
  };
}

function authRequired(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { sub, role, email, fullName }
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

const requireHospital = requireRole("HOSPITAL");
const requirePatient = requireRole("PATIENT");

async function sendMailSafe({ to, subject, html }) {
  if (String(process.env.MAIL_DISABLED).toLowerCase() === "true") {
    console.log("📧 MAIL_DISABLED=true → email skipped");
    return { skipped: true };
  }

  const host = process.env.MAIL_HOST;
  const port = Number(process.env.MAIL_PORT || 587);
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;

  if (!host || !user || !pass) {
    console.log("📧 Missing mail env → email skipped");
    return { skipped: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from: `"AlloDocteur" <${user}>`,
      to,
      subject,
      html,
    });

    return { ok: true, messageId: info.messageId };
  } catch (e) {
    console.log("📧 Email failed (but continue):", e.message);
    return { ok: false, error: e.message };
  }
}

// ✅ Monnaies "zero-decimal" (Stripe)
const ZERO_DECIMAL = new Set([
  "bif","clp","djf","gnf","jpy","kmf","krw","mga","pyg","rwf",
  "ugx","vnd","vuv","xaf","xof","xpf"
]);

function stripeUnitAmount(amount, currency) {
  const c = (currency || "xof").toLowerCase();
  return ZERO_DECIMAL.has(c) ? Number(amount) : Math.round(Number(amount) * 100);
}

// ---------- STRIPE WEBHOOK (AVANT express.json) ----------
app.post("/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    if (!stripe) return res.status(500).send("Stripe not configured");
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) return res.status(500).send("Missing STRIPE_WEBHOOK_SECRET");

    const signature = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret);
    } catch (err) {
      console.log("❌ Stripe webhook signature error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const appointmentId = session?.metadata?.appointmentId;

      if (!appointmentId) return res.json({ received: true });

      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { doctor: true, patient: true },
      });

      if (!appt) return res.json({ received: true });

      // idempotent
      if (appt.paymentStatus !== "PAID") {
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: {
            paymentStatus: "PAID",
            status: "CONFIRMED",
            paidAt: new Date(),
            stripeSessionId: session.id || appt.stripeSessionId || null,
            stripePaymentIntentId: session.payment_intent ? String(session.payment_intent) : null,
          },
        });

        // ✅ Email réel de confirmation
        if (appt.patient?.email) {
          await sendMailSafe({
            to: appt.patient.email,
            subject: "✅ Rendez-vous confirmé - AlloDocteur",
            html: `
              <h3>Rendez-vous confirmé ✅</h3>
              <p><b>Médecin</b> : ${appt.doctor?.fullName || "-"}</p>
              <p><b>Spécialité</b> : ${appt.doctor?.specialty || "-"}</p>
              <p><b>Date</b> : ${new Date(appt.dateTime).toLocaleString("fr-FR")}</p>
              <p><b>Montant</b> : ${appt.amountCfa || appt.doctor?.priceCfa || 0} CFA</p>
              <p>Merci d’avoir utilisé AlloDocteur.</p>
            `,
          });
        }
      }
    }

    return res.json({ received: true });
  } catch (e) {
    console.log("❌ Webhook processing error:", e);
    return res.status(500).json({ error: "webhook_failed" });
  }
});

// ---------- MIDDLEWARES ----------
const allowedOrigins = [
  "http://localhost:4200",
  "http://localhost:4201",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // curl / postman
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error("CORS blocked: " + origin));
  },
  credentials: true,
}));

app.use(express.json());

// ---------- BASIC ----------
app.get("/", (req, res) => res.json({ ok: true, service: "allo-docteur-backend" }));
app.get("/health", (req, res) => res.json({ ok: true }));

// ---------- AUTH ----------
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "Missing credentials" });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { sub: user.id, role: user.role, email: user.email, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, role: user.role, fullName: user.fullName, email: user.email });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- DOCTORS (PUBLIC + SEARCH) ----------
// /doctors?specialty=Généraliste&city=Dakar
app.get("/doctors", async (req, res) => {
  try {
    const { specialty, city } = req.query || {};
    const where = {};
    if (specialty) where.specialty = String(specialty);
    if (city) where.city = String(city);

    const doctors = await prisma.doctor.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json(doctors.map(mapDoctor));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/doctors/:id", async (req, res) => {
  try {
    const doc = await prisma.doctor.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(mapDoctor(doc));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- HOSPITAL DASHBOARD (CRUD DOCTORS) ----------
app.get(["/doctors/hospital", "/hospital/doctors"], authRequired, requireHospital, async (req, res) => {
  const doctors = await prisma.doctor.findMany({
    where: { hospitalUserId: req.user.sub },
    orderBy: { createdAt: "desc" },
  });
  res.json(doctors.map(mapDoctor));
});

app.post(["/doctors", "/hospital/doctors"], authRequired, requireHospital, async (req, res) => {
  const { fullName, specialty, clinic, city, priceCfa, about, availability } = req.body || {};

  if (!fullName || !specialty || !clinic || !city) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const created = await prisma.doctor.create({
    data: {
      fullName,
      specialty,
      clinic,
      city,
      priceCfa: Number(priceCfa || 0),
      aboutJson: JSON.stringify(about || []),
      availabilityJson: JSON.stringify(availability || []),
      hospitalUserId: req.user.sub,
    },
  });

  res.status(201).json(mapDoctor(created));
});

app.put(["/doctors/:id", "/hospital/doctors/:id"], authRequired, requireHospital, async (req, res) => {
  const id = req.params.id;
  const { fullName, specialty, clinic, city, priceCfa, about, availability } = req.body || {};

  const doc = await prisma.doctor.findFirst({
    where: { id, hospitalUserId: req.user.sub },
  });
  if (!doc) return res.status(404).json({ message: "Doctor not found" });

  const updated = await prisma.doctor.update({
    where: { id },
    data: {
      fullName,
      specialty,
      clinic,
      city,
      priceCfa: Number(priceCfa || 0),
      aboutJson: JSON.stringify(about || []),
      availabilityJson: JSON.stringify(availability || []),
    },
  });

  res.json(mapDoctor(updated));
});

app.delete(["/doctors/:id", "/hospital/doctors/:id"], authRequired, requireHospital, async (req, res) => {
  const id = req.params.id;

  const doc = await prisma.doctor.findFirst({
    where: { id, hospitalUserId: req.user.sub },
  });
  if (!doc) return res.status(404).json({ message: "Doctor not found" });

  await prisma.doctor.delete({ where: { id } });
  res.json({ ok: true });
});

app.get("/hospital/stats", authRequired, requireHospital, async (req, res) => {
  const doctorsCount = await prisma.doctor.count({ where: { hospitalUserId: req.user.sub } });
  const appointmentsCount = await prisma.appointment.count({
    where: { doctor: { hospitalUserId: req.user.sub } },
  });
  const pendingCount = await prisma.appointment.count({
    where: { doctor: { hospitalUserId: req.user.sub }, status: "PENDING" },
  });
  res.json({ doctorsCount, appointmentsCount, pendingCount });
});

app.get("/appointments/hospital", authRequired, requireHospital, async (req, res) => {
  const data = await prisma.appointment.findMany({
    where: { doctor: { hospitalUserId: req.user.sub } },
    include: { patient: true, doctor: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(data);
});

// ---------- STRIPE CHECKOUT (PATIENT) ----------
app.post("/payments/checkout-session", authRequired, requirePatient, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe non configuré (STRIPE_SECRET_KEY manquante)" });
    }

    const { doctorId, dateTime } = req.body || {};
    if (!doctorId || !dateTime) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const amountCfa = Number(doctor.priceCfa || 0);
    const currency = (process.env.STRIPE_CURRENCY || "xof").toLowerCase();

    const confirmToken = crypto.randomBytes(24).toString("hex");
    const paymentRef = `PAY-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    // 1) Créer RDV PENDING
    const appt = await prisma.appointment.create({
      data: {
        patientId: req.user.sub,
        doctorId,
        dateTime: new Date(dateTime),
        status: "PENDING",
        confirmToken,

        paymentMethod: "CARD",
        paymentStatus: "PENDING",
        paymentRef,
        amountCfa,
        currency,
      },
    });

    // 2) Créer checkout Stripe
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: req.user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: stripeUnitAmount(amountCfa, currency),
            product_data: {
              name: `Consultation - ${doctor.fullName}`,
              description: `${doctor.specialty} · ${doctor.clinic} · ${doctor.city}`,
            },
          },
        },
      ],
      metadata: {
        appointmentId: appt.id,
        paymentRef,
      },
      success_url: `${FRONTEND_URL}/confirmed?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/confirm?canceled=1`,
    });

    await prisma.appointment.update({
      where: { id: appt.id },
      data: { stripeSessionId: session.id },
    });

    return res.json({ ok: true, url: session.url });
  } catch (e) {
    console.error("Stripe checkout error:", e);
    return res.status(500).json({ message: "Erreur de paiement Stripe" });
  }
});

// ---------- PATIENT APPOINTMENTS ----------
app.get("/appointments/me", authRequired, requirePatient, async (req, res) => {
  const data = await prisma.appointment.findMany({
    where: { patientId: req.user.sub },
    include: { doctor: true },
    orderBy: { dateTime: "desc" },
  });
  res.json(data);
});

app.patch("/appointments/:id/cancel", authRequired, requirePatient, async (req, res) => {
  const { id } = req.params;

  const appt = await prisma.appointment.findFirst({
    where: { id, patientId: req.user.sub },
  });
  if (!appt) return res.status(404).json({ message: "Not found" });

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  res.json({ ok: true, appointment: updated });
});

// ---------- SUCCESS PAGE LOOKUP ----------
app.get("/payments/session/:sessionId", authRequired, requirePatient, async (req, res) => {
  const { sessionId } = req.params;

  const appt = await prisma.appointment.findFirst({
    where: {
      stripeSessionId: sessionId,
      patientId: req.user.sub,
    },
    include: { doctor: true },
  });

  if (!appt) return res.status(404).json({ message: "Not found" });

  res.json({
    id: appt.id,
    appointmentStatus: appt.status,
    paymentStatus: appt.paymentStatus,
    paymentMethod: appt.paymentMethod,
    paymentRef: appt.paymentRef,
    amountCfa: appt.amountCfa,
    dateTime: appt.dateTime,
    doctor: appt.doctor,
  });
});

// ---------- START ----------
app.listen(PORT, () => {
  console.log(`✅ API running on http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { requireAuth, requireRole } = require("../middlewares/auth");

const prisma = new PrismaClient();
const router = express.Router();

router.get("/", async (req, res) => {
  const doctors = await prisma.doctor.findMany({ orderBy: { createdAt: "desc" } });
  res.json(doctors.map(d => ({
    ...d,
    about: JSON.parse(d.aboutJson),
    availability: JSON.parse(d.availabilityJson),
  })));
});

router.get("/:id", async (req, res) => {
  const d = await prisma.doctor.findUnique({ where: { id: req.params.id } });
  if (!d) return res.status(404).json({ message: "Not found" });
  res.json({
    ...d,
    about: JSON.parse(d.aboutJson),
    availability: JSON.parse(d.availabilityJson),
  });
});

router.post("/", requireAuth, requireRole("HOSPITAL"), async (req, res) => {
  const {
    fullName, specialty, clinic, city, priceCfa,
    about, availability
  } = req.body;

  const doctor = await prisma.doctor.create({
    data: {
      fullName,
      specialty,
      clinic,
      city,
      priceCfa: Number(priceCfa),
      aboutJson: JSON.stringify(about || []),
      availabilityJson: JSON.stringify(availability || []),
      hospitalUserId: req.user.sub
    }
  });

  res.json(doctor);
});

module.exports = router;

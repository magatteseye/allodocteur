const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function upsertUser({ email, password, fullName, role }) {
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    console.log("ℹ️ Existe déjà:", email);
    return exists;
  }
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hash, fullName, role },
  });
  console.log("✅ Créé:", role, email);
  return user;
}

async function main() {
  // ✅ HÔPITAL DEMO
  const hospitalUser = await upsertUser({
    email: "hospital@demo.com",
    password: "Hospital123!",
    fullName: "Admin Hôpital Démo",
    role: "HOSPITAL",
  });

  // ✅ PATIENT DEMO
  const patientUser = await upsertUser({
    email: "patient@demo.com",
    password: "Patient123!",
    fullName: "Patient Démo",
    role: "PATIENT",
  });

  // ✅ (optionnel) créer 1 médecin demo pour l’hôpital si aucun
  const doctorCount = await prisma.doctor.count();
  if (doctorCount === 0) {
    await prisma.doctor.create({
      data: {
        fullName: "Dr Awa Diop",
        specialty: "Généraliste",
        clinic: "Clinique Saint Michel",
        city: "Dakar",
        priceCfa: 10000,
        aboutJson: JSON.stringify(["Consultation générale", "Suivi patients"]),
        availabilityJson: JSON.stringify([
          { dayLabel: "Lundi", dayNumber: 25, times: ["10:00", "10:30", "11:00"] },
          { dayLabel: "Mardi", dayNumber: 26, times: ["10:00", "11:00"] },
        ]),
        hospitalUserId: hospitalUser.id,
      },
    });
    console.log("✅ Médecin démo créé");
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


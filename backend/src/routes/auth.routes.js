const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = require('../prisma');
const auth = require('../middlewares/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d',
    }
  );
}

function sanitizeUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    phone: user.phone ?? null,
    address: user.address ?? null,
    birthYear: user.birthYear ?? null,
    sex: user.sex ?? null,
    language: user.language ?? 'FR',
    smsReminders: user.smsReminders ?? true,
    emailReminders: user.emailReminders ?? false,
    emergencyName: user.emergencyName ?? null,
    emergencyPhone: user.emergencyPhone ?? null,
    hospital: user.hospital ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// POST /api/auth/register-patient
router.post('/register-patient', async (req, res) => {
  try {
    const { fullName, email, password, phone } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        message: 'fullName, email et password sont obligatoires.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Le mot de passe doit contenir au moins 8 caractères.',
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'Cet email est déjà utilisé.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        phone: phone?.trim() || null,
        role: 'PATIENT',
      },
      include: {
        hospital: true,
      },
    });

    const token = signToken(user);

    return res.status(201).json({
      message: 'Compte patient créé avec succès.',
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('register-patient error:', error);
    return res.status(500).json({
      message: 'Erreur serveur.',
    });
  }
});

// POST /api/auth/register-hospital
router.post('/register-hospital', async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      hospitalName,
      city,
      address,
      phone,
      description,
    } = req.body;

    if (!fullName || !email || !password || !hospitalName || !city) {
      return res.status(400).json({
        message: 'fullName, email, password, hospitalName et city sont obligatoires.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Le mot de passe doit contenir au moins 8 caractères.',
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'Cet email est déjà utilisé.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        phone: phone?.trim() || null,
        role: 'HOSPITAL',
        hospital: {
          create: {
            name: hospitalName.trim(),
            city: city.trim(),
            address: address?.trim() || null,
            phone: phone?.trim() || null,
            description: description?.trim() || null,
          },
        },
      },
      include: {
        hospital: true,
      },
    });

    const token = signToken(user);

    return res.status(201).json({
      message: 'Compte hôpital créé avec succès.',
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('register-hospital error:', error);
    return res.status(500).json({
      message: 'Erreur serveur.',
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email et mot de passe obligatoires.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        hospital: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: 'Identifiants invalides.',
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({
        message: 'Identifiants invalides.',
      });
    }

    const token = signToken(user);

    return res.json({
      message: 'Connexion réussie.',
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('login error:', error);
    return res.status(500).json({
      message: 'Erreur serveur.',
    });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        hospital: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: 'Utilisateur introuvable.',
      });
    }

    return res.json({
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('me error:', error);
    return res.status(500).json({
      message: 'Erreur serveur.',
    });
  }
});

module.exports = router;
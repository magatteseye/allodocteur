const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Token manquant ou invalide.',
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: 'Utilisateur introuvable.',
      });
    }

    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    return res.status(401).json({
      message: 'Authentification invalide.',
    });
  }
}

module.exports = auth;
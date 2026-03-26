require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    message: 'API is running',
  });
});

app.use('/api/auth', authRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: 'Route introuvable.',
  });
});

app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);

  res.status(500).json({
    message: 'Erreur interne du serveur.',
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
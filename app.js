// app.js — définit l'application, ne démarre rien
const express = require('express');
const etudiantRoutes = require('./routes/etudiantRoutes');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'API Gestion Étudiants v1.0' });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: require('./package.json').version
  });
});

app.use('/api/etudiants', etudiantRoutes);

module.exports = app;
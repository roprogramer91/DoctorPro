const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, name, specialty, mp, mn } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO doctors (email, password, name, specialty, mp, mn)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, name, specialty, mp, mn, trial_ends`,
      [email, hash, name, specialty, mp, mn]
    );
    const doctor = rows[0];
    const token = jwt.sign({ id: doctor.id, email: doctor.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, doctor });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El email ya está registrado' });
    res.status(500).json({ error: 'Error al registrar' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  try {
    const { rows } = await db.query('SELECT * FROM doctors WHERE email = $1', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const doctor = rows[0];
    const valid = await bcrypt.compare(password, doctor.password);
    if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });

    if (!doctor.active) return res.status(403).json({ error: 'Cuenta suspendida. Contacte al administrador.' });

    const token = jwt.sign({ id: doctor.id, email: doctor.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safe } = doctor;
    res.json({ token, doctor: safe });
  } catch {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

module.exports = router;

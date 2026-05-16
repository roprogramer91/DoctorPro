const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { sendResetEmail } = require('../utils/mailer');

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

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requerido' });

  try {
    const { rows } = await db.query('SELECT id FROM doctors WHERE email = $1', [email]);
    // Respuesta genérica para no revelar si el email existe
    if (!rows.length) return res.json({ message: 'Si el email existe, recibirás un enlace de recupero.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hora

    await db.query(
      'UPDATE doctors SET reset_token = $1, reset_token_expires = $2 WHERE email = $3',
      [token, expires, email]
    );

    await sendResetEmail(email, token, process.env.FRONTEND_URL.split(',')[0].trim());
    res.json({ message: 'Si el email existe, recibirás un enlace de recupero.' });
  } catch (err) {
    console.error('forgot-password error:', err);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token y contraseña requeridos' });

  try {
    const { rows } = await db.query(
      'SELECT id FROM doctors WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );
    if (!rows.length) return res.status(400).json({ error: 'Token inválido o vencido' });

    const hash = await bcrypt.hash(password, 10);
    await db.query(
      'UPDATE doctors SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [hash, rows[0].id]
    );

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('reset-password error:', err);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
});

module.exports = router;

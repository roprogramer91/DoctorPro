const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { sendResetEmail, sendWelcomeEmail } = require('../utils/mailer');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, name, specialty, mp, mn } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const trialEnds = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días de prueba
    const doctor = await prisma.doctor.create({
      data: { email, password: hash, name, specialty, mp, mn, trial_ends: trialEnds },
      select: { id: true, email: true, name: true, specialty: true, mp: true, mn: true, trial_ends: true }
    });
    const token = jwt.sign({ id: doctor.id, email: doctor.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    sendWelcomeEmail(doctor.email, doctor.name).catch(err => console.error('welcome email error:', err));
    res.status(201).json({ token, doctor });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'El email ya está registrado' });
    res.status(500).json({ error: 'Error al registrar' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  try {
    const doctor = await prisma.doctor.findUnique({ where: { email } });
    if (!doctor) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const valid = await bcrypt.compare(password, doctor.password);
    if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });

    if (!doctor.active) return res.status(403).json({ error: 'Cuenta suspendida. Contacte al administrador.' });

    const token = jwt.sign({ id: doctor.id, email: doctor.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safe } = doctor;
    res.json({ token, doctor: safe });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requerido' });

  const generic = { message: 'Si el email existe, recibirás un enlace de recupero.' };
  try {
    const doctor = await prisma.doctor.findUnique({ where: { email }, select: { id: true } });
    if (!doctor) return res.json(generic);

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hora

    await prisma.doctor.update({
      where: { email },
      data: { reset_token: token, reset_token_expires: expires }
    });

    await sendResetEmail(email, token, process.env.FRONTEND_URL.split(',')[0].trim());
    res.json(generic);
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
    const doctor = await prisma.doctor.findFirst({
      where: { reset_token: token, reset_token_expires: { gt: new Date() } },
      select: { id: true }
    });
    if (!doctor) return res.status(400).json({ error: 'Token inválido o vencido' });

    const hash = await bcrypt.hash(password, 10);
    await prisma.doctor.update({
      where: { id: doctor.id },
      data: { password: hash, reset_token: null, reset_token_expires: null }
    });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('reset-password error:', err);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
});

module.exports = router;

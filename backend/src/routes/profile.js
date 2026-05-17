const router = require('express').Router();
const auth = require('../middleware/auth');
const prisma = require('../lib/prisma');

const PROFILE_SELECT = {
  id: true, email: true, name: true, specialty: true,
  mp: true, mn: true, signature_url: true, active: true,
  trial_ends: true, subscription_status: true, subscribed_until: true
};

// GET /api/profile
router.get('/', auth, async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: req.doctor.id },
      select: PROFILE_SELECT
    });
    if (!doctor) return res.status(404).json({ error: 'Médico no encontrado' });
    res.json(doctor);
  } catch {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// PUT /api/profile
router.put('/', auth, async (req, res) => {
  const { name, specialty, mp, mn, signature_url } = req.body;
  try {
    const doctor = await prisma.doctor.update({
      where: { id: req.doctor.id },
      data: { name, specialty, mp, mn, signature_url },
      select: { id: true, email: true, name: true, specialty: true, mp: true, mn: true, signature_url: true }
    });
    res.json(doctor);
  } catch {
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

module.exports = router;

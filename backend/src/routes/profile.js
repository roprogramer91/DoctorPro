const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

// GET /api/profile  — devuelve el perfil del médico logueado
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, email, name, specialty, mp, mn, signature_url, active,
              trial_ends, subscription_status, subscribed_until
       FROM doctors WHERE id = $1`,
      [req.doctor.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Médico no encontrado' });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// PUT /api/profile  — actualiza datos del médico
router.put('/', auth, async (req, res) => {
  const { name, specialty, mp, mn, signature_url } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE doctors SET name=$1, specialty=$2, mp=$3, mn=$4, signature_url=$5
       WHERE id=$6 RETURNING id, email, name, specialty, mp, mn, signature_url`,
      [name, specialty, mp, mn, signature_url, req.doctor.id]
    );
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

module.exports = router;

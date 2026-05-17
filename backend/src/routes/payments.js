const router = require('express').Router();
const { MercadoPagoConfig, PreApproval } = require('mercadopago');
const db = require('../db');

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
const preApproval = new PreApproval(mp);

const PRICE    = Number(process.env.SUBSCRIPTION_PRICE) || 5000;
const FRONTEND = (process.env.FRONTEND_URL || '').split(',')[0].trim();

// POST /api/payments/subscribe
// Crea una suscripción MP y devuelve el link de pago
router.post('/subscribe', async (req, res) => {
  const { id: doctorId, email } = req.doctor;
  try {
    const result = await preApproval.create({
      body: {
        reason: 'DoctorPro — Suscripción mensual',
        external_reference: String(doctorId),
        payer_email: email,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: PRICE,
          currency_id: 'ARS'
        },
        back_url: `${FRONTEND}/form.html`,
        status: 'pending'
      }
    });
    res.json({ init_point: result.init_point });
  } catch (err) {
    console.error('subscribe error:', err);
    res.status(500).json({ error: 'Error al crear la suscripción' });
  }
});

// POST /api/payments/webhook  (sin auth JWT — lo llama MP)
router.post('/webhook', async (req, res) => {
  const { type, data } = req.body;
  if (type !== 'subscription_preapproval') return res.sendStatus(200);

  try {
    const sub = await preApproval.get({ id: data.id });
    const doctorId = sub.external_reference;
    const status   = sub.status; // authorized | paused | cancelled

    if (status === 'authorized') {
      // Extender acceso 32 días desde ahora (margen por demoras)
      await db.query(
        `UPDATE doctors
         SET subscription_id = $1, subscription_status = 'active', active = true,
             subscribed_until = NOW() + INTERVAL '32 days'
         WHERE id = $2`,
        [sub.id, doctorId]
      );
    } else if (status === 'cancelled' || status === 'paused') {
      await db.query(
        `UPDATE doctors SET subscription_status = $1, active = false WHERE id = $2`,
        [status, doctorId]
      );
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('webhook error:', err);
    res.sendStatus(500);
  }
});

module.exports = router;

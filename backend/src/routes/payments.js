const router = require('express').Router();
const { MercadoPagoConfig, PreApproval } = require('mercadopago');
const prisma = require('../lib/prisma');

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
const preApproval = new PreApproval(mp);

const PRICE    = Number(process.env.SUBSCRIPTION_PRICE) || 5000;
const BACK_URL = process.env.MP_BACK_URL || 'https://doctorpremium.online/form.html';

// POST /api/payments/subscribe
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
        back_url: BACK_URL,
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
    const doctorId = Number(sub.external_reference);
    const status   = sub.status; // authorized | paused | cancelled

    if (status === 'authorized') {
      await prisma.doctor.update({
        where: { id: doctorId },
        data: {
          subscription_id: sub.id,
          subscription_status: 'active',
          active: true,
          subscribed_until: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000) // 32 días
        }
      });
    } else if (status === 'cancelled' || status === 'paused') {
      await prisma.doctor.update({
        where: { id: doctorId },
        data: { subscription_status: status, active: false }
      });
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('webhook error:', err);
    res.sendStatus(500);
  }
});

module.exports = router;

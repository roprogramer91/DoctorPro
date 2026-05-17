const router = require('express').Router();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// POST /api/reports/send
router.post('/send', async (req, res) => {
  const { patient_email, pdf_base64, patient_name } = req.body;
  if (!patient_email || !pdf_base64) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  const name = patient_name || 'paciente';
  const doctorName = req.doctor?.name || '';

  try {
    await resend.emails.send({
      from: 'DoctorPro <noreply@doctorpremium.online>',
      to: patient_email,
      subject: `Informe médico — ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
          <h2 style="color:#cc0000;">DoctorPro</h2>
          <p>Estimado/a <strong>${name}</strong>,</p>
          <p>Adjunto encontrará su informe de evaluación de riesgo clínico quirúrgico${doctorName ? `, emitido por el/la Dr/a. ${doctorName}` : ''}.</p>
          <p>Ante cualquier consulta, comuníquese con su médico.</p>
          <p style="font-size:12px;color:#888;margin-top:24px;">Este mensaje fue enviado desde DoctorPro.</p>
        </div>
      `,
      attachments: [{
        filename: `informe_${name.replace(/\s+/g, '_')}.pdf`,
        content: pdf_base64
      }]
    });
    res.json({ message: 'Email enviado correctamente' });
  } catch (err) {
    console.error('send report error:', err);
    res.status(500).json({ error: 'Error al enviar el email' });
  }
});

module.exports = router;

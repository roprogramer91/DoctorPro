const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendResetEmail(toEmail, resetToken, frontendUrl) {
  const resetLink = `${frontendUrl}/reset-password.html?token=${resetToken}`;
  await resend.emails.send({
    from: 'DoctorPro <noreply@doctorpremium.online>',
    to: toEmail,
    subject: 'Recupero de contraseña — DoctorPro',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #cc0000;">DoctorPro</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>Hacé clic en el siguiente botón para crear una nueva contraseña. El enlace vence en <strong>1 hora</strong>.</p>
        <p style="text-align:center; margin: 32px 0;">
          <a href="${resetLink}"
             style="background:#cc0000;color:#fff;padding:12px 28px;text-decoration:none;border-radius:4px;font-size:15px;">
            Restablecer contraseña
          </a>
        </p>
        <p style="font-size:12px;color:#888;">Si no solicitaste esto, ignorá este email.</p>
      </div>
    `
  });
}

async function sendWelcomeEmail(toEmail, doctorName) {
  const name = doctorName || 'Doctor/a';
  await resend.emails.send({
    from: 'DoctorPro <noreply@doctorpremium.online>',
    to: toEmail,
    subject: '¡Bienvenido/a a DoctorPro!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #cc0000;">DoctorPro</h2>
        <p>Hola, <strong>${name}</strong>.</p>
        <p>Tu cuenta fue creada exitosamente. Tenés <strong>7 días de prueba gratis</strong> para explorar todas las funciones de DoctorPro.</p>
        <p style="text-align:center; margin: 32px 0;">
          <a href="https://doctorpremium.online"
             style="background:#cc0000;color:#fff;padding:12px 28px;text-decoration:none;border-radius:4px;font-size:15px;">
            Ir a DoctorPro
          </a>
        </p>
        <p style="font-size:12px;color:#888;">Si tenés alguna consulta, respondé este email.</p>
      </div>
    `
  });
}

module.exports = { sendResetEmail, sendWelcomeEmail };

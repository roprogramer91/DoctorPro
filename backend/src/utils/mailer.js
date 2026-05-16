const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  family: 4,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendResetEmail(toEmail, resetToken, frontendUrl) {
  const resetLink = `${frontendUrl}/reset-password.html?token=${resetToken}`;
  await transporter.sendMail({
    from: `"DoctorPro" <${process.env.SMTP_USER}>`,
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

module.exports = { sendResetEmail };

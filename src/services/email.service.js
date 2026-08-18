import nodemailer from 'nodemailer';

/**
 * Transportador de correo real vía SMTP (configurado para Gmail por defecto).
 *
 * Variables de entorno requeridas (ver .env.example):
 * - EMAIL_HOST      (ej: smtp.gmail.com)
 * - EMAIL_PORT      (ej: 587)
 * - EMAIL_USER      (la cuenta de correo que envía)
 * - EMAIL_PASS      (contraseña de aplicación de Gmail, NO la contraseña normal)
 * - EMAIL_FROM      (nombre visible del remitente, ej: "Admisión 2026 <no-reply@admision.edu>")
 * - CLIENT_URL      (URL del frontend, para armar el enlace de verificación)
 *
 * Nota Gmail: hay que generar una "Contraseña de aplicación" en la cuenta de
 * Google (con verificación en 2 pasos activada) e ir a
 * https://myaccount.google.com/apppasswords — la contraseña normal de Gmail
 * NO funciona aquí.
 */
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false, // true para el puerto 465, false para 587 (STARTTLS)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Envía el correo de verificación con el enlace que contiene el token.
 * El enlace apunta al frontend (CLIENT_URL), que luego llama al endpoint
 * GET /api/auth/verificar/:token del backend.
 */
export const enviarCorreoVerificacion = async ({ destinatario, nombre, token }) => {
  const enlaceVerificacion = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verificar-correo/${token}`;

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: destinatario,
    subject: 'Verifica tu correo electrónico — Sistema de Admisión 2026',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>¡Hola, ${nombre}!</h2>
        <p>Gracias por registrarte en el Sistema de Admisión 2026. Tu cuenta fue creada como
        <strong>usuario temporal</strong> y necesita verificación para poder iniciar sesión.</p>
        <p>Haz clic en el siguiente botón para confirmar tu correo electrónico:</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${enlaceVerificacion}"
             style="background:#4f46e5; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">
            Verificar mi correo
          </a>
        </p>
        <p>O copia y pega este enlace en tu navegador:</p>
        <p><a href="${enlaceVerificacion}">${enlaceVerificacion}</a></p>
        <p style="color:#888; font-size: 12px;">Este enlace expira en 24 horas. Si no creaste esta cuenta, ignora este correo.</p>
      </div>
    `,
  });

  return info;
};

export default transporter;

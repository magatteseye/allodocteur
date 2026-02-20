const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

async function sendConfirmEmail({ to, fullName, confirmUrl, doctorName, dateTime }) {
  const html = `
  <div style="font-family:system-ui;padding:16px">
    <h2 style="margin:0;color:#1E6BFF">AlloDocteur</h2>
    <p>Bonjour <b>${fullName}</b>,</p>
    <p>Votre rendez-vous avec <b>${doctorName}</b> le <b>${dateTime}</b> est en attente de confirmation.</p>
    <a href="${confirmUrl}"
       style="display:inline-block;padding:12px 16px;border-radius:12px;background:#1E6BFF;color:white;text-decoration:none;font-weight:700">
       Confirmer mon rendez-vous
    </a>
    <p style="margin-top:12px;color:#64748B;font-size:13px">
      Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.
    </p>
  </div>`;

  await transporter.sendMail({
    from: `AlloDocteur <${process.env.SMTP_USER}>`,
    to,
    subject: "Confirmation de votre rendez-vous",
    html
  });
}

module.exports = { sendConfirmEmail };

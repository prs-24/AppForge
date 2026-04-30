import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email credentials not set — using mock transport');
    transporter = nodemailer.createTransport({ jsonTransport: true });
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return transporter;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transport = getTransporter();
    const info = await transport.sendMail({
      from: process.env.EMAIL_FROM || `AppForge <noreply@appforge.dev>`,
      ...options,
    });
    console.log('📧 Email sent:', info.messageId);
    return true;
  } catch (err) {
    console.error('❌ Email send failed:', err);
    return false;
  }
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: 'Welcome to AppForge!',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">Welcome to AppForge, ${name}! 🚀</h1>
        <p>Your account has been created successfully.</p>
        <p>Start building amazing config-driven apps today.</p>
        <a href="${process.env.FRONTEND_URL}" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 16px;">
          Get Started
        </a>
        <p style="margin-top: 32px; color: #666; font-size: 14px;">
          The AppForge Team
        </p>
      </div>
    `,
  });
}

export async function sendNotificationEmail(email: string, title: string, message: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: `AppForge: ${title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">${title}</h2>
        <p>${message}</p>
        <p style="margin-top: 32px; color: #666; font-size: 14px;">
          The AppForge Team
        </p>
      </div>
    `,
  });
}

import nodemailer from "nodemailer";

const requiredEnv = [
  "MAIL_HOST",
  "MAIL_PORT",
  "MAIL_USER",
  "MAIL_PASS",
  "MAIL_FROM",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.warn(`Missing email environment variable: ${key}`);
  }
}

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT) || 587,
  secure: Number(process.env.MAIL_PORT) === 465,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export async function sendPasswordResetOtp({
  email,
  otp,
}) {
  try {
    console.log("========================================");
    console.log("📧 PASSWORD RESET EMAIL");
    console.log("To:", email);
    console.log("Sending OTP through SMTP...");
    console.log("========================================");

    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to: email,
      subject: "Your Password Reset OTP",

      text: `Your password reset OTP is ${otp}. It expires in 10 minutes.`,

      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto;">
          <h2>Password Reset</h2>

          <p>We received a request to reset your password.</p>

          <p>Your OTP is:</p>

          <div style="
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            padding: 16px;
            background: #f3f4f6;
            text-align: center;
            border-radius: 8px;
          ">
            ${otp}
          </div>

          <p>
            This OTP will expire in
            <strong>10 minutes</strong>.
          </p>

          <p>
            If you did not request a password reset,
            you can safely ignore this email.
          </p>
        </div>
      `,
    });

    console.log("========================================");
    console.log("✅ OTP EMAIL ACCEPTED BY SMTP");
    console.log("Message ID:", info.messageId);
    console.log("SMTP response:", info.response);
    console.log("========================================");

    return info;

  } catch (error) {

    console.error("========================================");
    console.error("❌ OTP EMAIL FAILED");
    console.error(error);
    console.error("========================================");

    throw error;
  }
}

export async function verifyEmailTransporter() {
  try {
    await transporter.verify();
    console.log("✅ SMTP connection verified successfully");
    return true;
  } catch (error) {
    console.error("❌ SMTP connection failed:");
    console.error(error);
    return false;
  }
}
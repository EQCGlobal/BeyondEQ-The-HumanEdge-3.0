import express from "express";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import crypto from "crypto";
import nodemailer from "nodemailer";

dotenv.config();

// Lazy initialized Razorpay client to prevent startup runtime crash
let razorpayInstance: any = null;
function getRazorpayInstance() {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error("Razorpay credentials (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) are missing.");
    }
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpayInstance;
}

async function sendEmailNotification(subject: string, htmlContent: string, plainText: string, toEmail: string = "info@beyondeq.org") {
  const smtpUser = process.env.SMTP_USER || "info@beyondeq.org";
  const smtpPass = process.env.SMTP_PASS || "Gcv4vkt1?";
  const smtpHost = process.env.SMTP_HOST || "mail.beyondeq.org";
  let smtpPort = parseInt(process.env.SMTP_PORT || "456", 10);
  let wasAutoCorrected = false;
  
  if (smtpPort === 456) {
    smtpPort = 465;
    wasAutoCorrected = true;
  }

  if (!smtpUser || !smtpPass) {
    return { 
      sent: false, 
      configured: false, 
      message: "Form saved successfully! To receive direct email alerts, please define the SMTP secrets on Vercel." 
    };
  }

  try {
    const isSecurePort = smtpPort === 465 || smtpPort === 456;
    const isSecureOverridden = process.env.SMTP_SECURE === "true" || (process.env.SMTP_SECURE !== "false" && isSecurePort);

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: isSecureOverridden,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: false
      }
    });

    const info = await transporter.sendMail({
      from: `"BeyondEQ" <${smtpUser}>`,
      to: toEmail,
      subject: subject,
      text: plainText,
      html: htmlContent,
    });

    return { sent: true, configured: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("❌ Failed to transmit email via SMTP:", err);
    let extraAdvice = "";
    if (wasAutoCorrected) {
      extraAdvice = " (Note: Port was set to 456 in environment config, which we auto-corrected to 465.)";
    }
    return { 
      sent: false, 
      configured: true, 
      error: (err.message || String(err)) + extraAdvice,
      message: `Database stored but SMTP relay error: ${err.message || err}${extraAdvice}`
    };
  }
}

function getRequestOrigin(req: express.Request): string {
  const sanitizeOrigin = (rawOrigin: string): string => {
    if (!rawOrigin) return rawOrigin;
    return rawOrigin;
  };

  if (process.env.APP_URL) {
    const appUrl = process.env.APP_URL.trim();
    if (appUrl && appUrl !== "MY_APP_URL" && !appUrl.includes("localhost") && !appUrl.includes("127.0.0.1")) {
      let cleanUrl = appUrl;
      if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
        cleanUrl = "https://" + cleanUrl;
      }
      return sanitizeOrigin(cleanUrl.replace(/\/+$/, ""));
    }
  }

  if (req.body && req.body.origin) {
    const originStr = String(req.body.origin).trim();
    if (originStr && !originStr.includes("localhost") && !originStr.includes("127.0.0.1")) {
      return sanitizeOrigin(originStr.replace(/\/+$/, ""));
    }
  }

  if (req.headers.origin) {
    const originStr = String(req.headers.origin).trim();
    if (originStr && !originStr.includes("localhost") && !originStr.includes("127.0.0.1")) {
      return sanitizeOrigin(originStr.replace(/\/+$/, ""));
    }
  }

  if (req.headers.referer) {
    try {
      const refererUrl = new URL(req.headers.referer);
      const originStr = refererUrl.origin;
      if (originStr && !originStr.includes("localhost") && !originStr.includes("127.0.0.1")) {
        return sanitizeOrigin(originStr);
      }
    } catch (e) {}
  }

  const forwardedHost = req.headers['x-forwarded-host'];
  const forwardedProto = req.headers['x-forwarded-proto'] || 'https';
  if (forwardedHost) {
    const hostHeader = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
    const cleanHostHeader = hostHeader.split(',')[0].trim();
    if (!cleanHostHeader.includes("localhost") && !cleanHostHeader.includes("127.0.0.1")) {
      return sanitizeOrigin(`${forwardedProto}://${cleanHostHeader}`);
    }
  }

  const host = req.headers.host;
  if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
    const protocol = req.protocol === "https" ? "https" : "http";
    return sanitizeOrigin(`${protocol}://${host}`);
  }

  const fallbackProtocol = req.protocol === "https" ? "https" : "http";
  const fallbackHost = req.headers.host || "localhost:3000";
  return sanitizeOrigin(`${fallbackProtocol}://${fallbackHost}`);
}

const app = express();
app.use(express.json());

// API health endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is healthy on Vercel" });
});

// Config endpoint
app.get("/api/config", (req, res) => {
  const origin = getRequestOrigin(req);
  res.json({ origin });
});

// Trainer Application Submission
app.post("/api/submit-trainer", async (req, res) => {
  try {
    const { fullName, email, role, experience, motivation } = req.body;
    
    const subject = `New BeyondEQ Trainer Application from ${fullName}`;
    const plainText = `
New BeyondEQ Trainer Application Request:
------------------------------------------
Full Name: ${fullName}
Email: ${email}
Proposed Role: ${role}
Experience Level: ${experience}
Motivation & Interest: ${motivation}
    `.trim();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="color: #104C64; border-bottom: 2px solid #41B1C2; padding-bottom: 8px;">BeyondEQ Developer Sandbox</h2>
        <h3 style="color: #333;">New Trainer Program Request</h3>
        <p>The following candidate has submitted an application for the trainer network:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9; width: 140px;">Full Name</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${fullName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9;">Email</td>
            <td style="padding: 10px; border: 1px solid #ddd;"><a href="mailto:${email}">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9;">Role Focus</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${role}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9;">Experience</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${experience}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9;">Motivation</td>
            <td style="padding: 10px; border: 1px solid #ddd; white-space: pre-wrap;">${motivation}</td>
          </tr>
        </table>
      </div>
    `;

    const mailResult = await sendEmailNotification(subject, htmlContent, plainText);
    res.json({ success: true, ...mailResult });
  } catch (err: any) {
    console.error("Error in /api/submit-trainer:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to process trainer application" });
  }
});

// Contact/Inquiry Submission
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, org, phone, type, message } = req.body;
    
    const subject = `New BeyondEQ Contact/Inquiry from ${name}`;
    const plainText = `
New BeyondEQ Contact/Inquiry Form Submission:
---------------------------------------------
Full Name: ${name}
Organization: ${org || "Not provided"}
Email: ${email}
Phone Number: ${phone || "Not provided"}
Affiliation Type: ${type}
Message/Requests: ${message || "No message provided."}
    `.trim();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="color: #104C64; border-bottom: 2px solid #41B1C2; padding-bottom: 8px;">BeyondEQ Developer Sandbox</h2>
        <h3 style="color: #333;">New Strategic Inquiry Received</h3>
        <p>A user has contacted BeyondEQ via the contact form with the following details:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9; width: 140px;">Full Name</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9;">Organization</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${org || "Not provided"}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9;">Email</td>
            <td style="padding: 10px; border: 1px solid #ddd;"><a href="mailto:${email}">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9;">Phone Number</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${phone || "Not provided"}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9;">Affiliation</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${type}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9;">Message</td>
            <td style="padding: 10px; border: 1px solid #ddd; white-space: pre-wrap;">${message || "No message provided."}</td>
          </tr>
        </table>
      </div>
    `;

    const mailResult = await sendEmailNotification(subject, htmlContent, plainText);
    res.json({ success: true, ...mailResult });
  } catch (err: any) {
    console.error("Error in /api/contact:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to process contact inquiry" });
  }
});

// Observer Email Invitation / Reminder Outbox
app.post("/api/invite-observer", async (req, res) => {
  try {
    const { observerEmail, observerName, observerRelationship, userName, userId, userType } = req.body;
    
    const baseOrigin = getRequestOrigin(req);
    const inviteLink = `${baseOrigin}/observer-assessment?userId=${userId}&email=${encodeURIComponent(observerEmail)}`;
    const isEnterprise = userType === "enterprise";
    
    const subject = isEnterprise 
      ? `BeyondEQ Enterprise 360° Diagnostic Request from ${userName}`
      : `Confidential 360° Performance Feedback Request from ${userName}`;
      
    const plainText = `
Dear ${observerName},

${userName} has nominated you as an active observer for their BeyondEQ 360° ${isEnterprise ? 'Corporate Executive' : 'Personal development'} Diagnostic.

- Nomination details with link: ${inviteLink}

Regards,
BeyondEQ Support & Delivery Team
    `.trim();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 16px;">
        <h2 style="color: #104C64; border-bottom: 2px solid #41B1C2; padding-bottom: 12px; margin-top: 0;">BeyondEQ 360° Diagnostic</h2>
        <p>Dear <strong>${observerName}</strong>,</p>
        <p><strong>${userName}</strong> has nominated you as an observer to complete their 360° assessment.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${inviteLink}" style="background-color: #41B1C2; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; display: inline-block;">
            Begin Observer Audit
          </a>
        </div>
      </div>
    `;

    const mailResult = await sendEmailNotification(subject, htmlContent, plainText, observerEmail);
    res.json({ success: true, ...mailResult });
  } catch (err: any) {
    console.error("Error in /api/invite-observer:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to dispatch observer invitation email." });
  }
});

// Corporate Teammate Invitation Outbox
app.post("/api/invite-corporate", async (req, res) => {
  try {
    const { colleagueEmail, colleagueName, colleagueRole, adminName, adminUid, seatIndex, inviteId, isSameDomain } = req.body;
    const baseOrigin = getRequestOrigin(req);
    
    let inviteLink = "";
    if (isSameDomain && inviteId) {
      inviteLink = `${baseOrigin}/instant-assessment?adminId=${adminUid}&inviteId=${inviteId}`;
    } else {
      inviteLink = `${baseOrigin}/register?enterpriseInvitedBy=${adminUid}&email=${encodeURIComponent(colleagueEmail)}&name=${encodeURIComponent(colleagueName)}&designation=${encodeURIComponent(colleagueRole)}`;
    }
    
    const subject = `BeyondEQ Corporate Seat Allocation: Welcome to the Team!`;
    const plainText = `
Dear ${colleagueName},

You have been allocated a corporate seat on the BeyondEQ platform.

Onboarding Link: ${inviteLink}

Regards,
BeyondEQ Support & Delivery Team
    `.trim();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 16px;">
        <h2>BeyondEQ Corporate Seat</h2>
        <p>Dear <strong>${colleagueName}</strong>,</p>
        <p>You have been allocated <strong>Seat 0${seatIndex}</strong> by ${adminName}.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${inviteLink}" style="background-color: #41B1C2; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; display: inline-block;">
            Activate License & Join Team
          </a>
        </div>
      </div>
    `;

    const mailResult = await sendEmailNotification(subject, htmlContent, plainText, colleagueEmail);
    res.json({ success: true, ...mailResult });
  } catch (err: any) {
    console.error("Error in /api/invite-corporate:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to dispatch corporate invitation email." });
  }
});

// Razorpay order creation
app.post("/api/razorpay/order", async (req, res) => {
  try {
    const { plan } = req.body;
    let amount = 99800;
    if (plan === "annual") {
      amount = 958000;
    } else if (plan === "enterprise") {
      amount = 299900;
    }

    const rzp = getRazorpayInstance();
    const options = {
      amount,
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    };

    const order = await rzp.orders.create(options);
    res.json({ success: true, order });
  } catch (error: any) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to create order" });
  }
});

// Razorpay transaction signature verification
app.post("/api/razorpay/verify", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      throw new Error("Payment verification failed due to missing secret configuration.");
    }

    const hash = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (hash === razorpay_signature) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: "Payment verification signature mismatch." });
    }
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ success: false, error: error.message || "Payment verification failed" });
  }
});

export default app;

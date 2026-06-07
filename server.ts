import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import crypto from "crypto";
import nodemailer from "nodemailer";

// Configure dotenv at startup
dotenv.config();

const getFilenames = () => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.url) {
      const filename = fileURLToPath(import.meta.url);
      return {
        filename,
        dirname: path.dirname(filename),
      };
    }
  } catch (e) {
    // Fall back to global __filename and __dirname if they exist
  }
  return {
    filename: typeof __filename !== "undefined" ? __filename : "",
    dirname: typeof __dirname !== "undefined" ? __dirname : "",
  };
};

const { filename: __filenameLocal, dirname: __dirnameLocal } = getFilenames();

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
    console.warn("⚠️ SMTP Port typo detected (456 instead of 465). Auto-correcting to 465.");
    smtpPort = 465;
    wasAutoCorrected = true;
  }

  // If even hardcoded fallback was somehow empty, warn
  if (!smtpUser || !smtpPass) {
    const warnPrefix = "\n=======================================================\n";
    console.warn(
      `${warnPrefix}⚠️  OUTBOUND EMAIL SYSTEM IS DEPLOYED BUT UNCONFIGURED!\n` +
      `Subject: ${subject}\n` +
      `Recipient: ${toEmail}\n` +
      `SMTP variables are missing from process.env.\n` +
      `To receive real emails at ${toEmail}, please configure the following variables in the Secrets panel:\n` +
      `- SMTP_HOST (e.g. smtp.gmail.com)\n` +
      `- SMTP_PORT (e.g. 587)\n` +
      `- SMTP_USER (e.g. sender@gmail.com)\n` +
      `- SMTP_PASS (e.g. your-app-password)\n` +
      `-------------------------------------------------------\n` +
      `PLAINTEXT CONTENT:\n${plainText}\n` +
      `=======================================================${warnPrefix}`
    );
    return { 
      sent: false, 
      configured: false, 
      message: "Form saved successfully! To receive direct email alerts, please define the SMTP secrets in your AI Studio project Settings." 
    };
  }

  try {
    const isSecurePort = smtpPort === 465 || smtpPort === 456;
    const isSecureOverridden = process.env.SMTP_SECURE === "true" || (process.env.SMTP_SECURE !== "false" && isSecurePort);

    console.log(`📤 Initiating email transport config - Host: ${smtpHost}, Port: ${smtpPort}, Secure: ${isSecureOverridden}, Authenticated User: ${smtpUser}`);

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: isSecureOverridden,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      connectionTimeout: 10000, // 10 seconds timeout for establishing TCPSocket
      greetingTimeout: 10000,   // 10 seconds timeout for SMTP greeting handshake
      socketTimeout: 15000,    // 15 seconds of inactive socket data timeout
      tls: {
        // Bypasses certificate verification failures (e.g., self-signed or hostname mismatches),
        // which are extremely common with custom domain mail servers in sandbox apps.
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

    console.log(`✅ Mail successfully dispatched to ${toEmail} (Message ID: ${info.messageId})`);
    return { sent: true, configured: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("❌ Failed to transmit email via SMTP. Detailed error diagnostic stack:", err);
    let extraAdvice = "";
    if (wasAutoCorrected) {
      extraAdvice = " (Note: Port was set to 456 in environment config, which we auto-corrected to 465 based on standard secure SMTP settings.)";
    }
    return { 
      sent: false, 
      configured: true, 
      error: (err.message || String(err)) + extraAdvice,
      message: `Database stored but SMTP relay error encountered: ${err.message || err}${extraAdvice}`
    };
  }
}

function getRequestOrigin(req: express.Request): string {
  const sanitizeOrigin = (rawOrigin: string): string => {
    if (!rawOrigin) return rawOrigin;
    if (rawOrigin.includes("ais-dev-")) {
      return rawOrigin.replace("ais-dev-", "ais-pre-");
    }
    return rawOrigin;
  };

  // 1. Check process.env.APP_URL first
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

  // 2. Direct body origin (passed from frontend)
  if (req.body && req.body.origin) {
    const originStr = String(req.body.origin).trim();
    if (originStr && !originStr.includes("localhost") && !originStr.includes("127.0.0.1")) {
      return sanitizeOrigin(originStr.replace(/\/+$/, ""));
    }
  }

  // 3. Browser request origin header
  if (req.headers.origin) {
    const originStr = String(req.headers.origin).trim();
    if (originStr && !originStr.includes("localhost") && !originStr.includes("127.0.0.1")) {
      return sanitizeOrigin(originStr.replace(/\/+$/, ""));
    }
  }

  // 4. Browser referer header
  if (req.headers.referer) {
    try {
      const refererUrl = new URL(req.headers.referer);
      const originStr = refererUrl.origin;
      if (originStr && !originStr.includes("localhost") && !originStr.includes("127.0.0.1")) {
        return sanitizeOrigin(originStr);
      }
    } catch (e) {
      // ignore invalid referrer
    }
  }

  // 5. x-forwarded-host Header (checking if it contains a non-localhost domain)
  const forwardedHost = req.headers['x-forwarded-host'];
  const forwardedProto = req.headers['x-forwarded-proto'] || 'https';
  if (forwardedHost) {
    const hostHeader = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
    const cleanHostHeader = hostHeader.split(',')[0].trim();
    if (!cleanHostHeader.includes("localhost") && !cleanHostHeader.includes("127.0.0.1")) {
      return sanitizeOrigin(`${forwardedProto}://${cleanHostHeader}`);
    }
  }

  // 6. Host Header (checking if not localhost)
  const host = req.headers.host;
  if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
    const protocol = req.protocol === "https" ? "https" : "http";
    return sanitizeOrigin(`${protocol}://${host}`);
  }

  // 7. Direct body origin backup even if localhost
  if (req.body && req.body.origin) {
    return sanitizeOrigin(String(req.body.origin).trim().replace(/\/+$/, ""));
  }

  // 8. Browser referer backup even if localhost
  if (req.headers.referer) {
    try {
      return sanitizeOrigin(new URL(req.headers.referer).origin);
    } catch (_) {}
  }

  // 9. Default fallback
  const fallbackProtocol = req.protocol === "https" ? "https" : "http";
  const fallbackHost = req.headers.host || "localhost:3000";
  return sanitizeOrigin(`${fallbackProtocol}://${fallbackHost}`);
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  // JSON request parser for API endpoints
  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Server is healthy" });
  });

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
          <p style="font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 10px; margin-top: 20px;">
            This email was generated from the BeyondEQ application workspace.
          </p>
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
          <p style="font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 10px; margin-top: 20px;">
            This email was generated from the BeyondEQ application workspace.
          </p>
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

- Nominee: ${userName}
- Your Relationship/Perspective: ${observerRelationship}
- Workspace Tier: ${isEnterprise ? 'Enterprise' : 'Individual Professional'}

Please spend 3 to 5 minutes to complete their behavior selection audit. Your responses are anonymized, consolidated, and treated with absolute confidentiality to foster authentic behavioral assessment.

To submit your feedback, click the secure link below:
${inviteLink}

Regards,
BeyondEQ Support & Delivery Team
      `.trim();

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 16px; background-color: #ffffff;">
          <h2 style="color: #104C64; border-bottom: 2px solid #41B1C2; padding-bottom: 12px; margin-top: 0; font-size: 20px;">BeyondEQ 360° Diagnostic</h2>
          <p style="font-size: 14px; margin-top: 20px;">Dear <strong>${observerName}</strong>,</p>
          <p style="font-size: 14px;"><strong>${userName}</strong> has nominated you as an observer to complete their 360° multi-rater assessment. Your perspective provides invaluable, multi-dimensional feedback to help map their behavioral leadership intelligence.</p>
          
          <div style="background-color: #f7f9fa; border: 1px solid #eef2f5; border-radius: 12px; padding: 16px; margin: 24px 0;">
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 0; font-weight: bold; color: #555555; width: 120px;">Nominee:</td>
                <td style="padding: 4px 0; color: #1a1a1a;">${userName}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: bold; color: #555555;">Perspective:</td>
                <td style="padding: 4px 0; color: #1a1a1a;">${observerRelationship}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: bold; color: #555555;">Workspace Tier:</td>
                <td style="padding: 4px 0; color: #104C64; font-weight: bold;">${isEnterprise ? 'Enterprise Framework' : 'Individual Professional'}</td>
              </tr>
            </table>
          </div>
          
          <p style="font-size: 13px; color: #555555; line-height: 1.5; margin-bottom: 28px;">
            This audit requires approximately 3 to 5 minutes of focused feedback. All observer responses are consolidated and anonymized to ensure that scoring inputs remain strictly confidential.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteLink}" style="background-color: #41B1C2; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 13px; font-weight: bold; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px rgba(65, 177, 194, 0.15); text-transform: uppercase; letter-spacing: 0.05em;">
              Begin Observer Audit
            </a>
          </div>
          
          <p style="font-size: 12px; color: #888888; margin-top: 32px; border-top: 1px solid #eaeaea; padding-top: 16px;">
            If the button doesn't work, copy and paste the URL below into your browser:<br/>
            <span style="color: #41B1C2; word-break: break-all; font-family: monospace;">${inviteLink}</span>
          </p>
          
          <p style="font-size: 11px; color: #aaaaaa; margin-top: 12px; text-align: center;">
            This invitation was dispatched securely by BeyondEQ on behalf of ${userName}.
          </p>
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
      const { colleagueEmail, colleagueName, colleagueRole, adminName, adminUid, seatIndex, origin, inviteId, isSameDomain } = req.body;
      
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

You have been allocated a corporate seat (Seat 0${seatIndex}) on the BeyondEQ Behavioral Leadership platform by your administrator, ${adminName}.

- Your Profile:
  Role/Designation: ${colleagueRole}
  Workplace Email: ${colleagueEmail}

To activate your corporate license and join your organization's workspace, please complete your onboarding registration using the secure link below:
${inviteLink}

Welcome to BeyondEQ! We're thrilled to have you mapping your group's dynamic intelligence.

Regards,
BeyondEQ Support & Delivery Team
      `.trim();

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 16px; background-color: #ffffff;">
          <h2 style="color: #104C64; border-bottom: 2px solid #41B1C2; padding-bottom: 12px; margin-top: 0; font-size: 20px;">BeyondEQ Corporate Seat</h2>
          <p style="font-size: 14px; margin-top: 20px;">Dear <strong>${colleagueName}</strong>,</p>
          <p style="font-size: 14px;">Great news! <strong>${adminName}</strong> has officially allocated a corporate seat (<strong>Seat 0${seatIndex}</strong>) to you on the **BeyondEQ** Behavioral Leadership and Team Synergy platform.</p>
          
          <div style="background-color: #f7f9fa; border: 1px solid #eef2f5; border-radius: 12px; padding: 16px; margin: 24px 0;">
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 0; font-weight: bold; color: #555555; width: 120px;">Workspace Admin:</td>
                <td style="padding: 4px 0; color: #1a1a1a;">${adminName}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: bold; color: #555555;">Your Designation:</td>
                <td style="padding: 4px 0; color: #1a1a1a;">${colleagueRole}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: bold; color: #555555;">Assigned Seat:</td>
                <td style="padding: 4px 0; color: #104C64; font-weight: bold;">Seat 0${seatIndex}</td>
              </tr>
            </table>
          </div>
          
          <p style="font-size: 13px; color: #555555; line-height: 1.5; margin-bottom: 28px;">
            BeyondEQ helps forward-thinking groups decode and visualize emotional leadership profiles. To activate your corporate license and jump straight into our assessment matrices, click the activation button below.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteLink}" style="background-color: #41B1C2; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 13px; font-weight: bold; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px rgba(65, 177, 194, 0.15); text-transform: uppercase; letter-spacing: 0.05em;">
              Activate License & Join Team
            </a>
          </div>
          
          <p style="font-size: 12px; color: #888888; margin-top: 32px; border-top: 1px solid #eaeaea; padding-top: 16px;">
            If the button doesn't work, copy and paste the URL below into your browser:<br/>
            <span style="color: #41B1C2; word-break: break-all; font-family: monospace;">${inviteLink}</span>
          </p>
          
          <p style="font-size: 11px; color: #aaaaaa; margin-top: 12px; text-align: center;">
            This invitation was dispatched securely by BeyondEQ on behalf of ${adminName}.
          </p>
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
      // monthly: 998 INR = 99800 Paise.
      // annual (20% discount): 998 * 12 = 11976. 20% discount = 9580.8 INR. We charge 9580 INR = 958000 Paise.
      // enterprise: 2999 INR = 299900 Paise.
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

      // Generate verification HMAC hex signature
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

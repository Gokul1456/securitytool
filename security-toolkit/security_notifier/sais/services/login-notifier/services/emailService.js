const nodemailer = require("nodemailer");

/**
 * Mailer service for SAIS Login Notifier
 */
class EmailService {
  constructor() {
    this.enabled = !!(process.env.SMTP_HOST && process.env.SMTP_USER);
    
    if (this.enabled) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      console.warn("EmailService: SMTP not configured. Emails will be logged to console.");
    }
  }

  async sendSecurityAlert({ to, userName, eventType, time, previousIp, newIp, location }) {
    const isBruteForce = eventType === 'MULTIPLE_FAILED_LOGINS';
    const subject = isBruteForce 
      ? "Security Alert: Too Many Failed Login Attempts"
      : "Security Alert: Suspicious Login Detected";
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #121212; color: #ffffff; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #1e1e1e; border-radius: 8px; overflow: hidden; border: 1px solid #333; }
    .header { padding: 30px; border-bottom: 1px solid #333; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; color: #fff; }
    .content { padding: 30px; }
    .warning-box { background-color: rgba(255, 193, 7, 0.1); border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin-bottom: 25px; display: flex; align-items: flex-start; gap: 12px; }
    .warning-icon { color: #ffc107; font-size: 20px; font-weight: bold; }
    .warning-text { color: #fff; font-size: 15px; line-height: 1.5; }
    .details-card { background-color: #252525; border-radius: 8px; padding: 25px; margin-bottom: 25px; }
    .details-card h2 { margin-top: 0; font-size: 18px; margin-bottom: 20px; color: #fff; }
    .detail-row { margin-bottom: 12px; display: flex; }
    .detail-label { width: 120px; color: #aaa; font-size: 14px; font-weight: 600; }
    .detail-value { flex: 1; color: #fff; font-size: 14px; font-family: monospace; }
    .footer { padding: 20px 30px; background-color: #1a1a1a; color: #888; font-size: 13px; text-align: left; border-top: 1px solid #333; }
    .brand { color: #3b82f6; font-weight: bold; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${subject}</h1>
    </div>
    <div class="content">
      <div class="warning-box">
        <div class="warning-icon">⚠️</div>
        <div class="warning-text">
          <strong>Important:</strong> ${isBruteForce 
            ? 'We detected multiple failed login attempts on your account. This could indicate a brute-force attack.'
            : `We detected a login to your account from a ${eventType === 'NEW_LOCATION_LOGIN' ? 'new location' : 'new IP address'}.`}
        </div>
      </div>
      
      <div class="details-card">
        <h2>${isBruteForce ? 'Attempt Details:' : 'Login Details:'}</h2>
        <div class="detail-row">
          <div class="detail-label">Account:</div>
          <div class="detail-value">${to}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Time:</div>
          <div class="detail-value">${time || new Date().toLocaleString()}</div>
        </div>
        ${previousIp && !isBruteForce ? `
        <div class="detail-row">
          <div class="detail-label">Previous IP:</div>
          <div class="detail-value">${previousIp}</div>
        </div>
        ` : ''}
        <div class="detail-row">
          <div class="detail-label">IP Address:</div>
          <div class="detail-value">${newIp}</div>
        </div>
        ${location ? `
        <div class="detail-row">
          <div class="detail-label">Location:</div>
          <div class="detail-value">${location}</div>
        </div>
        ` : ''}
      </div>
      
      <p style="color: #ccc; font-size: 14px;">If this was you, you can ignore this email. Otherwise, please change your password immediately.</p>
    </div>
    <div class="footer">
      <div class="brand">SAIS Security Intelligence</div>
      This is an automated security notification. Please do not reply to this email.
    </div>
  </div>
</body>
</html>
    `;

    if (this.enabled) {
      try {
        const info = await this.transporter.sendMail({
          from: `"SAIS Security" <${process.env.SMTP_USER}>`,
          to,
          subject,
          html,
        });
        const emailPath = require('path').resolve(__dirname, '../../../../last_email.html');
        require('fs').writeFileSync(emailPath, html);
        console.log("Email sent: %s and saved to %s", info.messageId, emailPath);
        return true;
      } catch (err) {
        console.error("Failed to send email:", err);
        return false;
      }
    } else {
      console.log("--- MOCK EMAIL START ---");
      console.log("TO:", to);
      console.log("SUBJECT:", subject);
      // Save to file for demo purposes
      try {
        const path = require('path');
        const rootPath = path.resolve(__dirname, '../../../../');
        require('fs').writeFileSync(path.join(rootPath, 'last_email.html'), html);
        console.log(`Email content saved to ${path.join(rootPath, 'last_email.html')} for demo viewing.`);
      } catch(e) {
        console.error("Failed to write demo email file:", e.message);
      }
      console.log("--- MOCK EMAIL END ---");
      return true;
    }
  }
}

module.exports = new EmailService();

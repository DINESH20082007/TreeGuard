import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

logger = logging.getLogger("treeguard.email")

class EmailService:
    @staticmethod
    def send_password_reset_email(to_email: str, reset_token: str) -> bool:
        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
        
        # Log sanitized operational event without exposing the raw secret token in logs
        logger.info(f"Password reset dispatch requested for account: {to_email}")

        # If SMTP is not fully configured, acknowledge in dev mode without erroring
        if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD or settings.SMTP_HOST == "smtp.example.com":
            logger.info(f"SMTP credentials unconfigured in dev mode; simulation completed for {to_email}.")
            return True

        try:
            msg = MIMEMultipart()
            msg["From"] = settings.SMTP_FROM
            msg["To"] = to_email
            msg["Subject"] = "TreeGuard - Password Reset Request"

            body = f"""Hello,

We received a request to reset your password for your TreeGuard account.
Please click the link below to set a new password:

{reset_link}

This link is single-use and will expire in 1 hour.
If you did not make this request, you can safely ignore this email.

Best regards,
The TreeGuard Team
"""
            msg.attach(MIMEText(body, "plain"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.starttls()
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(msg)

            logger.info(f"Password reset email sent successfully to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            # Do not crash the application if email provider is unreachable
            return False

email_service = EmailService()

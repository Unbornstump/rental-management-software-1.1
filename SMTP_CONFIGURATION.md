# SMTP Configuration Guide for RMS Email Recovery

This guide explains how to configure the SMTP email backend for RMS password recovery features.

## Overview

The RMS password recovery system sends recovery links via email. This requires configuring an SMTP email provider in your Django environment.

## Supported Email Providers

### Gmail (Recommended for Development/Testing)

Gmail requires using an "App Password" instead of your regular password:

1. **Enable 2-Factor Authentication** on your Google Account
2. **Generate an App Password:**
   - Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and "Windows Computer"
   - Google will generate a 16-character password
   - Copy this password (you'll use it in `.env`)

### Other SMTP Providers

- **SendGrid, Mailgun, AWS SES:** Use provider-specific SMTP details
- **Office 365:** Use SMTP server `smtp.office365.com` port 587
- **Local Development:** Use Django console backend (no email sent, logged to console)

## Configuration

### 1. Create Environment Variables

Create or update your `.env` file in the project root (where `manage.py` is located):

```env
# Email Backend Configuration
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@rms.local
```

**Variables Explained:**

| Variable | Value | Notes |
|----------|-------|-------|
| `EMAIL_BACKEND` | `django.core.mail.backends.smtp.EmailBackend` | SMTP backend for sending emails |
| `EMAIL_HOST` | `smtp.gmail.com` (Gmail) | SMTP server hostname |
| `EMAIL_PORT` | `587` | SMTP port (TLS) |
| `EMAIL_USE_TLS` | `True` | Enable TLS encryption |
| `EMAIL_HOST_USER` | Your email address | Gmail address or provider account |
| `EMAIL_HOST_PASSWORD` | App password from provider | NOT your regular password for Gmail |
| `DEFAULT_FROM_EMAIL` | `noreply@rms.local` | Sender email address for recovery emails |

### 2. For Alternative Providers

**SendGrid Example:**
```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=your-sendgrid-api-key
DEFAULT_FROM_EMAIL=noreply@your-domain.com
```

**Mailgun Example:**
```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=postmaster@your-domain.mailgun.org
EMAIL_HOST_PASSWORD=your-mailgun-password
DEFAULT_FROM_EMAIL=noreply@your-domain.com
```

**Development/Testing (Console Backend - No Email Sent):**
```env
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

### 3. Test Your Configuration

1. **Start Django Shell:**
   ```bash
   cd engine
   python manage.py shell
   ```

2. **Send a Test Email:**
   ```python
   from django.core.mail import send_mail
   from django.conf import settings
   
   send_mail(
       subject='RMS Password Recovery Test',
       message='If you see this, email is working!',
       from_email=settings.DEFAULT_FROM_EMAIL,
       recipient_list=['your-test-email@gmail.com'],
       fail_silently=False,
   )
   ```

3. **Expected Output:**
   - Success: No errors printed, email appears in recipient inbox
   - Failure: Exception with SMTP error details

## Password Recovery Flows

The SMTP configuration is used in these recovery scenarios:

### Email Recovery Flow
- User enters username on recovery page
- System sends reset link to registered recovery email
- Link valid for 30 minutes
- User clicks link and sets new password

### Setup Flow (First-time Account Creation)
- User enters recovery email during Step 3
- System generates initial recovery code
- Recovery email is stored for account recovery

### Password Change Notification (Future Enhancement)
- Could send email confirming password changes
- Not currently implemented but infrastructure ready

## Email Content

### Recovery Email Template
```
Subject: RMS Password Recovery Request

To reset your password, click the link below (valid for 30 minutes):

https://[your-rms-host]/recovery.html?token=[reset_token]

If you didn't request this, ignore this email.

— RMS Password Recovery
```

## Security Best Practices

1. **Never commit `.env` files** to version control
   - Add `.env` to `.gitignore`
   - Store securely on production servers

2. **Use Strong Credentials**
   - Gmail: Always use App Passwords, never regular account password
   - Other providers: Use API keys or dedicated email account credentials

3. **Enable TLS**
   - Always use `EMAIL_USE_TLS=True`
   - Encrypts credentials and email content in transit

4. **Monitor Email Logs**
   - Check Django logs for failed email sends
   - Set up alerts if recovery emails consistently fail

5. **Separate Sender Email**
   - Use `noreply@` or similar for sender address
   - Prevents accidental replies to wrong address

## Troubleshooting

### "SMTP Authentication Failed"
- Verify `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD` are correct
- For Gmail: Use App Password, not regular password
- Check if account has 2FA enabled (required for Gmail)

### "Connection refused" or "Connection timeout"
- Verify `EMAIL_HOST` and `EMAIL_PORT` are correct for provider
- Check firewall isn't blocking SMTP port (usually 587 for TLS)
- Test connection: `telnet smtp.gmail.com 587`

### "TLS unavailable or unsupported"
- Ensure `EMAIL_USE_TLS=True` in configuration
- Some providers require SSL instead: use port 465 with `EMAIL_USE_SSL=True`

### "Email sent but not received"
- Check spam folder
- Verify recipient email address is correct
- Check `DEFAULT_FROM_EMAIL` domain is recognized
- Review email provider's logs for delivery status

### "No module or error on startup"
- Verify `.env` file is in correct location (project root)
- Ensure Django loads environment variables: check if `python-dotenv` is installed and imported in `settings.py`
- Check for Python syntax errors in `.env` file

## Production Deployment

### Before Going Live

1. **Test Recovery Flows:**
   - Complete account setup and save recovery code
   - Test email recovery from recovery page
   - Test security question recovery
   - Test recovery code recovery

2. **Monitor Email Delivery:**
   - Check logs regularly for email failures
   - Set up automated alerts if emails bounce
   - Monitor retry queue if using async email sending

3. **SSL/TLS Certificate:**
   - Ensure RMS domain has valid SSL certificate
   - Recovery links must use HTTPS for security

4. **Backup Recovery Methods:**
   - All users must have recovery email set
   - All users must have recovery code saved
   - All users must have security question configured

### Scaling Considerations

- **Async Email Sending:** For high-traffic systems, consider Celery + Redis for async email tasks
- **Email Rate Limiting:** Implement rate limiting on recovery endpoints (already implemented: 3 failures = 15-min lockout)
- **Backup SMTP Provider:** Consider failover to secondary email provider if primary fails

## Environment Variables Reference

| Variable | Default | Required | Purpose |
|----------|---------|----------|---------|
| `EMAIL_BACKEND` | Console | ✓ | Which email backend to use |
| `EMAIL_HOST` | localhost | • | SMTP server hostname |
| `EMAIL_PORT` | 25 | • | SMTP port number |
| `EMAIL_USE_TLS` | False | • | Enable TLS encryption |
| `EMAIL_USE_SSL` | False | • | Enable SSL encryption (alternative to TLS) |
| `EMAIL_HOST_USER` | Empty | • | SMTP authentication username |
| `EMAIL_HOST_PASSWORD` | Empty | • | SMTP authentication password |
| `DEFAULT_FROM_EMAIL` | webmaster@localhost | ✓ | Sender email address |

✓ = Required for SMTP backend
• = Only if using SMTP backend

## Support

For RMS-specific email recovery issues:
- Check `engine/rms_backend/settings.py` for backend configuration
- Review Django email backend documentation: [https://docs.djangoproject.com/en/stable/topics/email/](https://docs.djangoproject.com/en/stable/topics/email/)
- Check provider's SMTP documentation for correct host/port settings

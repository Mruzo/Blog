# Password Reset Email Flow - React App

## ✅ Implementation Complete

The React app now has a proper API endpoint for password reset that:
1. ✅ Accepts JSON requests (no CSRF token needed)
2. ✅ Uses Django's `PasswordResetForm` to send emails
3. ✅ Sends email via Django's SMTP backend
4. ✅ Uses the same email templates as Django login

## How Email is Sent (Django Side)

### Email Configuration
Django is configured to send emails via SMTP:
- **Email Backend**: `django.core.mail.backends.smtp.EmailBackend`
- **SMTP Host**: `mail.papamail.net`
- **Port**: 587 (TLS)
- **From Email**: `noreply@justvybz.com`

### Email Templates
Django uses these templates to generate the password reset email:
1. **Subject**: `registration/password_reset_subject.txt`
2. **Body (Plain)**: `registration/password_reset_email.html`
3. **Body (HTML)**: `emails/password_reset_email.html` (if configured)

### Email Content
The email contains:
- User's name
- Password reset link: `{{ protocol }}://{{ domain }}/password-reset-confirm/{{ uidb64 }}/{{ token }}/`
- Expiration notice (24 hours)
- Support contact information

## ✅ Current Implementation

### API Endpoint Created
**Location**: `icvybz/api_views.py` - `password_reset_api()`
**URL**: `/api/icvybz/auth/password-reset/`
**Method**: POST
**Accepts**: JSON `{ "email": "user@example.com" }`

### How It Works

1. **React Component** (`PasswordReset.tsx`):
   - User enters email
   - Calls `apiService.passwordReset(email)`
   - Sends JSON POST to `/api/icvybz/auth/password-reset/`

2. **Django API Endpoint** (`password_reset_api`):
   - Receives JSON with email
   - Uses Django's `PasswordResetForm` to validate email
   - Calls `form.save()` which:
     - Generates reset token
     - Renders email template
     - **Sends email via SMTP** to `mail.papamail.net:587`

3. **Email Sent**:
   - **From**: `noreply@justvybz.com`
   - **To**: User's email address
   - **Subject**: Rendered from `registration/password_reset_subject.txt`
   - **Body**: Rendered from `emails/password_reset_email.html` (HTML) and `registration/password_reset_email.html` (plain text)
   - **Contains**: Password reset link with token

4. **User Receives Email**:
   - Email arrives in user's inbox
   - Contains link: `https://domain.com/password-reset-confirm/{uidb64}/{token}/`
   - User clicks link → React `PasswordResetConfirm` component

## Complete Flow (Working)

1. User fills email in React form
2. React sends request to API endpoint (with proper format)
3. ✅ Django validates email
4. ✅ Django generates reset token
5. ✅ Django sends email via SMTP to `mail.papamail.net`
6. ✅ User receives email with reset link
7. ✅ User clicks link → React `PasswordResetConfirm` component
8. ✅ User sets new password

## Email Sending Process

1. **Django receives request** → Validates email exists in database
2. **Generates token** → Creates unique token linked to user
3. **Renders email template** → Uses Django template with user data
4. **Sends via SMTP** → Connects to `mail.papamail.net:587`
5. **Email delivered** → User receives email in their inbox

## Important Notes

- **React does NOT send the email** - Django does
- **React only triggers** the password reset request
- **Email is sent server-side** by Django's email backend
- **Same email system** is used whether request comes from Django form or React app
- **Email templates** are Django templates (not React components)


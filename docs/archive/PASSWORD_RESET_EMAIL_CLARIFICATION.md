# Password Reset Email Flow - How It Works

## ✅ How Email is Sent Through React App

### Summary
**React does NOT send the email directly** - it triggers Django to send the email via Django's email backend (SMTP).

### Complete Flow

1. **User in React App**:
   - Fills email in `PasswordReset.tsx` form
   - Clicks "Send Reset Link"

2. **React Component** (`PasswordReset.tsx`):
   - Calls `apiService.passwordReset(email)`
   - Sends JSON POST to `/api/icvybz/auth/password-reset/`

3. **Django API Endpoint** (`icvybz/api_views.py` - `password_reset_api`):
   - Receives JSON: `{ "email": "user@example.com" }`
   - Uses Django's `PasswordResetForm` to validate email
   - Calls `form.save()` which:
     - Finds user with that email in database
     - Generates unique reset token
     - Renders email templates with user data and token
     - **Sends email via Django's SMTP backend**

4. **Django Email Backend** (SMTP):
   - Connects to `mail.papamail.net:587` (TLS)
   - Authenticates with credentials from settings
   - Sends email **From**: `noreply@justvybz.com`
   - Sends email **To**: User's email address
   - Uses templates:
     - **Subject**: `registration/password_reset_subject.txt`
     - **Body (Plain)**: `registration/password_reset_email.html`
     - **Body (HTML)**: `emails/password_reset_email.html`

5. **Email Delivered**:
   - User receives email in their inbox
   - Email contains link: `https://domain.com/password-reset-confirm/{uidb64}/{token}/`
   - User clicks link → React `PasswordResetConfirm` component loads

### Key Points

✅ **React triggers the request** - React component initiates the password reset  
✅ **Django sends the email** - Django's email backend handles actual email sending  
✅ **Same email system** - Whether request comes from Django form or React app, same email system is used  
✅ **Same email templates** - Both use Django templates (`emails/password_reset_email.html`)  
✅ **Same SMTP server** - Both use `mail.papamail.net:587`  
✅ **Same database** - Both check the same `auth_user` table  

### Email Configuration (Django Settings)

```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'mail.papamail.net'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
DEFAULT_FROM_EMAIL = 'noreply@justvybz.com'
```

### API Endpoint Details

**URL**: `/api/icvybz/auth/password-reset/`  
**Method**: POST  
**Content-Type**: `application/json`  
**Body**: `{ "email": "user@example.com" }`  
**Response**: `{ "message": "If an account exists with this email, a password reset link has been sent." }`

### Email Template Variables

The email template receives:
- `user` - Django User object
- `domain` - Current site domain
- `protocol` - `https` or `http`
- `uidb64` - Base64 encoded user ID
- `token` - Password reset token
- `site_name` - Site name

### Conclusion

**React app → API endpoint → Django PasswordResetForm → Django Email Backend → SMTP Server → User's Email Inbox**

The React app is just the **trigger** - Django handles all the email sending using its configured SMTP backend and email templates.



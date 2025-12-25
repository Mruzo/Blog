# Email Templates Directory

This directory contains all email templates for the Justvybz application. All templates follow a consistent structure and styling.

## Structure

### Base Template
- **`base_email.html`** - Base template that all email templates extend
  - Provides consistent styling (Quicksand font, colors, layout)
  - Includes header, content, and footer blocks
  - Responsive design for mobile devices
  - Standard footer with privacy/terms links

### Email Templates

All email templates follow this naming convention:
- `{purpose}_email.html` - HTML version
- `{purpose}_email.txt` - Plain text version

#### Authentication & Registration
1. **`welcome_email.html/txt`**
   - Sent: On user registration
   - Context: `user`, `site_url`
   - Used by: `snmov.utils.email_notifications.send_registration_email()`

2. **`verification_email.html/txt`**
   - Sent: When user registers (requires verification)
   - Context: `user`, `verification_url`, `site_url`
   - Used by: `snmov.views.verify_email()`, `snmov.views.resend_verification()`

3. **`password_reset_email.html/txt`**
   - Sent: When user requests password reset
   - Context: `user`, `protocol`, `domain`, `uid`, `token`
   - Used by: Django's built-in password reset system

#### E-commerce/Orders
4. **`order_confirmation.html/txt`**
   - Sent: After successful payment
   - Context: `order`, `order_url`, `cancel_url`, `site_url`
   - Used by: `snmov.utils.email_notifications.send_order_confirmation()`
   - Includes: Order details, shipping address, tracking info (if available)

#### Collaboration (Immersive Comics)
5. **`collaboration_invitation.html/txt`**
   - Sent: When inviting user to collaborate on a story
   - Context: `invite`, `site_url`, `frontend_url`, `accept_url`, `decline_url`
   - Used by: `icvybz.models.CollaborationInvite.send_invitation_email()`

6. **`studio_invitation.html/txt`**
   - Sent: When inviting user to collaborate on a studio
   - Context: `invitee_user`, `inviter`, `studio`, `role_display`, `studio_url`, `site_url`
   - Used by: `icvybz.api_views.invite_studio_user()`, `icvybz.api_views.invite_studio_by_email()`

7. **`studio_collaboration_request.html/txt`**
   - Sent: To studio owner when user requests to collaborate
   - Context: `request`, `studio`, `site_url`, `frontend_url`, `accept_url`, `decline_url`
   - Used by: `icvybz.models.StudioCollaborationRequest.send_notification_email()`

## Template Standards

### HTML Templates
- ✅ All extend `base_email.html`
- ✅ Use consistent header structure with `<h1>` title and subtitle
- ✅ Use `{% block header %}`, `{% block content %}`, `{% block footer %}`
- ✅ Follow Quicksand font family (inherited from base)
- ✅ Use consistent button styling (`.button`, `.button-decline`, `.button-dark`)
- ✅ Include proper spacing and responsive design

### Plain Text Templates
- ✅ Provide plain text alternative for all HTML emails
- ✅ Use consistent formatting
- ✅ Include all relevant information
- ✅ Include footer with company info and links

### Common Context Variables
- `site_url` - Base site URL (defaults to `https://www.justvybz.com` in base template)
- `frontend_url` - Frontend React app URL (for collaboration emails)
- `user` - User object (when applicable)
- Footer links use `site_url` with Django URL reversals

## Code References

All email templates are referenced using the `emails/` prefix:
```python
render_to_string('emails/welcome_email.html', context)
render_to_string('emails/welcome_email.txt', context)
```

## Adding New Email Templates

1. Create HTML template extending `base_email.html`:
```django
{% extends "emails/base_email.html" %}

{% block header %}
<div class="header">
    <h1>Email Title</h1>
    <p>Subtitle</p>
</div>
{% endblock %}

{% block content %}
<div class="content">
    <!-- Your content here -->
</div>
{% endblock %}
```

2. Create corresponding `.txt` file with plain text version

3. Add email sending function in appropriate module:
   - E-commerce: `snmov/utils/email_notifications.py`
   - Collaboration: `icvybz/models.py` or `icvybz/api_views.py`
   - Authentication: `snmov/views.py` or `snmov/utils/email_notifications.py`

4. Update this README with the new template information

## Styling Guidelines

- Use classes from `base_email.html`:
  - `.message-box` - For highlighted information
  - `.order-details` - For structured data
  - `.button` - Primary action buttons
  - `.button-decline` - For decline/cancel actions
  - `.button-dark` - Dark variant buttons
  - `.warning` - For warning messages
  - `.text-center` - Center-aligned text
  - `.text-small` - Small text

- Colors:
  - Primary: `#4CAF50` (green)
  - Danger: `#f44336` (red)
  - Dark: `#414042` (dark gray)
  - Warning: `#ffc107` (yellow)

## File Organization

```
templates/emails/
├── base_email.html              # Base template
├── README.md                    # This file
│
├── welcome_email.html           # Registration welcome
├── welcome_email.txt
│
├── verification_email.html      # Email verification
├── verification_email.txt
│
├── password_reset_email.html    # Password reset
├── password_reset_email.txt
│
├── order_confirmation.html      # Order confirmation
├── order_confirmation.txt
│
├── collaboration_invitation.html # Story collaboration invite
├── collaboration_invitation.txt
│
├── studio_invitation.html       # Studio collaboration invite
├── studio_invitation.txt
│
└── studio_collaboration_request.html  # Studio collaboration request
└── studio_collaboration_request.txt
```

## Future Templates Needed

Based on the communications review, these templates should be created:
- `order_status_update.html/txt` - Order status change notifications
- `order_cancellation.html/txt` - Order cancellation confirmation
- `collaboration_accepted.html/txt` - Invitation acceptance notification
- `collaboration_declined.html/txt` - Invitation decline notification
- `collaborator_removed.html/txt` - Collaborator removal notification
- `shipping_label_created.html/txt` - Shipping label with tracking
- `product_availability_confirmation.html/txt` - Product notification confirmation
- `feedback_confirmation.html/txt` - Feedback form confirmation








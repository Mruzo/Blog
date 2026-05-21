from django.contrib.auth import get_user_model
from django.contrib.auth.forms import PasswordResetForm

User = get_user_model()


class PasswordResetFormAllowInactive(PasswordResetForm):
    """Include inactive (unverified) accounts so they can reset and then verify."""

    def get_users(self, email):
        email_field_name = User.get_email_field_name()
        users = User._default_manager.filter(
            **{f'{email_field_name}__iexact': email},
        )
        return (u for u in users if u.has_usable_password())

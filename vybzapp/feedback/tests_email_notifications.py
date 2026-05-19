"""Tests for feedback email notifications."""
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model

from feedback.models import FeedbackTicket
from feedback.email_notifications import send_ticket_admin_notification

User = get_user_model()


@override_settings(
    SUPPORT_EMAIL='justvybz@justvybz.com',
    DEFAULT_FROM_EMAIL='justvybz@justvybz.com',
)
class TicketAdminNotificationTestCase(TestCase):
    def setUp(self):
        self.ticket = FeedbackTicket.objects.create(
            submitted_by_name='API User',
            submitted_by_email='api.user@example.com',
            subject='API bug report',
            message='Something broke when submitting feedback via API.',
            category='bug',
            source='api',
        )

    @patch('feedback.email_notifications.send_mail')
    def test_send_ticket_admin_notification_uses_support_email(self, mock_send_mail):
        result = send_ticket_admin_notification(self.ticket)

        self.assertTrue(result)
        mock_send_mail.assert_called_once()
        call_kwargs = mock_send_mail.call_args.kwargs
        self.assertEqual(call_kwargs['recipient_list'], ['justvybz@justvybz.com'])
        self.assertIn(self.ticket.ticket_number, call_kwargs['subject'])

    @patch('feedback.email_notifications.send_mail', side_effect=Exception('SMTP failed'))
    def test_send_ticket_admin_notification_logs_failure(self, _mock_send_mail):
        result = send_ticket_admin_notification(self.ticket)
        self.assertFalse(result)

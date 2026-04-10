from django.contrib.auth.models import Permission, User
from django.contrib.contenttypes.models import ContentType
from django.test import Client, TestCase
from django.urls import reverse

from vybcheq.models import Security


class VybcheqAdminTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.staff = User.objects.create_user(
            username="staff_vyb",
            password="pw",
            is_staff=True,
        )
        # Admin requires model permissions, not only is_staff.
        ct = ContentType.objects.get_for_model(Security)
        for codename in (
            "add_security",
            "change_security",
            "delete_security",
            "view_security",
        ):
            cls.staff.user_permissions.add(
                Permission.objects.get(content_type=ct, codename=codename)
            )
        cls.regular = User.objects.create_user(username="user_vyb", password="pw", is_staff=False)

    def setUp(self):
        self.client = Client()

    def test_security_changelist_requires_login(self):
        url = reverse("admin:vybcheq_security_changelist")
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 302)
        self.assertIn("login", resp.url)

    def test_security_changelist_forbidden_for_non_staff(self):
        self.client.login(username="user_vyb", password="pw")
        url = reverse("admin:vybcheq_security_changelist")
        resp = self.client.get(url)
        self.assertIn(resp.status_code, (302, 403))

    def test_security_changelist_200_for_staff(self):
        Security.objects.create(symbol="NFLX", exchange="NASDAQ", name="Netflix", currency="USD")
        self.client.login(username="staff_vyb", password="pw")
        url = reverse("admin:vybcheq_security_changelist")
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "NFLX")

    def test_security_add_page_loads_for_staff(self):
        self.client.login(username="staff_vyb", password="pw")
        url = reverse("admin:vybcheq_security_add")
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)

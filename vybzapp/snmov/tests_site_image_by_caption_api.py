"""API tests for GET /api/site-images/by-caption/ (storefront marketing slots).

Run: ``DJANGO_SETTINGS_MODULE=snm.settings.local python manage.py test snmov.tests_site_image_by_caption_api``
"""
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse

from snmov.models import Product, SiteImage


class SiteImageByCaptionApiTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="u1", email="u1@example.com", password="x")
        self.product = Product.objects.create(
            user=self.user,
            title="Ethnic Bliss",
            slug="ethnicbliss",
            description="d",
            price="29.99",
            stock=5,
            available=True,
        )
        self.small = SimpleUploadedFile("slot.jpg", b"\xff\xd8\xff", content_type="image/jpeg")

    def test_sku_scoped_matches_direct_product_fk(self):
        token = "STORE_INSIGHT_COVERED:ethnicbliss"
        SiteImage.objects.create(
            product=self.product,
            image=self.small,
            caption=token,
        )
        url = reverse("api:site-image-by-caption-token")
        r = self.client.get(url, {"token": token, "product_slug": "ethnicbliss"})
        self.assertEqual(r.status_code, 200)
        self.assertIn("image", r.data)
        self.assertTrue(r.data["image"].endswith(".jpg") or "/image/" in r.data["image"])

    def test_sku_scoped_matches_generic_fk_with_uuid_object_id(self):
        token = "STORE_INSIGHT_COVERED:ethnicbliss"
        ct = ContentType.objects.get_for_model(Product)
        SiteImage.objects.create(
            product=None,
            content_type=ct,
            object_id=str(self.product.uuid),
            image=self.small,
            caption=token,
        )
        url = reverse("api:site-image-by-caption-token")
        r = self.client.get(url, {"token": token, "product_slug": "ethnicbliss"})
        self.assertEqual(r.status_code, 200, r.data)
        self.assertIn("image", r.data)

    def test_sku_scoped_matches_generic_fk_with_integer_pk(self):
        token = "STORE_CLOSEUP:ethnicbliss"
        ct = ContentType.objects.get_for_model(Product)
        SiteImage.objects.create(
            product=None,
            content_type=ct,
            object_id=str(self.product.pk),
            image=self.small,
            caption=token,
        )
        url = reverse("api:site-image-by-caption-token")
        r = self.client.get(url, {"token": token, "product_slug": "ethnicbliss"})
        self.assertEqual(r.status_code, 200, r.data)

    def test_global_hero_token_without_product_slug(self):
        token = "STORE_CATALOG_HERO"
        SiteImage.objects.create(
            product=None,
            image=self.small,
            caption=token,
        )
        url = reverse("api:site-image-by-caption-token")
        r = self.client.get(url, {"token": token})
        self.assertEqual(r.status_code, 200, r.data)

    def test_caption_trim_whitespace_match(self):
        token = "STORE_CATALOG_HERO"
        SiteImage.objects.create(
            product=None,
            image=self.small,
            caption="  STORE_CATALOG_HERO  ",
        )
        url = reverse("api:site-image-by-caption-token")
        r = self.client.get(url, {"token": token})
        self.assertEqual(r.status_code, 200, r.data)

from django.test import TestCase
from django.urls import reverse


class StaticViewSitemapTests(TestCase):
    def test_sitemap_resolves_named_static_routes(self):
        for name in ('about', 'privacy', 'terms', 'cookie_policy', 'contact', 'docs'):
            reverse(name)

    def test_sitemap_xml_returns_ok(self):
        response = self.client.get('/sitemap.xml')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, '/cookies/')
        self.assertContains(response, '/contact/')

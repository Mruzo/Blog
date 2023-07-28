from django.contrib.sitemaps import Sitemap
from django.shortcuts import reverse
from .models import Product, Comment


class StaticViewSitemap(Sitemap):
    def items(self):
        return ['about', 'privacy', 'terms', 'cookie', 'contact', ]

    def location(self, item):
        return reverse(item)


class ProductSitemap(Sitemap):
    def items(self):
        return Product.objects.all()


class CommentSitemap(Sitemap):
    def items(self):
        return Comment.objects.all()

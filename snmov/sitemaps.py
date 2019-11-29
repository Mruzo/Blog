from django.contrib.sitemaps import Sitemap
from django.shortcuts import reverse
from .models import Article, Comment


class StaticViewSitemap(Sitemap):
    def items(self):
        return ['about', 'privacy', 'terms', 'cookie', 'contact', ]
    def location(self, item):
        return reverse(item)

class ArticleSitemap(Sitemap):
    def items(self):
        return Article.objects.all()

class CommentSitemap(Sitemap):
    def items(self):
        return Comment.objects.all()

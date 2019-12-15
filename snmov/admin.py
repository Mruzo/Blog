from django.contrib import admin
from .models import Article, Comment, Preference, ReachOut
from tinymce.widgets import TinyMCE
from django.db import models


class ArticleUno(admin.ModelAdmin):
    formfield_overrides = {
        models.TextField: {'widget': TinyMCE()},
    }


# Register your models here.
admin.site.register(Article, ArticleUno)
admin.site.register(Comment)
admin.site.register(Preference)
admin.site.register(ReachOut)

from django.contrib import admin
from .models import Article, Comment, Preference, ReachOut

# Register your models here.
admin.site.register(Article)
admin.site.register(Comment)
admin.site.register(Preference)
admin.site.register(ReachOut)
from django.contrib import admin
from .models import Article, Comment, Preference, ReachOut, About, CraftCategory, Craft, CraftImage
from tinymce.widgets import TinyMCE
from django.db import models
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin

# unregiser provided model admin
admin.site.unregister(User)


class ArticleUno(admin.ModelAdmin):
    formfield_overrides = {
        models.TextField: {'widget': TinyMCE()},
    }
    list_display = ('id', 'title', 'slug', 'publish_date', 'updated', 'likes', 'dislikes')

class AboutUno(admin.ModelAdmin):
    formfield_overrides = {
        models.TextField: {'widget': TinyMCE()},
    }
    list_display = ('id', 'created_at') 


class CraftsAdmin(admin.ModelAdmin):
    formfield_overrides = {
        models.TextField: {'widget': TinyMCE()},
    }
    list_display = ('name', 'category', 'url') 


class CraftsImageAdmin(admin.ModelAdmin):
    list_display = ('id','craft', 'get_craft_category', 'url') 

    def url(self, obj):
        return obj.craft.url
    url.short_description = 'Craft URL'


class ReachOutAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'full_name','email', 'subject') 


class ReachOutAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'full_name','email', 'subject') 


class CommentAdmin(admin.ModelAdmin):
    list_display = ('comment_date', 'user_name', 'get_email', 'get_article','comment_cont', 'approved_comment') 

    



# Register your models here.
admin.site.register(Article, ArticleUno)
admin.site.register(About, AboutUno)
admin.site.register(Comment, CommentAdmin)
admin.site.register(Preference)
admin.site.register(ReachOut, ReachOutAdmin)
admin.site.register(CraftCategory)
admin.site.register(Craft, CraftsAdmin)
admin.site.register(CraftImage, CraftsImageAdmin)


@admin.register(User)
class CustomAdmin(UserAdmin):
    readonly_fields = [
        'date_joined',
    ]

    # custom action to mark multiple user as active
    actions = [
        'activate_users',
    ]

    def activate_users(self, request, queryset):
        cnt = queryset.filter(is_active=False).update(is_active=True)
        self.message_user(request, 'Activated {} user.'.format(cnt))
    activate_users.short_description = 'Activate Users'

    # To hide custom action from users without change permission
    def get_actions(self, request):
        actions = super().get_actions(request)
        if not request.user.has_perm('auth.change_user'):
            del actions['activate_users']
        return actions

    def has_delete_permission(self, request, obj=None):
        return False

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        is_superuser = request.user.is_superuser
        disabled_fields = set()

        # Prevent superusers from granting superuser rights
        if not is_superuser:
            disabled_fields |= {
                'username',
                'is_superuser',
                'user_permissions',
            }

        # Prevent non-superusers from editing their own permissions
        if (
            not is_superuser
            and obj is not None
            and obj == request.user
        ):
            disabled_fields |= {
                'is_staff',
                'is_superuser',
                'groups',
                'user_permissions',
            }

        for f in disabled_fields:
            if f in form.base_fields:
                form.base_fields[f].disabled = True

        return form

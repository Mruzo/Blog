from django.contrib import admin
from .models import Product, Comment, Preference, ReachOut, About, SiteImage, Testimonials, ProductNotification
from tinymce.widgets import TinyMCE
from django.db import models
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin
from django.contrib.contenttypes.models import ContentType

# unregiser provided model admin
admin.site.unregister(User)


class ProductUno(admin.ModelAdmin):
    formfield_overrides = {
        models.TextField: {'widget': TinyMCE()},
    }
    list_display = ['id', 'title', 'available']

class SiteImageAdmin(admin.ModelAdmin):
    list_display = ('id', 'content_type', 'object_id', 'related_product', 'image', 'caption')

    def related_product(self, obj):
        # Check if content_object is None
        if obj.content_object:
            return obj.content_object.title if obj.content_type.model == 'product' else 'N/A'
        else:
            return 'N/A'

    related_product.short_description = 'Related Product'


class AboutUno(admin.ModelAdmin):
    formfield_overrides = {
        models.TextField: {'widget': TinyMCE()},
    }

class NotificationUno(admin.ModelAdmin):
    list_display = ['id','created_at', 'first_name', 'last_name', 'email', 'product','is_active',]

# Register your models here.
admin.site.register(Product, ProductUno)
admin.site.register(Comment)
admin.site.register(Preference)
admin.site.register(ReachOut)
admin.site.register(About, AboutUno)
admin.site.register(SiteImage, SiteImageAdmin)
admin.site.register(Testimonials)
admin.site.register(ProductNotification, NotificationUno)


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
        is_superuser = request.user.is_super
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

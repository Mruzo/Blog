from django.contrib import admin
from .models import Article, Comment, Preference, ReachOut, About, CraftCategory, Craft, CraftImage
from tinymce.widgets import TinyMCE
from django.db import models
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from django.urls import reverse

# unregiser provided model admin
admin.site.unregister(User)


class ArticleUno(admin.ModelAdmin):
    formfield_overrides = {
        models.TextField: {'widget': TinyMCE()},
    }
    list_display = ('id', 'title_link', 'slug', 'publish_date', 'updated', 'likes', 'dislikes')

    def title_link(self, obj):
        # Generate the admin edit URL for the current article
        url = reverse('admin:snmov_article_change', args=[obj.id])
        return format_html('<a href="{}">{}</a>', url, obj.title)

    title_link.short_description = 'Title'  # Column title in the admin list
    title_link.admin_order_field = 'title'  # Make the column sortable

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
    list_display = ('created_at', 'full_name','email', 'subject', 'is_verified')
    list_filter = ('is_verified', 'created_at')
    search_fields = ('full_name', 'email', 'subject', 'content')
    readonly_fields = ('created_at', 'is_verified', 'verification_token')
    ordering = ('-created_at',)
    
    actions = ['delete_selected_contacts']
    
    def delete_selected_contacts(self, request, queryset):
        """Delete selected contact form submissions"""
        count = queryset.count()
        queryset.delete()
        self.message_user(request, f"Successfully deleted {count} contact form submissions.")
    delete_selected_contacts.short_description = "Delete selected contact submissions" 


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

    # custom actions
    actions = [
        'activate_users',
        'export_user_data_gdpr',
        'delete_user_data_gdpr',
    ]

    def activate_users(self, request, queryset):
        cnt = queryset.filter(is_active=False).update(is_active=True)
        self.message_user(request, 'Activated {} user.'.format(cnt))
    activate_users.short_description = 'Activate Users'

    def export_user_data_gdpr(self, request, queryset):
        """Export user data in compliance with GDPR right to access"""
        from django.http import JsonResponse
        from django.shortcuts import render
        
        if len(queryset) != 1:
            self.message_user(request, 'Please select exactly one user to export data for.')
            return
        
        user = queryset.first()
        
        # Collect all user data
        from snmov.models import Comment, ReachOut
        user_data = {
            'user_info': {
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'date_joined': user.date_joined.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'is_active': user.is_active,
                'is_staff': user.is_staff,
            },
            'comments': list(Comment.objects.filter(user_name=user).values(
                'comment_cont', 'comment_date', 'comment_post__title'
            )),
            'contact_submissions': list(ReachOut.objects.filter(email=user.email).values(
                'full_name', 'subject', 'content', 'created_at', 'is_verified'
            )),
        }
        
        # Create a simple HTML view to display the data
        context = {
            'user_data': user_data,
            'user': user,
            'title': f'User Data Export - {user.username}'
        }
        
        return render(request, 'admin/user_data_export.html', context)
    export_user_data_gdpr.short_description = 'Export User Data (GDPR)'

    def delete_user_data_gdpr(self, request, queryset):
        """Delete user data in compliance with GDPR"""
        deleted_count = 0
        
        for user in queryset:
            # Delete comments by this user
            from snmov.models import Comment
            comments_deleted = Comment.objects.filter(user_name=user).delete()[0]
            
            # Delete contact form submissions by this user's email
            from snmov.models import ReachOut
            contacts_deleted = ReachOut.objects.filter(email=user.email).delete()[0]
            
            # Delete the user account
            user.delete()
            
            deleted_count += 1
            
            # Log the deletion
            self.message_user(
                request, 
                f'Deleted user "{user.username}" and {comments_deleted} comments, {contacts_deleted} contact submissions'
            )
        
        self.message_user(request, f'Successfully deleted {deleted_count} users and their associated data.')
    delete_user_data_gdpr.short_description = 'Delete User Data (GDPR)'

    # To hide custom action from users without change permission
    def get_actions(self, request):
        actions = super().get_actions(request)
        if not request.user.has_perm('auth.change_user'):
            del actions['activate_users']
            del actions['delete_user_data_gdpr']
        return actions

    def has_delete_permission(self, request, obj=None):
        return True  # Allow deletion through our custom action

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

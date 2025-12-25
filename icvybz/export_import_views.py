from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView
from .models import Comic


class StoryExportImportView(LoginRequiredMixin, TemplateView):
    """View for story export/import interface"""
    template_name = 'icvybz/story_export_import.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['user_stories'] = Comic.objects.filter(user=self.request.user)
        return context




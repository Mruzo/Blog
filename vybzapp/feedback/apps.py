from django.apps import AppConfig


class FeedbackConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'feedback'
    
    def ready(self):
        """Import signals when app is ready"""
        import feedback.signals  # noqa

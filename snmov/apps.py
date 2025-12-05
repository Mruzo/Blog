from django.apps import AppConfig


class SnmovConfig(AppConfig):
    name = 'snmov'

    def ready(self):
        import snmov.signals  # replace 'accounts' with your app name
        # Register security signal handlers
        from snmov.utils.security import register_security_signals
        register_security_signals()


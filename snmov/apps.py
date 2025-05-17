from django.apps import AppConfig


class SnmovConfig(AppConfig):
    name = 'snmov'

    def ready(self):
        import snmov.signals  # replace 'accounts' with your app name


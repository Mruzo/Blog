from django.apps import AppConfig


class IcvybzConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'icvybz'

    def ready(self):
        from django.db.models.signals import post_delete, post_save

        from .ad_services import invalidate_ad_placement_cache
        from .models import AdPlacement

        def clear_placement_cache(sender, instance, **kwargs):
            invalidate_ad_placement_cache(instance.season_id)

        post_save.connect(clear_placement_cache, sender=AdPlacement)
        post_delete.connect(clear_placement_cache, sender=AdPlacement)

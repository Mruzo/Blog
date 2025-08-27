from django.core.management.base import BaseCommand
from tilf.models import Intersection
import os

class Command(BaseCommand):
    help = 'Updates intersection file paths'

    def add_arguments(self, parser):
        parser.add_argument(
            '--name',
            type=str,
            required=True,
            help='Name of the intersection to update'
        )
        parser.add_argument(
            '--gltf',
            type=str,
            required=True,
            help='Path to the .gltf file'
        )
        parser.add_argument(
            '--usdz',
            type=str,
            help='Path to the .usdz file (optional)'
        )

    def handle(self, *args, **options):
        name = options['name']
        gltf_path = options['gltf']
        usdz_path = options.get('usdz')

        try:
            intersection = Intersection.objects.get(name=name)
        except Intersection.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Intersection "{name}" not found'))
            return

        # Verify GLTF file exists
        if not os.path.exists(gltf_path):
            self.stdout.write(self.style.ERROR(f'GLTF file not found: {gltf_path}'))
            return

        # Update GLTF path
        intersection.model_gltf = gltf_path

        # Update USDZ path if provided
        if usdz_path:
            if not os.path.exists(usdz_path):
                self.stdout.write(self.style.ERROR(f'USDZ file not found: {usdz_path}'))
                return
            intersection.model_usdz = usdz_path

        intersection.save()
        self.stdout.write(self.style.SUCCESS(f'Updated intersection "{name}"')) 
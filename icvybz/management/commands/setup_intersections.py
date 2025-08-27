from django.core.management.base import BaseCommand
from tilf.models import Season, Intersection
import os
from django.conf import settings

class Command(BaseCommand):
    help = 'Sets up intersections and assigns them to seasons'

    def add_arguments(self, parser):
        parser.add_argument(
            '--model-dir',
            type=str,
            default='models',
            help='Directory containing the 3D model files'
        )

    def handle(self, *args, **options):
        model_dir = options['model_dir']
        
        # Create models directory if it doesn't exist
        if not os.path.exists(model_dir):
            os.makedirs(model_dir)
            self.stdout.write(self.style.SUCCESS(f'Created directory: {model_dir}'))

        # Create a default intersection
        default_intersection, created = Intersection.objects.get_or_create(
            name='Default Intersection',
            defaults={
                'model_gltf': os.path.join(model_dir, 'default.gltf'),
                'model_usdz': os.path.join(model_dir, 'default.usdz')
            }
        )

        if created:
            self.stdout.write(self.style.SUCCESS('Created default intersection'))
        else:
            self.stdout.write(self.style.SUCCESS('Default intersection already exists'))

        # Assign intersection to all seasons that don't have one
        seasons = Season.objects.filter(intersection__isnull=True)
        if seasons.exists():
            seasons.update(intersection=default_intersection)
            self.stdout.write(self.style.SUCCESS(f'Assigned default intersection to {seasons.count()} seasons'))
        else:
            self.stdout.write(self.style.SUCCESS('All seasons already have an intersection assigned'))

        # Print instructions for adding model files
        self.stdout.write(self.style.WARNING('\nNext steps:'))
        self.stdout.write('1. Place your .gltf and .usdz files in the models directory')
        self.stdout.write('2. Update the intersection in the Django admin with the correct file paths')
        self.stdout.write('3. Or use the update_intersection command to update the file paths') 
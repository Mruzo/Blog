from django.core.management.base import BaseCommand
import json
import os
from pathlib import Path


class Command(BaseCommand):
    help = 'Delete analytics data for a specific IP address (GDPR compliance)'

    def add_arguments(self, parser):
        parser.add_argument('ip_address', type=str, help='IP address to delete data for')
        parser.add_argument('--environment', type=str, default='production', 
                          choices=['development', 'production'], 
                          help='Environment to delete data from')

    def handle(self, *args, **options):
        ip_address = options['ip_address']
        environment = options['environment']
        
        # Path to analytics files
        logs_dir = Path('icvybz/logs')
        
        # Files to process
        files_to_check = [
            f'share_clicks_{environment}.json',
            f'traffic_sources_{environment}.json'
        ]
        
        deleted_count = 0
        
        for filename in files_to_check:
            file_path = logs_dir / filename
            
            if not file_path.exists():
                self.stdout.write(f"File {filename} does not exist, skipping...")
                continue
                
            try:
                # Read existing data
                with open(file_path, 'r') as f:
                    lines = f.readlines()
                
                # Filter out entries with matching IP
                filtered_lines = []
                for line in lines:
                    if line.strip():  # Skip empty lines
                        try:
                            data = json.loads(line)
                            if data.get('ip_address') != ip_address:
                                filtered_lines.append(line)
                            else:
                                deleted_count += 1
                        except json.JSONDecodeError:
                            # Keep malformed lines
                            filtered_lines.append(line)
                
                # Write filtered data back
                with open(file_path, 'w') as f:
                    f.writelines(filtered_lines)
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Deleted {deleted_count} entries for IP {ip_address} from {filename}"
                    )
                )
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"Error processing {filename}: {str(e)}")
                )
        
        if deleted_count == 0:
            self.stdout.write(
                self.style.WARNING(f"No data found for IP address {ip_address}")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully deleted {deleted_count} total entries for IP {ip_address}"
                )
            )

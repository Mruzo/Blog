from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()
import json
import os
from pathlib import Path


class Command(BaseCommand):
    help = 'Delete analytics data for a specific email address (GDPR compliance)'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email address to delete data for')
        parser.add_argument('--environment', type=str, default='production', 
                          choices=['development', 'production'], 
                          help='Environment to delete data from')

    def handle(self, *args, **options):
        email = options['email']
        environment = options['environment']
        
        # First, find the user by email
        try:
            user = User.objects.get(email=email)
            self.stdout.write(f"Found user: {user.username} ({user.email})")
        except User.DoesNotExist:
            self.stdout.write(
                self.style.WARNING(f"No user found with email: {email}")
            )
            return
        
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
                
                # Filter out entries with matching email (for share clicks)
                # Note: Traffic sources are IP-based, so we can't delete by email
                filtered_lines = []
                for line in lines:
                    if line.strip():  # Skip empty lines
                        try:
                            data = json.loads(line)
                            # For share clicks, we might have user info
                            # For traffic sources, we can't match by email
                            if filename.startswith('share_clicks'):
                                # Check if this entry has user info that matches
                                if 'user_email' in data and data['user_email'] == email:
                                    deleted_count += 1
                                    continue  # Skip this entry
                            filtered_lines.append(line)
                        except json.JSONDecodeError:
                            # Keep malformed lines
                            filtered_lines.append(line)
                
                # Write filtered data back
                with open(file_path, 'w') as f:
                    f.writelines(filtered_lines)
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Processed {filename} for user {user.username}"
                    )
                )
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"Error processing {filename}: {str(e)}")
                )
        
        # Also delete user data from database
        from snmov.models import Comment, ReachOut
        
        comments_deleted = Comment.objects.filter(user_name=user).delete()[0]
        contacts_deleted = ReachOut.objects.filter(email=email).delete()[0]
        
        self.stdout.write(
            self.style.SUCCESS(
                f"Deleted {comments_deleted} comments and {contacts_deleted} contact submissions for {email}"
            )
        )
        
        # Ask for confirmation before deleting user
        confirm = input(f"Delete user account for {email}? (yes/no): ")
        if confirm.lower() == 'yes':
            user.delete()
            self.stdout.write(
                self.style.SUCCESS(f"Successfully deleted user account for {email}")
            )
        else:
            self.stdout.write(
                self.style.WARNING(f"User account for {email} was not deleted")
            )
        
        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully processed GDPR deletion request for {email}"
            )
        )

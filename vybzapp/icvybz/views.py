from django.shortcuts import render, get_object_or_404, redirect
from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView
from django.contrib.admin.views.decorators import staff_member_required
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import Comic, Season, Episode, Dialogue, POV, ComicComment, TrafficSource, Studio, StudioCollaborator, StoryCollaborator, AudioTrack, DialogueAudio, EpisodeAudio, SceneAudio
from django.utils.safestring import mark_safe
from .forms import ComicCommentForm, StoryForm, SeasonForm, EpisodeForm, CharacterForm, DialogueForm
import json
import os
import hashlib
from datetime import datetime
import re
from django.contrib.auth.mixins import LoginRequiredMixin
from django.db.models import Count, Exists, OuterRef, Q, Sum
from django.urls import reverse
from .models import Character, Intersection
from django.utils import timezone
from django.contrib.sites.models import Site
from django.conf import settings


class ComicView(ListView):
    """Stories list - Now serves React instead of Django template"""
    model = Comic
    template_name = None  # Serve React instead
    context_object_name = 'comics'
    
    def get(self, request, *args, **kwargs):
        """Serve React index.html for stories list"""
        import os
        from django.conf import settings
        from django.http import HttpResponse
        
        index_path = os.path.join(settings.BASE_DIR, 'frontend', 'build', 'index.html')
        try:
            with open(index_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return HttpResponse(content, content_type='text/html')
        except FileNotFoundError:
            return HttpResponse('React app not found. Please build the frontend.', status=404)


class SeasonDetailView(DetailView):
    model = Season
    template_name = 'icvybz/season_detail.html'
    context_object_name = 'season'


class EpisodeDetailView(DetailView):
    model = Episode
    template_name = 'icvybz/episode_detail.html'
    context_object_name = 'episode'

    def get_object(self):
        season_id = self.kwargs.get('season_id')
        return get_object_or_404(Episode, pk=self.kwargs['pk'], season_id=season_id, is_published=True)
    
    def get(self, request, *args, **kwargs):
        episode = self.get_object()
        
        # Increment view count (only for published episodes)
        if episode.is_published:
            episode.increment_view()
            # Log traffic source
            log_traffic_source(request, episode)
            # Clear cache for episodes list to reflect updated view count
            from django.core.cache import cache
            season_id = episode.season.id
            cache.delete(f"episodes_public_{season_id}")
            # Also clear private cache for story owner
            if episode.season.comic.user:
                cache.delete(f"episodes_{season_id}_{episode.season.comic.user.id}")
                # Clear user stories cache so total_views updates in My Studio
                cache.delete(f"user_comics_{episode.season.comic.user.id}")
        
        return super().get(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        episode = self.object

        # Get all dialogues for the episode, ordered by their 'order' field
        dialogues = Dialogue.objects.filter(episode=episode).order_by('order')

        # Get the model files directly from the season with safety checks
        try:
            context['model_gltf'] = episode.season.model_gltf.url if episode.season.model_gltf else None
            context['model_usdz'] = episode.season.model_usdz.url if episode.season.model_usdz else None
        except Exception:
            context['model_gltf'] = None
            context['model_usdz'] = None

        # Prepare dialogues data with safety checks
        dialogues_data = []
        for dialogue in dialogues:
            try:
                dialogues_data.append({
                    'dialogue_id': dialogue.id,
                    'character': dialogue.pov.character.name if dialogue.pov and dialogue.pov.character else 'Unknown',
                    'camera_orbit': dialogue.camera_orbit or '0deg 75deg 3m',
                    'camera_target': dialogue.camera_target or '0m 1.6m 0m',
                    'field_of_view': dialogue.field_of_view or 45.0,
                    'zoom_speed': dialogue.zoom_speed or 1.0,
                    'rotation': dialogue.rotation or '0deg 0deg 0deg',
                    'head_x': dialogue.pov.head_x if dialogue.pov else 0,
                    'head_y': dialogue.pov.head_y if dialogue.pov else 1.6,
                    'head_z': dialogue.pov.head_z if dialogue.pov else 0,
                    'text': dialogue.text or 'No dialogue text available'
                })
            except Exception as e:
                # Skip problematic dialogues
                continue
        
        context['dialogues_data'] = dialogues_data
        
        # Add episode summary and next episode info
        context['episode_summary'] = episode.summary
        context['summary_camera_orbit'] = episode.summary_camera_orbit
        context['summary_field_of_view'] = episode.summary_field_of_view
        
        # Find next episode in the same season
        next_episode = Episode.objects.filter(
            season=episode.season,
            episode_number__gt=episode.episode_number,
            is_published=True
        ).order_by('episode_number').first()
        
        context['next_episode'] = next_episode
        
        # Add comment form and comments
        context['comment_form'] = ComicCommentForm()
        context['comments'] = episode.comments.filter(approved_comment=True)
        
        return context

    def post(self, request, *args, **kwargs):
        self.object = self.get_object()
        comment_form = ComicCommentForm(request.POST)
        
        if comment_form.is_valid() and request.user.is_authenticated:
            comment = comment_form.save(commit=False)
            comment.user_name = request.user
            comment.episode = self.object
            comment.save()
            return redirect('immersivecomics:episode_detail', season_id=self.object.season.id, pk=self.object.pk)
            
        return self.render_to_response(self.get_context_data(comment_form=comment_form))

def delete_comment(request, season_id, pk, comment_id):
    episode = get_object_or_404(Episode, pk=pk, season_id=season_id, is_published=True)
    comment = get_object_or_404(ComicComment, pk=comment_id, episode=episode)
    
    if request.user.is_authenticated and request.user == comment.user_name:
        comment.delete()
    
    return redirect('immersivecomics:episode_detail', season_id=season_id, pk=pk)


@method_decorator(staff_member_required, name='dispatch')
class EpisodePreviewView(DetailView):
    model = Episode
    template_name = 'icvybz/episode_preview.html'
    context_object_name = 'episode'

    def get_object(self):
        season_id = self.kwargs.get('season_id')
        # Allow access to unpublished episodes for preview
        return get_object_or_404(Episode, pk=self.kwargs['pk'], season_id=season_id)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        episode = self.object

        # Get all dialogues for the episode, ordered by their 'order' field
        dialogues = Dialogue.objects.filter(episode=episode).order_by('order')

        # Get the model files directly from the season with safety checks
        try:
            context['model_gltf'] = episode.season.model_gltf.url if episode.season.model_gltf else None
            context['model_usdz'] = episode.season.model_usdz.url if episode.season.model_usdz else None
        except Exception:
            context['model_gltf'] = None
            context['model_usdz'] = None

        # Prepare dialogues data with safety checks
        dialogues_data = []
        for dialogue in dialogues:
            try:
                dialogues_data.append({
                    'dialogue_id': dialogue.id,
                    'character': dialogue.pov.character.name if dialogue.pov and dialogue.pov.character else 'Unknown',
                    'camera_orbit': dialogue.camera_orbit or '0deg 75deg 3m',
                    'camera_target': dialogue.camera_target or '0m 1.6m 0m',
                    'field_of_view': dialogue.field_of_view or 45.0,
                    'zoom_speed': dialogue.zoom_speed or 1.0,
                    'rotation': dialogue.rotation or '0deg 0deg 0deg',
                    'head_x': dialogue.pov.head_x if dialogue.pov else 0,
                    'head_y': dialogue.pov.head_y if dialogue.pov else 1.6,
                    'head_z': dialogue.pov.head_z if dialogue.pov else 0,
                    'text': dialogue.text or 'No dialogue text available'
                })
            except Exception as e:
                # Skip problematic dialogues
                continue
        
        context['dialogues_data'] = dialogues_data
        
        # Add episode summary and next episode info
        context['episode_summary'] = episode.summary
        context['summary_camera_orbit'] = episode.summary_camera_orbit
        context['summary_field_of_view'] = episode.summary_field_of_view
        
        # Find next episode in the same season (allow unpublished for preview)
        next_episode = Episode.objects.filter(
            season=episode.season,
            episode_number__gt=episode.episode_number
        ).order_by('episode_number').first()
        
        context['next_episode'] = next_episode
        
        # Add comment form and comments (but don't allow actual commenting in preview)
        context['comment_form'] = ComicCommentForm()
        context['comments'] = episode.comments.filter(approved_comment=True)
        context['is_preview'] = True  # Flag to indicate this is a preview
        
        return context


@csrf_exempt
@staff_member_required
@require_http_methods(["POST"])
def update_camera_data(request, dialogue_id):
    """
    API endpoint to update camera data for a dialogue via AJAX
    """
    try:
        # Parse JSON data from request
        data = json.loads(request.body)
        
        # Get the dialogue object
        dialogue = get_object_or_404(Dialogue, pk=dialogue_id)
        
        # Update camera fields if provided
        if 'camera_orbit' in data:
            dialogue.camera_orbit = data['camera_orbit']
        if 'camera_target' in data:
            dialogue.camera_target = data['camera_target']
        if 'field_of_view' in data:
            dialogue.field_of_view = float(data['field_of_view'])
        if 'zoom_speed' in data:
            dialogue.zoom_speed = float(data['zoom_speed'])
        if 'rotation' in data:
            dialogue.rotation = data['rotation']
        
        # Save the dialogue
        dialogue.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Camera data updated successfully',
            'dialogue_id': dialogue_id
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': 'Invalid JSON data'
        }, status=400)
    except ValueError as e:
        return JsonResponse({
            'success': False,
            'message': f'Invalid data format: {str(e)}'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error updating camera data: {str(e)}'
        }, status=500)


@method_decorator(staff_member_required, name='dispatch')
class EpisodeAnalyticsView(ListView):
    model = Episode
    template_name = 'icvybz/episode_analytics.html'
    context_object_name = 'episodes'
    
    def get_queryset(self):
        return Episode.objects.select_related('season').filter(is_published=True).order_by('-view_count')
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        episodes = context['episodes']
        
        # Add seasons list for filtering
        context['seasons'] = Season.objects.all().order_by('season_number')
        context['selected_season'] = None
        
        context['total_views'] = sum(ep.view_count for ep in episodes)
        context['avg_views'] = context['total_views'] / episodes.count() if episodes else 0
        context['most_popular'] = episodes[:5]
        context['recent_views'] = Episode.objects.filter(is_published=True).order_by('-last_viewed')[:5]
        
        # Get traffic analytics from existing data
        traffic_analytics = get_traffic_analytics_from_logs()
        context.update(traffic_analytics)
        
        # Get share analytics from logs
        share_analytics = get_share_analytics_from_logs()
        context.update(share_analytics)
        
        # Get file size information
        file_size_info = get_file_size_info()
        context.update(file_size_info)
        
        return context
    
    def get_traffic_source_stats(self):
        """Get traffic source statistics"""
        from django.db.models import Count
        return TrafficSource.objects.values('source').annotate(
            count=Count('id')
        ).order_by('-count')
    
    def get_top_referrers(self):
        """Get top referring domains"""
        from django.db.models import Count
        return TrafficSource.objects.exclude(
            referrer=''
        ).values('referrer').annotate(
            count=Count('id')
        ).order_by('-count')[:10]


@method_decorator(staff_member_required, name='dispatch')
class SeasonAnalyticsView(DetailView):
    model = Season
    template_name = 'icvybz/episode_analytics.html'  # Use the same template
    context_object_name = 'season'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        season = self.object
        episodes = season.episodes.select_related('season').filter(is_published=True).order_by('-view_count')
        
        # Add seasons list for filtering
        context['seasons'] = Season.objects.all().order_by('season_number')
        context['selected_season'] = season
        
        # Use the same context structure as EpisodeAnalyticsView
        context['episodes'] = episodes
        context['total_views'] = sum(ep.view_count for ep in episodes)
        context['avg_views'] = context['total_views'] / episodes.count() if episodes else 0
        context['most_popular'] = episodes[:5]
        context['recent_views'] = episodes.order_by('-last_viewed')[:5]
        
        return context


def track_traffic_source(request, episode):
    """Track where traffic is coming from"""
    referrer = request.META.get('HTTP_REFERER', '')
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    ip_address = get_client_ip(request)
    
    # Determine source based on referrer
    source = 'direct'
    if referrer:
        if 'google' in referrer.lower():
            source = 'google'
        elif any(social in referrer.lower() for social in ['facebook', 'twitter', 'instagram', 'linkedin', 'reddit']):
            source = 'social'
        elif 'mail' in referrer.lower() or 'email' in referrer.lower():
            source = 'email'
        else:
            source = 'referral'
    
    # Create traffic source record
    TrafficSource.objects.create(
        episode=episode,
        source=source,
        referrer=referrer,
        user_agent=user_agent,
        ip_address=ip_address
    )

def log_traffic_source(request, episode):
    """Log traffic source to a JSON file with platform details and environment detection"""
    environment = detect_environment(request)
    traffic_data = analyze_traffic_sources(request)
    
    log_entry = {
        'timestamp': datetime.now().isoformat(),
        'environment': environment,
        'episode_id': episode.id,
        'episode_title': episode.title,
        'season_id': episode.season.id,
        'season_title': episode.season.title,
        'source': traffic_data['source'],
        'platform': traffic_data['platform'],
        'referrer': traffic_data['referrer'],
        'user_agent': traffic_data['user_agent'][:200],  # Truncate long user agents
        'ip_address': traffic_data['ip_address'],
        'host': request.get_host()
    }
    
    # Create logs directory if it doesn't exist
    logs_dir = os.path.join(os.path.dirname(__file__), 'logs')
    os.makedirs(logs_dir, exist_ok=True)
    
    # Append to environment-specific traffic log file
    log_file = os.path.join(logs_dir, f'traffic_sources_{environment}.json')
    try:
        with open(log_file, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
    except Exception as e:
        print(f"Error logging traffic: {e}")

def get_client_ip(request):
    """Get client IP address"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def analyze_traffic_sources(request):
    """Analyze traffic sources from request data with comprehensive referrer detection"""
    referrer = request.META.get('HTTP_REFERER', '')
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    
    # Determine source based on referrer
    source = 'direct'
    platform = 'none'
    referrer_domain = 'none'
    
    if referrer:
        referrer_lower = referrer.lower()
        
        # Extract domain for referral tracking
        try:
            from urllib.parse import urlparse
            parsed_url = urlparse(referrer)
            referrer_domain = parsed_url.netloc.replace('www.', '')
        except:
            referrer_domain = 'unknown'
        
        # Search engines
        search_engines = {
            'google': ['google.com', 'google.co.uk', 'google.ca'],
            'bing': ['bing.com', 'bing.co.uk'],
            'yahoo': ['yahoo.com', 'search.yahoo.com'],
            'duckduckgo': ['duckduckgo.com', 'ddg.gg'],
            'baidu': ['baidu.com'],
            'yandex': ['yandex.com', 'yandex.ru']
        }
        
        for engine, domains in search_engines.items():
            if any(domain in referrer_lower for domain in domains):
                source = 'search'
                platform = engine
                break
        
        # Social media platforms
        social_platforms = {
            'facebook': ['facebook.com', 'fb.com', 'm.facebook.com', 'l.facebook.com'],
            'twitter': ['twitter.com', 'x.com', 'mobile.twitter.com', 't.co'],
            'instagram': ['instagram.com', 'm.instagram.com'],
            'linkedin': ['linkedin.com', 'www.linkedin.com'],
            'reddit': ['reddit.com', 'old.reddit.com', 'm.reddit.com', 'redd.it'],
            'tiktok': ['tiktok.com', 'vm.tiktok.com'],
            'youtube': ['youtube.com', 'youtu.be', 'm.youtube.com'],
            'pinterest': ['pinterest.com', 'pin.it'],
            'snapchat': ['snapchat.com'],
            'discord': ['discord.com', 'discord.gg'],
            'telegram': ['telegram.org', 't.me'],
            'whatsapp': ['whatsapp.com', 'wa.me'],
            'tumblr': ['tumblr.com'],
            'twitch': ['twitch.tv'],
            'medium': ['medium.com'],
            'substack': ['substack.com']
        }
        
        for platform_name, domains in social_platforms.items():
            if any(domain in referrer_lower for domain in domains):
                source = 'social'
                platform = platform_name
                break
        
        # Email platforms
        email_platforms = {
            'gmail': ['mail.google.com', 'gmail.com'],
            'outlook': ['outlook.com', 'outlook.live.com', 'hotmail.com'],
            'yahoo_mail': ['mail.yahoo.com', 'yahoo.com/mail'],
            'apple_mail': ['mail.apple.com'],
            'protonmail': ['protonmail.com'],
            'other_email': ['mail.', 'email.', 'newsletter']
        }
        
        for email_platform, domains in email_platforms.items():
            if any(domain in referrer_lower for domain in domains):
                source = 'email'
                platform = email_platform
                break
        
        # Content platforms
        content_platforms = {
            'medium': ['medium.com'],
            'substack': ['substack.com'],
            'newsletter': ['newsletter', 'mailchimp', 'convertkit', 'substack']
        }
        
        for content_platform, domains in content_platforms.items():
            if any(domain in referrer_lower for domain in domains):
                source = 'content'
                platform = content_platform
                break
        
        # If no specific platform found, it's a referral
        if source == 'direct':
            source = 'referral'
            platform = referrer_domain
    
    return {
        'source': source,
        'platform': platform,
        'referrer': referrer,
        'referrer_domain': referrer_domain,
        'user_agent': user_agent,
        'ip_address': get_client_ip(request)
    }

def get_traffic_analytics_from_logs():
    """Get traffic analytics from the log files with environment breakdown"""
    logs_dir = os.path.join(os.path.dirname(__file__), 'logs')
    
    all_entries = []
    dev_entries = []
    prod_entries = []
    
    # Read development data
    dev_file = os.path.join(logs_dir, 'traffic_sources_development.json')
    if os.path.exists(dev_file):
        try:
            with open(dev_file, 'r') as f:
                for line in f:
                    try:
                        entry = json.loads(line.strip())
                        dev_entries.append(entry)
                        all_entries.append(entry)
                    except json.JSONDecodeError:
                        continue
        except FileNotFoundError:
            pass
    
    # Read production data
    prod_file = os.path.join(logs_dir, 'traffic_sources_production.json')
    if os.path.exists(prod_file):
        try:
            with open(prod_file, 'r') as f:
                for line in f:
                    try:
                        entry = json.loads(line.strip())
                        prod_entries.append(entry)
                        all_entries.append(entry)
                    except json.JSONDecodeError:
                        continue
        except FileNotFoundError:
            pass
    
    traffic_sources = {}
    platforms = {}
    referrers = {}
    dev_ips = set()
    prod_ips = set()
    
    for entry in all_entries:
        source = entry.get('source', 'unknown')
        platform = entry.get('platform', 'unknown')
        referrer = entry.get('referrer', '')
        ip = entry.get('ip_address', '')
        environment = entry.get('environment', 'unknown')
        
        # Count sources
        traffic_sources[source] = traffic_sources.get(source, 0) + 1
        
        # Count platforms
        platforms[platform] = platforms.get(platform, 0) + 1
        
        # Count referrers
        if referrer:
            referrers[referrer] = referrers.get(referrer, 0) + 1
        
        # Track IPs by environment
        if ip:
            if environment == 'development':
                dev_ips.add(ip)
            elif environment == 'production':
                prod_ips.add(ip)
    
    return {
        'traffic_sources': [{'source': k, 'count': v} for k, v in traffic_sources.items()],
        'platforms': [{'platform': k, 'count': v} for k, v in sorted(platforms.items(), key=lambda x: x[1], reverse=True)],
        'top_referrers': [{'referrer': k, 'count': v} for k, v in sorted(referrers.items(), key=lambda x: x[1], reverse=True)[:10]],
        'total_episodes': Episode.objects.filter(is_published=True).count(),
        'total_views': sum(ep.view_count for ep in Episode.objects.filter(is_published=True)),
        'most_viewed': Episode.objects.filter(is_published=True).order_by('-view_count')[:5],
        'recent_activity': Episode.objects.filter(is_published=True).order_by('-last_viewed')[:5],
        'dev_views': len(dev_entries),
        'prod_views': len(prod_entries),
        'dev_unique_ips': len(dev_ips),
        'prod_unique_ips': len(prod_ips)
    }


def detect_environment(request):
    """Detect if we're in development or production environment"""
    # Check for development indicators
    dev_indicators = [
        request.get_host() in ['127.0.0.1:8000', 'localhost:8000', 'localhost:8001'],
        '127.0.0.1' in request.get_host(),
        'localhost' in request.get_host(),
        request.META.get('SERVER_NAME') in ['127.0.0.1', 'localhost'],
        'DEBUG' in request.META.get('HTTP_HOST', '').upper()
    ]
    
    return 'development' if any(dev_indicators) else 'production'

def log_share_click(request, platform, content_id, content_type='episode'):
    """Log share button clicks to JSON file with environment detection"""
    environment = detect_environment(request)
    log_dir = os.path.join(os.path.dirname(__file__), 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    # Use environment-specific log files
    log_file = os.path.join(log_dir, f'share_clicks_{environment}.json')
    
    # Load existing data or create new
    if os.path.exists(log_file):
        try:
            with open(log_file, 'r') as f:
                data = json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            data = []
    else:
        data = []
    
    # Add new share click entry with environment info
    share_data = {
        'timestamp': datetime.now().isoformat(),
        'environment': environment,
        'platform': platform,
        'content_type': content_type,
        'episode_id': content_id if content_type == 'episode' else None,
        'story_id': content_id if content_type == 'story' else None,
        'ip_address': get_client_ip(request),
        'user_agent': request.META.get('HTTP_USER_AGENT', ''),
        'referrer': request.META.get('HTTP_REFERER', ''),
        'host': request.get_host()
    }
    
    data.append(share_data)
    
    # Save back to file
    try:
        with open(log_file, 'w') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving share click data: {e}")


def get_file_size_info():
    """Get file size information for all log files"""
    logs_dir = os.path.join(os.path.dirname(__file__), 'logs')
    file_info = {}
    
    # List of all possible log files
    log_files = [
        'share_clicks_development.json',
        'share_clicks_production.json', 
        'traffic_sources_development.json',
        'traffic_sources_production.json',
        # Legacy files (for backward compatibility)
        'share_clicks.json',
        'traffic_sources.json'
    ]
    
    total_size = 0
    for filename in log_files:
        file_path = os.path.join(logs_dir, filename)
        if os.path.exists(file_path):
            size_bytes = os.path.getsize(file_path)
            size_kb = size_bytes / 1024
            size_mb = size_kb / 1024
            file_info[filename] = {
                'size_bytes': size_bytes,
                'size_kb': round(size_kb, 2),
                'size_mb': round(size_mb, 3),
                'exists': True
            }
            total_size += size_bytes
        else:
            file_info[filename] = {
                'size_bytes': 0,
                'size_kb': 0,
                'size_mb': 0,
                'exists': False
            }
    
    return {
        'file_info': file_info,
        'total_size_bytes': total_size,
        'total_size_kb': round(total_size / 1024, 2),
        'total_size_mb': round(total_size / (1024 * 1024), 3)
    }

def get_share_analytics_from_logs():
    """Read share click data from JSON log files and return analytics with environment breakdown"""
    logs_dir = os.path.join(os.path.dirname(__file__), 'logs')
    
    all_data = []
    dev_data = []
    prod_data = []
    
    # Read development data
    dev_file = os.path.join(logs_dir, 'share_clicks_development.json')
    if os.path.exists(dev_file):
        try:
            with open(dev_file, 'r') as f:
                dev_data = json.load(f)
                all_data.extend(dev_data)
        except (json.JSONDecodeError, FileNotFoundError):
            pass
    
    # Read production data
    prod_file = os.path.join(logs_dir, 'share_clicks_production.json')
    if os.path.exists(prod_file):
        try:
            with open(prod_file, 'r') as f:
                prod_data = json.load(f)
                all_data.extend(prod_data)
        except (json.JSONDecodeError, FileNotFoundError):
            pass
    
    platforms = {}
    episodes = {}
    ips = set()
    dev_ips = set()
    prod_ips = set()
    
    for entry in all_data:
        platform = entry.get('platform', 'unknown')
        episode_id = entry.get('episode_id', 'unknown')
        ip = entry.get('ip_address', '')
        environment = entry.get('environment', 'unknown')
        
        platforms[platform] = platforms.get(platform, 0) + 1
        episodes[episode_id] = episodes.get(episode_id, 0) + 1
        if ip:
            ips.add(ip)
            if environment == 'development':
                dev_ips.add(ip)
            elif environment == 'production':
                prod_ips.add(ip)
    
    return {
        'platforms': [{'platform': k, 'count': v} for k, v in sorted(platforms.items(), key=lambda x: x[1], reverse=True)],
        'episodes': [{'episode_id': k, 'count': v} for k, v in sorted(episodes.items(), key=lambda x: x[1], reverse=True)],
        'total_shares': len(all_data),
        'unique_ips': len(ips),
        'dev_shares': len(dev_data),
        'prod_shares': len(prod_data),
        'dev_unique_ips': len(dev_ips),
        'prod_unique_ips': len(prod_ips)
    }


@csrf_exempt
@require_http_methods(["POST"])
def track_share_click(request):
    """API endpoint to track share button clicks"""
    try:
        data = json.loads(request.body)
        platform = data.get('platform')
        episode_id = data.get('episode_id')
        story_id = data.get('story_id')
        
        if not platform:
            return JsonResponse({'error': 'Missing platform'}, status=400)
        
        # Accept either episode_id or story_id
        if not episode_id and not story_id:
            return JsonResponse({'error': 'Missing episode_id or story_id'}, status=400)
        
        # Use episode_id if provided, otherwise use story_id (for story-level tracking)
        content_id = episode_id if episode_id else story_id
        content_type = 'episode' if episode_id else 'story'
        log_share_click(request, platform, content_id, content_type)
        return JsonResponse({'success': True})
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


class UserDashboardView(LoginRequiredMixin, ListView):
    """User dashboard showing their own content"""
    model = Comic
    template_name = 'icvybz/user_dashboard.html'
    context_object_name = 'comics'
    
    def get_queryset(self):
        return Comic.objects.filter(user=self.request.user)
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.request.user
        
        # Get user's content counts
        context['characters'] = Character.objects.filter(user=user)
        context['intersections'] = Intersection.objects.filter(user=user)
        context['total_episodes'] = Episode.objects.filter(season__comic__user=user).count()
        context['total_comics'] = Comic.objects.filter(user=user).count()
        context['public_comics'] = Comic.objects.filter(user=user, is_public=True).count()
        context['pending_comics'] = Comic.objects.filter(user=user, moderation_status='pending').count()
        
        # Get or create user's studio
        studio = Studio.objects.filter(owner=user).order_by('created_at', 'id').first()
        context['studio'] = studio
        context['studio_collaborators'] = studio.collaborators.filter(is_active=True).count() if studio else 0
        
        # Get user's audio tracks
        context['audio_tracks'] = AudioTrack.objects.filter(created_by=user).count()
        
        # Get collaboration stats
        context['collaborated_stories'] = Comic.objects.filter(
            collaborators__user=user
        ).distinct().count()
        
        return context


class StoryCreateView(LoginRequiredMixin, CreateView):
    model = Comic
    form_class = StoryForm
    template_name = 'icvybz/story_create.html'
    
    def form_valid(self, form):
        form.instance.user = self.request.user
        form.instance.studio = Studio.objects.filter(owner=self.request.user).order_by('created_at', 'id').first()
        form.instance.is_public = False  # Start as private
        form.instance.moderation_status = 'pending'
        return super().form_valid(form)
    
    def get_success_url(self):
        return reverse('immersivecomics:story_manage', kwargs={'pk': self.object.pk})


class StoryEditView(LoginRequiredMixin, UpdateView):
    model = Comic
    form_class = StoryForm
    template_name = 'icvybz/story_edit.html'
    
    def get_queryset(self):
        return Comic.objects.filter(user=self.request.user)
    
    def get_success_url(self):
        return reverse('immersivecomics:story_manage', kwargs={'pk': self.object.pk})


class StoryManageView(LoginRequiredMixin, DetailView):
    model = Comic
    template_name = 'icvybz/story_manage.html'
    context_object_name = 'story'
    
    def get_queryset(self):
        return Comic.objects.filter(user=self.request.user)
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        story = self.object
        
        # Get seasons with episode counts
        seasons = story.seasons.all().annotate(
            episode_count=Count('episodes'),
            published_episode_count=Count('episodes', filter=Q(episodes__is_published=True))
        )
        
        context['seasons'] = seasons
        context['total_episodes'] = sum(season.episode_count for season in seasons)
        context['published_episodes'] = sum(season.published_episode_count for season in seasons)
        
        return context


class StoryDeleteView(LoginRequiredMixin, DeleteView):
    model = Comic
    template_name = 'icvybz/story_confirm_delete.html'
    
    def get_queryset(self):
        return Comic.objects.filter(user=self.request.user)
    
    def get_success_url(self):
        return reverse('immersivecomics:user_dashboard')


class SeasonCreateView(LoginRequiredMixin, CreateView):
    model = Season
    form_class = SeasonForm
    template_name = 'icvybz/season_create.html'
    
    def dispatch(self, request, *args, **kwargs):
        self.story = get_object_or_404(Comic, pk=kwargs['story_id'], user=request.user)
        return super().dispatch(request, *args, **kwargs)
    
    def form_valid(self, form):
        form.instance.comic = self.story
        return super().form_valid(form)
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['story'] = self.story
        return context
    
    def get_success_url(self):
        return reverse('immersivecomics:story_manage', kwargs={'pk': self.story.pk})


class SeasonEditView(LoginRequiredMixin, UpdateView):
    model = Season
    form_class = SeasonForm
    template_name = 'icvybz/season_edit.html'
    
    def get_queryset(self):
        return Season.objects.filter(comic__user=self.request.user)
    
    def get_success_url(self):
        return reverse('immersivecomics:story_manage', kwargs={'pk': self.object.comic.pk})


class EpisodeCreateView(LoginRequiredMixin, CreateView):
    model = Episode
    form_class = EpisodeForm
    template_name = 'icvybz/episode_create.html'
    
    def dispatch(self, request, *args, **kwargs):
        self.season = get_object_or_404(Season, pk=kwargs['season_id'], comic__user=request.user)
        return super().dispatch(request, *args, **kwargs)
    
    def form_valid(self, form):
        form.instance.season = self.season
        return super().form_valid(form)
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['season'] = self.season
        context['story'] = self.season.comic
        return context
    
    def get_success_url(self):
        return reverse('immersivecomics:episode_manage', kwargs={'pk': self.object.pk})


class EpisodeEditView(LoginRequiredMixin, UpdateView):
    model = Episode
    form_class = EpisodeForm
    template_name = 'icvybz/episode_edit.html'
    
    def get_queryset(self):
        return Episode.objects.filter(season__comic__user=self.request.user)
    
    def get_success_url(self):
        return reverse('immersivecomics:episode_manage', kwargs={'pk': self.object.pk})


class EpisodeManageView(LoginRequiredMixin, DetailView):
    model = Episode
    template_name = 'icvybz/episode_manage.html'
    context_object_name = 'episode'
    
    def get_queryset(self):
        return Episode.objects.filter(season__comic__user=self.request.user)
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        episode = self.object
        
        # Get dialogues ordered by order field
        dialogues = episode.dialogues.all().order_by('order')
        context['dialogues'] = dialogues
        
        # Get characters for this story
        context['characters'] = Character.objects.filter(
            Q(user=self.request.user) | Q(is_public=True)
        ).distinct()
        
        return context


class CharacterCreateView(LoginRequiredMixin, CreateView):
    model = Character
    form_class = CharacterForm
    template_name = 'icvybz/character_create.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        story_id = self.kwargs.get('story_id')
        if story_id:
            context['story'] = get_object_or_404(Comic, pk=story_id, user=self.request.user)
        return context
    
    def form_valid(self, form):
        form.instance.user = self.request.user
        form.instance.is_public = False  # Start as private
        return super().form_valid(form)
    
    def get_success_url(self):
        story_id = self.kwargs.get('story_id')
        if story_id:
            return reverse('immersivecomics:story_manage', kwargs={'pk': story_id})
        return reverse('immersivecomics:user_dashboard')


class DialogueCreateView(LoginRequiredMixin, CreateView):
    model = Dialogue
    form_class = DialogueForm
    template_name = 'icvybz/dialogue_create.html'
    
    def dispatch(self, request, *args, **kwargs):
        self.episode = get_object_or_404(Episode, pk=kwargs['episode_id'], season__comic__user=request.user)
        return super().dispatch(request, *args, **kwargs)
    
    def get_form(self, form_class=None):
        form = super().get_form(form_class)
        # Populate character queryset with user's characters
        form.fields['character'].queryset = Character.objects.filter(user=self.request.user)
        return form
    
    def form_valid(self, form):
        form.instance.episode = self.episode
        
        # Create POV if character is selected
        character_id = self.request.POST.get('character')
        if character_id:
            character = get_object_or_404(Character, pk=character_id)
            pov, created = POV.objects.get_or_create(
                character=character,
                defaults={
                    'head_x': 0,
                    'head_y': 1.6,
                    'head_z': 0
                }
            )
            form.instance.pov = pov
        
        return super().form_valid(form)
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['episode'] = self.episode
        context['characters'] = Character.objects.filter(
            Q(user=self.request.user) | Q(is_public=True)
        ).distinct()
        return context
    
    def get_success_url(self):
        return reverse('immersivecomics:episode_manage', kwargs={'pk': self.episode.pk})


class DialogueEditView(LoginRequiredMixin, UpdateView):
    model = Dialogue
    form_class = DialogueForm
    template_name = 'icvybz/dialogue_edit.html'
    
    def get_queryset(self):
        return Dialogue.objects.filter(episode__season__comic__user=self.request.user)
    
    def get_success_url(self):
        return reverse('immersivecomics:episode_manage', kwargs={'pk': self.object.episode.pk})


class DialogueDeleteView(LoginRequiredMixin, DeleteView):
    model = Dialogue
    template_name = 'icvybz/dialogue_confirm_delete.html'
    
    def get_queryset(self):
        return Dialogue.objects.filter(episode__season__comic__user=self.request.user)
    
    def get_success_url(self):
        return reverse('immersivecomics:episode_manage', kwargs={'pk': self.object.episode.pk})


# Studio Views
class StudioListView(ListView):
    """List all public studios - Now serves React instead of Django template"""
    model = Studio
    template_name = None  # Serve React instead
    context_object_name = 'studios'
    paginate_by = 12
    
    def get(self, request, *args, **kwargs):
        """Serve React index.html for studio list"""
        import os
        from django.conf import settings
        from django.http import HttpResponse
        
        index_path = os.path.join(settings.BASE_DIR, 'frontend', 'build', 'index.html')
        try:
            with open(index_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return HttpResponse(content, content_type='text/html')
        except FileNotFoundError:
            return HttpResponse('React app not found. Please build the frontend.', status=404)
    
    def get_queryset(self):
        return Studio.objects.filter(is_public=True).prefetch_related('collaborators__user').annotate(
            annotated_collaborators_count=Count('collaborators', filter=Q(collaborators__is_active=True)),
            annotated_stories_count=Count('owner__comics', filter=Q(owner__comics__is_public=True), distinct=True)
        ).order_by('-created_at')
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = 'Collaborative Studios'
        context['page_description'] = 'Discover creative studios where storytellers, 3D artists, voice actors, sound engineers, and cinematographers collaborate to bring stories to life.'
        return context


class StudioDetailView(DetailView):
    """View a specific studio - Now serves React instead of Django template"""
    model = Studio
    template_name = None  # Serve React instead
    context_object_name = 'studio'
    
    def get(self, request, *args, **kwargs):
        """Serve React index.html for studio detail"""
        import os
        from django.conf import settings
        from django.http import HttpResponse
        
        index_path = os.path.join(settings.BASE_DIR, 'frontend', 'build', 'index.html')
        try:
            with open(index_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return HttpResponse(content, content_type='text/html')
        except FileNotFoundError:
            return HttpResponse('React app not found. Please build the frontend.', status=404)
    
    def get_queryset(self):
        return Studio.objects.filter(is_public=True).prefetch_related(
            'collaborators__user',
            'owner__comics__collaborators__user'
        ).annotate(
            annotated_collaborators_count=Count('collaborators', filter=Q(collaborators__is_active=True)),
            annotated_stories_count=Count('owner__comics', filter=Q(owner__comics__is_public=True), distinct=True)
        )
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        studio = self.object
        
        # Get public stories for this studio
        context['studio_stories'] = Comic.objects.filter(
            collaborators__studio=studio,
            is_public=True
        ).prefetch_related('collaborators__user').distinct()[:6]
        
        # Get active collaborators
        context['active_collaborators'] = studio.collaborators.filter(is_active=True).select_related('user')
        
        return context


class MyStudioView(LoginRequiredMixin, DetailView):
    """User's personal studio dashboard - Now serves React instead of Django template"""
    model = Studio
    template_name = None  # Serve React instead
    
    def get_object(self, queryset=None):
        """Get or create studio for current user"""
        studio = Studio.objects.filter(owner=self.request.user).order_by('created_at', 'id').first()
        if not studio:
            studio = Studio.objects.create(owner=self.request.user)
        return studio
    
    def get(self, request, *args, **kwargs):
        """Serve React index.html for my studio"""
        # Ensure studio exists for user
        self.get_object()
        import os
        from django.conf import settings
        from django.http import HttpResponse
        
        index_path = os.path.join(settings.BASE_DIR, 'frontend', 'build', 'index.html')
        try:
            with open(index_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return HttpResponse(content, content_type='text/html')
        except FileNotFoundError:
            return HttpResponse('React app not found. Please build the frontend.', status=404)
    model = Studio
    template_name = 'icvybz/my_studio.html'
    context_object_name = 'studio'
    
    def get_object(self):
        # Get or create user's studio
        studio = Studio.objects.filter(owner=self.request.user).order_by('created_at', 'id').first()
        if not studio:
            studio = Studio.objects.create(
                owner=self.request.user,
                name=f"{self.request.user.first_name or self.request.user.username}'s Studio",
                description='My collaborative storytelling workspace',
                is_public=True,
            )
        return studio
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        studio = self.object
        user = self.request.user
        
        # Get user's stories with all related data in optimized queries
        user_stories = Comic.objects.filter(
            Q(user=user) | Q(collaborators__user=user)
        ).prefetch_related(
            'collaborators__user',
            'seasons__episodes'
        ).annotate(
            seasons_count=Count('seasons'),
            episodes_count=Count('seasons__episodes')
        ).distinct()
        
        # Get studio collaborators
        studio_collaborators = studio.collaborators.filter(is_active=True).select_related('user')
        
        # Pre-load story collaborators using prefetch_related
        user_stories = user_stories.prefetch_related(
            'collaborators__user'
        )
        
        # Calculate totals efficiently
        total_episodes = sum(story.episodes_count for story in user_stories)
        total_seasons = sum(story.seasons_count for story in user_stories)
        
        context['user_stories'] = user_stories
        context['studio_collaborators'] = studio_collaborators
        context['total_stories'] = user_stories.count()
        context['total_collaborators'] = studio_collaborators.count()
        context['total_episodes'] = total_episodes
        context['total_seasons'] = total_seasons
        
        return context


class StudioCreateView(LoginRequiredMixin, CreateView):
    """Create a new studio"""
    model = Studio
    fields = ['name', 'description', 'is_public', 'avatar_url']
    template_name = 'icvybz/studio_create.html'
    
    def form_valid(self, form):
        form.instance.owner = self.request.user
        return super().form_valid(form)
    
    def get_success_url(self):
        return reverse('immersivecomics:my_studio')


class StudioUpdateView(LoginRequiredMixin, UpdateView):
    """Update studio settings"""
    model = Studio
    fields = ['name', 'description', 'is_public', 'avatar_url']
    template_name = 'icvybz/studio_edit.html'
    
    def get_queryset(self):
        return Studio.objects.filter(owner=self.request.user)
    
    def get_success_url(self):
        return reverse('immersivecomics:my_studio')


# Audio Views
class AudioTrackListView(LoginRequiredMixin, ListView):
    """List user's audio tracks"""
    model = AudioTrack
    template_name = 'icvybz/audio_track_list.html'
    context_object_name = 'audio_tracks'
    paginate_by = 20
    
    def get_queryset(self):
        return AudioTrack.objects.filter(created_by=self.request.user).order_by('-created_at')
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['audio_types'] = AudioTrack.AUDIO_TYPES
        return context


class AudioTrackCreateView(LoginRequiredMixin, CreateView):
    """Create a new audio track"""
    model = AudioTrack
    fields = ['name', 'audio_type', 'audio_file', 'duration', 'volume', 'loop', 'fade_in', 'fade_out', 'is_public']
    template_name = 'icvybz/audio_track_create.html'
    
    def form_valid(self, form):
        form.instance.created_by = self.request.user
        return super().form_valid(form)
    
    def get_success_url(self):
        return reverse('immersivecomics:audio_track_list')
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['audio_types'] = AudioTrack.AUDIO_TYPES
        return context


class AudioTrackUpdateView(LoginRequiredMixin, UpdateView):
    """Update an audio track"""
    model = AudioTrack
    fields = ['name', 'audio_type', 'audio_file', 'duration', 'volume', 'loop', 'fade_in', 'fade_out', 'is_public']
    template_name = 'icvybz/audio_track_edit.html'
    
    def get_queryset(self):
        return AudioTrack.objects.filter(created_by=self.request.user)
    
    def get_success_url(self):
        return reverse('immersivecomics:audio_track_list')


class AudioTrackDeleteView(LoginRequiredMixin, DeleteView):
    """Delete an audio track"""
    model = AudioTrack
    template_name = 'icvybz/audio_track_confirm_delete.html'
    
    def get_queryset(self):
        return AudioTrack.objects.filter(created_by=self.request.user)
    
    def get_success_url(self):
        return reverse('immersivecomics:audio_track_list')


def _user_profile_image_url(user):
    """
    Return a profile image URL for a User: explicit string avatar, ImageField/FileField URL if present,
    otherwise Gravatar from email (identicon fallback), or empty string.
    """
    if not user:
        return ''
    avatar_field = getattr(user, 'avatar', None)
    if isinstance(avatar_field, str) and avatar_field.strip():
        return avatar_field.strip()
    try:
        if avatar_field is not None and hasattr(avatar_field, 'url') and getattr(avatar_field, 'name', ''):
            return avatar_field.url
    except (ValueError, AttributeError):
        pass
    email = (getattr(user, 'email', '') or '').strip().lower()
    if not email:
        return ''
    digest = hashlib.md5(email.encode('utf-8')).hexdigest()
    return f'https://www.gravatar.com/avatar/{digest}?s=128&d=identicon'


# API Views for React Integration
@csrf_exempt
@require_http_methods(["GET"])
def studio_list_api(request):
    """API endpoint for studio list"""
    from django.db.models import Prefetch
    
    # Prefetch active collaborators with user data
    active_collaborators_prefetch = Prefetch(
        'collaborators',
        queryset=StudioCollaborator.objects.filter(is_active=True).select_related('user'),
        to_attr='prefetched_active_collaborators'
    )
    
    studios = list(Studio.objects.filter(is_public=True).select_related('owner').prefetch_related(active_collaborators_prefetch).annotate(
        annotated_collaborators_count=Count('collaborators', filter=Q(collaborators__is_active=True)),
    ).order_by('-created_at'))

    studio_ids = [studio.id for studio in studios]
    story_stats_by_studio = {}
    comment_stats_by_studio = {}
    if studio_ids:
        public_content = Season.objects.filter(
            comic_id=OuterRef('pk'),
            is_public=True,
            episodes__is_published=True,
        )
        story_stats = (
            Comic.objects.filter(
                studio_id__in=studio_ids,
                is_public=True,
                moderation_status='approved',
            )
            .annotate(_has_public_content=Exists(public_content))
            .filter(_has_public_content=True)
            .values('studio_id')
            .annotate(
                stories_count=Count('id', distinct=True),
                total_episode_views=Sum(
                    'seasons__episodes__view_count',
                    filter=Q(seasons__is_public=True, seasons__episodes__is_published=True),
                    default=0,
                ),
            )
        )
        story_stats_by_studio = {
            row['studio_id']: {
                'stories_count': row['stories_count'] or 0,
                'total_episode_views': row['total_episode_views'] or 0,
            }
            for row in story_stats
        }

        comment_stats = (
            Comic.objects.filter(
                studio_id__in=studio_ids,
                is_public=True,
                moderation_status='approved',
            )
            .annotate(_has_public_content=Exists(public_content))
            .filter(_has_public_content=True)
            .values('studio_id')
            .annotate(
                total_comments=Count(
                    'seasons__episodes__comments',
                    filter=(
                        Q(seasons__is_public=True)
                        & Q(seasons__episodes__is_published=True)
                        & Q(seasons__episodes__comments__approved_comment=True)
                    ),
                    distinct=True,
                )
            )
        )
        comment_stats_by_studio = {
            row['studio_id']: row['total_comments'] or 0
            for row in comment_stats
        }
    
    studios_data = []
    for studio in studios:
        # Get active collaborators from prefetched data
        collaborators_data = []
        if hasattr(studio, 'prefetched_active_collaborators'):
            for collab in studio.prefetched_active_collaborators:
                if collab.user:  # Ensure user exists
                    collaborators_data.append({
                        'id': collab.id,
                        'username': collab.user.username,
                        'first_name': collab.user.first_name or '',
                        'last_name': collab.user.last_name or '',
                        'role': collab.role,
                        'avatar': _user_profile_image_url(collab.user),
                        'is_active': True,
                    })
        else:
            # Fallback if prefetch didn't work
            for collab in studio.collaborators.filter(is_active=True).select_related('user'):
                if collab.user:
                    collaborators_data.append({
                        'id': collab.id,
                        'username': collab.user.username,
                        'first_name': collab.user.first_name or '',
                        'last_name': collab.user.last_name or '',
                        'role': collab.role,
                        'avatar': _user_profile_image_url(collab.user),
                        'is_active': True,
                    })
        
        collaborators_count = getattr(studio, 'annotated_collaborators_count', len(collaborators_data)) or 0
        studio_stats = story_stats_by_studio.get(studio.id, {})
        stories_count = studio_stats.get('stories_count', 0)
        total_episode_views = studio_stats.get('total_episode_views', 0)
        total_comments = comment_stats_by_studio.get(studio.id, 0)
        
        studios_data.append({
            'id': studio.id,
            'name': studio.name,
            'description': studio.description or '',
            'owner': {
                'id': studio.owner.id,
                'username': studio.owner.username,
                'first_name': studio.owner.first_name or '',
                'last_name': studio.owner.last_name or '',
                'avatar': _user_profile_image_url(studio.owner),
            },
            'collaborators': collaborators_data,
            'stories_count': stories_count,
            'collaborators_count': collaborators_count,
            'total_episode_views': total_episode_views,
            'total_comments': total_comments,
            'created_at': studio.created_at.isoformat() if studio.created_at else '',
            'updated_at': studio.updated_at.isoformat() if studio.updated_at else '',
            'is_public': studio.is_public,
            'avatar_url': studio.avatar_url or ''
        })
    
    return JsonResponse({'studios': studios_data})


@csrf_exempt
@require_http_methods(["GET"])
def my_studio_api(request):
    """API endpoint for user's studio"""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    studio = Studio.objects.filter(owner=request.user).order_by('created_at', 'id').first()
    if not studio:
        studio = Studio.objects.create(
            owner=request.user,
            name=f"{request.user.first_name or request.user.username}'s Studio",
            description='My collaborative storytelling workspace',
            is_public=True
        )
    
    # Get user's stories with optimized queries
    user_stories = Comic.objects.filter(
        Q(user=request.user) | Q(collaborators__user=request.user)
    ).prefetch_related(
        'collaborators__user',
        'seasons__episodes'
    ).annotate(
        seasons_count=Count('seasons'),
        episodes_count=Count('seasons__episodes'),
        total_views=Sum('seasons__episodes__view_count', default=0)
    ).distinct()
    
    stories_data = []
    for story in user_stories:
        stories_data.append({
            'id': story.id,
            'title': story.title,
            'description': story.description,
            'is_public': story.is_public,
            'moderation_status': story.moderation_status,
            'created_at': story.created_at.isoformat(),
            'updated_at': story.updated_at.isoformat(),
            'collaborators': [
                {
                    'id': collab.id,
                    'username': collab.user.username,
                    'first_name': collab.user.first_name,
                    'last_name': collab.user.last_name,
                    'role': collab.role
                }
                for collab in story.collaborators.filter(is_active=True)
            ],
            'seasons_count': story.seasons_count,
            'episodes_count': story.episodes_count,
            'total_views': story.total_views or 0
        })
    
    studio_data = {
        'id': studio.id,
        'name': studio.name,
        'description': studio.description,
        'owner': {
            'id': studio.owner.id,
            'username': studio.owner.username,
            'first_name': studio.owner.first_name,
            'last_name': studio.owner.last_name
        },
        'collaborators': [
            {
                'id': collab.id,
                'username': collab.user.username,
                'first_name': collab.user.first_name,
                'last_name': collab.user.last_name,
                'role': collab.role
            }
            for collab in studio.collaborators.filter(is_active=True)
        ],
        'stories': stories_data,
        'created_at': studio.created_at.isoformat(),
        'updated_at': studio.updated_at.isoformat()
    }
    
    return JsonResponse({'studio': studio_data})


def preview_collaboration_email(request):
    """Preview the collaboration invitation email template with sample data"""
    from django.contrib.auth import get_user_model
    from .models import CollaborationInvite, Comic
    
    # Create mock data for preview
    class MockInvite:
        def __init__(self):
            self.id = '12345678-1234-1234-1234-123456789012'
            self.invitee_user = type('obj', (object,), {
                'first_name': 'Jane',
                'username': 'jane_doe'
            })()
            self.inviter = type('obj', (object,), {
                'first_name': 'John',
                'username': 'john_smith'
            })()
            self.story = type('obj', (object,), {
                'title': 'The Amazing Adventure',
                'id': 1
            })()
            self.role = 'editor'
            self.message = 'I would love to have you collaborate on this story! Your expertise would be invaluable.'
            self.expires_at = timezone.now() + timezone.timedelta(days=7)
        
        def get_role_display(self):
            return 'Editor'
    
    # Get site URL
    current_site = Site.objects.get_current()
    site_url = f"https://{current_site.domain}"
    frontend_url = getattr(settings, 'FRONTEND_URL', site_url)
    
    # Generate URLs
    mock_invite = MockInvite()
    accept_url = f"{frontend_url}/immersivecomics/story/{mock_invite.story.id}/collaborators/?invite_id={mock_invite.id}&action=accept"
    decline_url = f"{frontend_url}/immersivecomics/story/{mock_invite.story.id}/collaborators/?invite_id={mock_invite.id}&action=decline"
    
    context = {
        'invite': mock_invite,
        'site_url': site_url,
        'frontend_url': frontend_url,
        'accept_url': accept_url,
        'decline_url': decline_url,
    }
    
    return render(request, 'emails/collaboration_invitation.html', context)


@staff_member_required
def preview_all_emails(request):
    """
    Development-only view to preview all email templates in a carousel.
    Only accessible when DEBUG=True or in development environment.
    """
    # Check if in development mode
    if not settings.DEBUG:
        from django.http import HttpResponseForbidden
        return HttpResponseForbidden("Email preview is only available in development mode.")
    
    from django.contrib.auth import get_user_model
    from django.template.loader import render_to_string
    User = get_user_model()
    from decimal import Decimal
    from snmov.models import Product, Order, OrderItem, ShippingAddress, ProductNotification
    
    current_site = Site.objects.get_current()
    site_url = f"https://{current_site.domain}"
    frontend_url = getattr(settings, 'FRONTEND_URL', site_url)
    
    # Create mock user
    mock_user = type('obj', (object,), {
        'first_name': 'John',
        'last_name': 'Doe',
        'username': 'johndoe',
        'email': 'john.doe@example.com'
    })()
    
    # Create proper product class with method
    class MockProduct:
        def __init__(self):
            self.title = 'Sample Product'
            self.description = 'This is a sample product description'
            self.price = Decimal('29.99')
            self.discount_percentage = Decimal('10.00')
            self.stock = 5
            self.uuid = '12345678-1234-1234-1234-123456789012'
        
        def get_discounted_price(self):
            return self.price * (1 - self.discount_percentage / 100)
    
    mock_product = MockProduct()
    
    # Create mock order item with proper product
    mock_order_item = type('obj', (object,), {
        'product': mock_product,
        'quantity': 2,
        'price': Decimal('26.99')  # discounted price
    })()
    
    # Create a proper queryset-like object for orderitem_set
    class MockOrderItemSet:
        def __init__(self, items):
            self.items = items
        
        def all(self):
            return self.items
    
    mock_shipping_address = type('obj', (object,), {
        'full_name': 'John Doe',
        'address_line_1': '123 Main Street',
        'address_line_2': 'Apt 4B',
        'city': 'Toronto',
        'state': 'ON',
        'postal_code': 'M5H 2N2',
        'country_code': 'CA'
    })()
    
    # Create proper methods for order calculations
    class MockOrder:
        def __init__(self):
            self.id = 101
            self.customer = mock_user
            self.order_date = timezone.now()
            self.status = 'PROCESSING'
            self.shipping_cost = Decimal('5.00')
            self.tracking_number = 'CP123456789CA'
            self.shipping_provider = 'Canada Post'
            self.shipping_service = 'Regular Parcel'
            self.shipping_address = mock_shipping_address
            self.orderitem_set = MockOrderItemSet([mock_order_item])
        
        def calculate_total_value(self):
            return Decimal('59.98')
        
        def calculate_grand_total(self):
            return Decimal('64.98')
        
        def get_status_display(self):
            return 'Processing'
    
    mock_order = MockOrder()
    
    # Create mock notification (ProductNotification model)
    mock_notification = type('obj', (object,), {
        'first_name': 'Jane',
        'last_name': 'Smith',
        'email': 'jane.smith@example.com',
        'product': mock_product
    })()
    
    # Create mock collaboration invite with proper class
    class MockCollaborationInvite:
        def __init__(self):
            self.id = '12345678-1234-1234-1234-123456789012'
            self.invitee_user = type('obj', (object,), {
                'first_name': 'Jane',
                'username': 'jane_doe'
            })()
            self.inviter = type('obj', (object,), {
                'first_name': 'John',
                'username': 'john_smith'
            })()
            self.story = type('obj', (object,), {
                'title': 'The Amazing Adventure',
                'id': 1
            })()
            self.role = 'editor'
            self.message = 'I would love to have you collaborate on this story! Your expertise would be invaluable.'
            self.expires_at = timezone.now() + timezone.timedelta(days=7)
        
        def get_role_display(self):
            return 'Editor'
    
    mock_invite = MockCollaborationInvite()
    
    # Create mock studio collaboration request
    class MockStudioCollaborationRequest:
        def __init__(self):
            self.id = 1
            self.requester = type('obj', (object,), {
                'first_name': 'Alice',
                'username': 'alice_writer',
                'email': 'alice@example.com'
            })()
            self.studio = type('obj', (object,), {
                'name': 'Creative Studio',
                'id': 1,
                'owner': type('obj', (object,), {
                    'first_name': 'Studio',
                    'username': 'studio_owner'
                })()
            })()
            self.role = 'writer'
            self.message = 'I would love to join your studio!'
        
        def get_role_display(self):
            return 'Writer'
    
    mock_studio_request = MockStudioCollaborationRequest()
    
    # Create mock studio with owner (needed for template)
    mock_studio = type('obj', (object,), {
        'name': 'Creative Studio',
        'id': 1,
        'owner': type('obj', (object,), {
            'first_name': 'Studio',
            'username': 'studio_owner'
        })()
    })()
    
    # Prepare all email contexts
    email_previews = []
    
    # 1. Welcome Email
    try:
        welcome_context = {
            'user': mock_user,
            'site_url': site_url
        }
        welcome_html = render_to_string('emails/welcome_email.html', welcome_context)
        email_previews.append({
            'name': 'Welcome Email',
            'template': 'welcome_email.html',
            'html': welcome_html,
            'description': 'Sent when a new user registers'
        })
    except Exception as e:
        email_previews.append({
            'name': 'Welcome Email',
            'template': 'welcome_email.html',
            'html': f'<p>Error rendering: {str(e)}</p>',
            'description': 'Sent when a new user registers'
        })
    
    # 2. Verification Email
    try:
        verification_context = {
            'user': mock_user,
            'verification_url': f"{site_url}/product/verify-email/1/token123/",
            'site_url': site_url
        }
        verification_html = render_to_string('emails/verification_email.html', verification_context)
        email_previews.append({
            'name': 'Email Verification',
            'template': 'verification_email.html',
            'html': verification_html,
            'description': 'Sent for email verification'
        })
    except Exception as e:
        email_previews.append({
            'name': 'Email Verification',
            'template': 'verification_email.html',
            'html': f'<p>Error rendering: {str(e)}</p>',
            'description': 'Sent for email verification'
        })
    
    # 3. Password Reset Email
    try:
        # Generate mock uid and token for preview
        import base64
        from django.utils.http import urlsafe_base64_encode
        # Mock uidb64 (base64 encoded user ID)
        mock_uidb64 = urlsafe_base64_encode(str(1).encode())
        # Mock token (password reset token is typically 20 characters)
        mock_token = 'mock-token-1234567890'
        
        password_reset_context = {
            'user': mock_user,
            'protocol': 'https',
            'domain': current_site.domain,
            'uid': mock_uidb64,
            'token': mock_token,
            'site_url': site_url
        }
        password_reset_html = render_to_string('emails/password_reset_email.html', password_reset_context)
        email_previews.append({
            'name': 'Password Reset',
            'template': 'password_reset_email.html',
            'html': password_reset_html,
            'description': 'Sent when user requests password reset'
        })
    except Exception as e:
        import traceback
        email_previews.append({
            'name': 'Password Reset',
            'template': 'password_reset_email.html',
            'html': f'<p>Error rendering: {str(e)}</p><pre>{traceback.format_exc()}</pre>',
            'description': 'Sent when user requests password reset'
        })
    
    # 4. Order Confirmation
    try:
        order_confirmation_context = {
            'order': mock_order,
            'order_url': f"{site_url}/product/order/101/",
            'cancel_url': f"{site_url}/product/order/101/cancel/",
            'site_url': site_url
        }
        order_confirmation_html = render_to_string('emails/order_confirmation.html', order_confirmation_context)
        email_previews.append({
            'name': 'Order Confirmation',
            'template': 'order_confirmation.html',
            'html': order_confirmation_html,
            'description': 'Sent after successful order payment'
        })
    except Exception as e:
        import traceback
        email_previews.append({
            'name': 'Order Confirmation',
            'template': 'order_confirmation.html',
            'html': f'<p>Error rendering: {str(e)}</p><pre>{traceback.format_exc()}</pre>',
            'description': 'Sent after successful order payment'
        })
    
    # 5. Order Status Update
    try:
        order_status_context = {
            'order': mock_order,
            'order_url': f"{site_url}/product/order/101/",
            'site_url': site_url
        }
        order_status_html = render_to_string('emails/order_status_update.html', order_status_context)
        email_previews.append({
            'name': 'Order Status Update',
            'template': 'order_status_update.html',
            'html': order_status_html,
            'description': 'Sent when order status changes (processing, shipped, delivered)'
        })
    except Exception as e:
        import traceback
        email_previews.append({
            'name': 'Order Status Update',
            'template': 'order_status_update.html',
            'html': f'<p>Error rendering: {str(e)}</p><pre>{traceback.format_exc()}</pre>',
            'description': 'Sent when order status changes'
        })
    
    # 6. Order Cancellation
    try:
        # Create a cancelled order mock for better preview
        class MockCancelledOrder:
            def __init__(self):
                self.id = 101
                self.customer = mock_user
                self.order_date = timezone.now()
                self.status = 'CANCELLED'  # Set to cancelled for preview
                self.shipping_cost = Decimal('5.00')
                self.tracking_number = None  # Cancelled orders don't have tracking
                self.shipping_provider = None
                self.shipping_service = None
                self.shipping_address = mock_shipping_address
                self.orderitem_set = MockOrderItemSet([mock_order_item])
            
            def calculate_total_value(self):
                return Decimal('59.98')
            
            def calculate_grand_total(self):
                return Decimal('64.98')
            
            def get_status_display(self):
                return 'Cancelled'
        
        cancelled_order = MockCancelledOrder()
        
        order_cancellation_context = {
            'order': cancelled_order,
            'site_url': site_url
        }
        order_cancellation_html = render_to_string('emails/order_cancellation.html', order_cancellation_context)
        email_previews.append({
            'name': 'Order Cancellation',
            'template': 'order_cancellation.html',
            'html': order_cancellation_html,
            'description': 'Sent when order is cancelled'
        })
    except Exception as e:
        import traceback
        email_previews.append({
            'name': 'Order Cancellation',
            'template': 'order_cancellation.html',
            'html': f'<p>Error rendering: {str(e)}</p><pre>{traceback.format_exc()}</pre>',
            'description': 'Sent when order is cancelled'
        })
    
    # 7. Collaboration Invitation
    try:
        collaboration_context = {
            'invite': mock_invite,
            'site_url': site_url,
            'frontend_url': frontend_url,
            'accept_url': f"{frontend_url}/immersivecomics/story/1/collaborators/?invite_id={mock_invite.id}&action=accept",
            'decline_url': f"{frontend_url}/immersivecomics/story/1/collaborators/?invite_id={mock_invite.id}&action=decline"
        }
        collaboration_html = render_to_string('emails/collaboration_invitation.html', collaboration_context)
        email_previews.append({
            'name': 'Story Collaboration Invitation',
            'template': 'collaboration_invitation.html',
            'html': collaboration_html,
            'description': 'Sent when inviting someone to collaborate on a story'
        })
    except Exception as e:
        email_previews.append({
            'name': 'Story Collaboration Invitation',
            'template': 'collaboration_invitation.html',
            'html': f'<p>Error rendering: {str(e)}</p>',
            'description': 'Sent when inviting someone to collaborate on a story'
        })
    
    # 8. Studio Invitation
    try:
        class MockStudioInviteContext:
            def __init__(self):
                self.inviter = type('obj', (object,), {
                    'first_name': 'John',
                    'username': 'john_smith'
                })()
                self.invitee = type('obj', (object,), {
                    'first_name': 'Jane',
                    'username': 'jane_doe'
                })()
                self.studio = mock_studio
                self.role = 'writer'
                self.site_url = site_url
                self.studio_url = f"{frontend_url}/immersivecomics/studio/1/"
            
            def get_role_display(self):
                return 'Writer'
        
        studio_invite_context_obj = MockStudioInviteContext()
        studio_invite_context = {
            'inviter': studio_invite_context_obj.inviter,
            'invitee_user': studio_invite_context_obj.invitee,
            'invitee': studio_invite_context_obj.invitee,
            'studio': studio_invite_context_obj.studio,
            'role_display': 'Writer',  # Template uses role_display, not get_role_display
            'site_url': studio_invite_context_obj.site_url,
            'studio_url': studio_invite_context_obj.studio_url
        }
        studio_invite_html = render_to_string('emails/studio_invitation.html', studio_invite_context)
        email_previews.append({
            'name': 'Studio Invitation',
            'template': 'studio_invitation.html',
            'html': studio_invite_html,
            'description': 'Sent when inviting someone to join a studio'
        })
    except Exception as e:
        email_previews.append({
            'name': 'Studio Invitation',
            'template': 'studio_invitation.html',
            'html': f'<p>Error rendering: {str(e)}</p>',
            'description': 'Sent when inviting someone to join a studio'
        })
    
    # 9. Studio Collaboration Request
    try:
        studio_request_context = {
            'request': mock_studio_request,
            'studio': mock_studio,
            'site_url': site_url,
            'frontend_url': frontend_url,
            'accept_url': f"{frontend_url}/immersivecomics/studio/1/?request_id=1&action=accept",
            'decline_url': f"{frontend_url}/immersivecomics/studio/1/?request_id=1&action=decline"
        }
        studio_request_html = render_to_string('emails/studio_collaboration_request.html', studio_request_context)
        email_previews.append({
            'name': 'Studio Collaboration Request',
            'template': 'studio_collaboration_request.html',
            'html': studio_request_html,
            'description': 'Sent to studio owner when someone requests to collaborate'
        })
    except Exception as e:
        import traceback
        email_previews.append({
            'name': 'Studio Collaboration Request',
            'template': 'studio_collaboration_request.html',
            'html': f'<p>Error rendering: {str(e)}</p><pre>{traceback.format_exc()}</pre>',
            'description': 'Sent to studio owner when someone requests to collaborate'
        })
    
    # 10. Product Back in Stock
    try:
        product_stock_context = {
            'notification': mock_notification,
            'product_url': f"{site_url}/product/{mock_product.uuid}/",
            'site_url': site_url
        }
        product_stock_html = render_to_string('emails/product_back_in_stock.html', product_stock_context)
        email_previews.append({
            'name': 'Product Back in Stock',
            'template': 'product_back_in_stock.html',
            'html': product_stock_html,
            'description': 'Sent when a product comes back in stock'
        })
    except Exception as e:
        import traceback
        email_previews.append({
            'name': 'Product Back in Stock',
            'template': 'product_back_in_stock.html',
            'html': f'<p>Error rendering: {str(e)}</p><pre>{traceback.format_exc()}</pre>',
            'description': 'Sent when a product comes back in stock'
        })
    
    # 11. Abandoned Cart Reminder
    try:
        # Create cart items with proper product objects
        cart_item = type('obj', (object,), {
            'product': mock_product,
            'quantity': 2
        })()
        cart_reminder_context = {
            'user': mock_user,
            'cart_items': [cart_item],
            'total_price': Decimal('59.98'),
            'days_abandoned': 1,
            'cart_url': f"{site_url}/product/cart/",
            'site_url': site_url
        }
        cart_reminder_html = render_to_string('emails/abandoned_cart_reminder.html', cart_reminder_context)
        email_previews.append({
            'name': 'Abandoned Cart Reminder',
            'template': 'abandoned_cart_reminder.html',
            'html': cart_reminder_html,
            'description': 'Sent as reminder for abandoned shopping carts'
        })
    except Exception as e:
        import traceback
        email_previews.append({
            'name': 'Abandoned Cart Reminder',
            'template': 'abandoned_cart_reminder.html',
            'html': f'<p>Error rendering: {str(e)}</p><pre>{traceback.format_exc()}</pre>',
            'description': 'Sent as reminder for abandoned shopping carts'
        })
    
    # 12. Order Refund Processed
    try:
        refund_context = {
            'order': mock_order,
            'refund_amount': Decimal('64.98'),
            'refund_method': 'Original payment method',
            'site_url': site_url
        }
        refund_html = render_to_string('emails/order_refund_processed.html', refund_context)
        email_previews.append({
            'name': 'Order Refund Processed',
            'template': 'order_refund_processed.html',
            'html': refund_html,
            'description': 'Sent when order refund is processed'
        })
    except Exception as e:
        import traceback
        email_previews.append({
            'name': 'Order Refund Processed',
            'template': 'order_refund_processed.html',
            'html': f'<p>Error rendering: {str(e)}</p><pre>{traceback.format_exc()}</pre>',
            'description': 'Sent when order refund is processed'
        })
    
    # 13. Feedback Confirmation
    try:
        mock_feedback = type('obj', (object,), {
            'full_name': 'John Doe',
            'email': 'john.doe@example.com',
            'subject': 'Question about Product',
            'content': 'I have a question about one of your products. Can you help me?'
        })()
        
        feedback_context = {
            'feedback': mock_feedback,
            'site_url': site_url
        }
        feedback_html = render_to_string('emails/feedback_confirmation.html', feedback_context)
        email_previews.append({
            'name': 'Feedback Confirmation',
            'template': 'feedback_confirmation.html',
            'html': feedback_html,
            'description': 'Sent when user submits feedback form'
        })
    except Exception as e:
        import traceback
        email_previews.append({
            'name': 'Feedback Confirmation',
            'template': 'feedback_confirmation.html',
            'html': f'<p>Error rendering: {str(e)}</p><pre>{traceback.format_exc()}</pre>',
            'description': 'Sent when user submits feedback form'
        })
    
    # 14. Collaboration Accepted
    try:
        # Create a separate mock invite for accepted email
        class MockAcceptedInvite:
            def __init__(self):
                self.id = '12345678-1234-1234-1234-123456789012'
                self.invitee_user = type('obj', (object,), {
                    'first_name': 'Jane',
                    'username': 'jane_doe'
                })()
                self.invitee_email = 'jane.doe@example.com'  # Add email for fallback
                self.inviter = type('obj', (object,), {
                    'first_name': 'John',
                    'username': 'john_smith'
                })()
                self.story = type('obj', (object,), {
                    'title': 'The Amazing Adventure',
                    'id': 1
                })()
                self.role = 'editor'
                self.status = 'accepted'
            
            def get_role_display(self):
                return 'Editor'
        
        mock_accepted_invite = MockAcceptedInvite()
        collaboration_accepted_context = {
            'invite': mock_accepted_invite,
            'site_url': site_url,
            'frontend_url': frontend_url,
            'story_url': f"{frontend_url}/immersivecomics/story/{mock_accepted_invite.story.id}/"
        }
        collaboration_accepted_html = render_to_string('emails/collaboration_accepted.html', collaboration_accepted_context)
        email_previews.append({
            'name': 'Collaboration Accepted',
            'template': 'collaboration_accepted.html',
            'html': collaboration_accepted_html,
            'description': 'Sent to inviter when collaboration invitation is accepted'
        })
    except Exception as e:
        import traceback
        email_previews.append({
            'name': 'Collaboration Accepted',
            'template': 'collaboration_accepted.html',
            'html': f'<p>Error rendering: {str(e)}</p><pre>{traceback.format_exc()}</pre>',
            'description': 'Sent to inviter when collaboration invitation is accepted'
        })
    
    # 15. Collaboration Declined
    try:
        # Create a separate mock invite for declined email
        class MockDeclinedInvite:
            def __init__(self):
                self.id = '12345678-1234-1234-1234-123456789012'
                self.invitee_user = type('obj', (object,), {
                    'first_name': 'Jane',
                    'username': 'jane_doe'
                })()
                self.invitee_email = 'jane.doe@example.com'  # Add email for fallback
                self.inviter = type('obj', (object,), {
                    'first_name': 'John',
                    'username': 'john_smith'
                })()
                self.story = type('obj', (object,), {
                    'title': 'The Amazing Adventure',
                    'id': 1
                })()
                self.role = 'editor'
                self.status = 'declined'
            
            def get_role_display(self):
                return 'Editor'
        
        mock_declined_invite = MockDeclinedInvite()
        collaboration_declined_context = {
            'invite': mock_declined_invite,
            'site_url': site_url,
            'frontend_url': frontend_url,
            'story_url': f"{frontend_url}/immersivecomics/story/{mock_declined_invite.story.id}/"
        }
        collaboration_declined_html = render_to_string('emails/collaboration_declined.html', collaboration_declined_context)
        email_previews.append({
            'name': 'Collaboration Declined',
            'template': 'collaboration_declined.html',
            'html': collaboration_declined_html,
            'description': 'Sent to inviter when collaboration invitation is declined'
        })
    except Exception as e:
        import traceback
        email_previews.append({
            'name': 'Collaboration Declined',
            'template': 'collaboration_declined.html',
            'html': f'<p>Error rendering: {str(e)}</p><pre>{traceback.format_exc()}</pre>',
            'description': 'Sent to inviter when collaboration invitation is declined'
        })
    
    # 16. Newsletter Welcome
    try:
        mock_subscription = type('obj', (object,), {
            'email': 'subscriber@example.com',
            'unsubscribe_token': 'mock-token-1234567890'
        })()
        
        newsletter_welcome_context = {
            'subscription': mock_subscription,
            'unsubscribe_url': f"{site_url}/api/newsletter/unsubscribe/{mock_subscription.unsubscribe_token}/",
            'site_url': site_url
        }
        newsletter_welcome_html = render_to_string('emails/newsletter_welcome.html', newsletter_welcome_context)
        email_previews.append({
            'name': 'Newsletter Welcome',
            'template': 'newsletter_welcome.html',
            'html': newsletter_welcome_html,
            'description': 'Sent when user subscribes to newsletter'
        })
    except Exception as e:
        import traceback
        email_previews.append({
            'name': 'Newsletter Welcome',
            'template': 'newsletter_welcome.html',
            'html': f'<p>Error rendering: {str(e)}</p><pre>{traceback.format_exc()}</pre>',
            'description': 'Sent when user subscribes to newsletter'
        })
    
    # 17. Newsletter Blast (Sample)
    try:
        sample_content = """
        <h2>Latest Updates from Justvybz</h2>
        <p>Here's what's new this month:</p>
        <ul>
            <li>New immersive comic stories available</li>
            <li>Special discount on premium products</li>
            <li>Platform improvements and new features</li>
        </ul>
        <p>Don't miss out on our latest releases!</p>
        """
        
        newsletter_blast_context = {
            'subscription': mock_subscription,
            'content': sample_content,
            'unsubscribe_url': f"{site_url}/api/newsletter/unsubscribe/{mock_subscription.unsubscribe_token}/",
            'site_url': site_url
        }
        newsletter_blast_html = render_to_string('emails/newsletter_blast.html', newsletter_blast_context)
        email_previews.append({
            'name': 'Newsletter Blast (Sample)',
            'template': 'newsletter_blast.html',
            'html': newsletter_blast_html,
            'description': 'Periodic newsletter email blasts to subscribers'
        })
    except Exception as e:
        import traceback
        email_previews.append({
            'name': 'Newsletter Blast (Sample)',
            'template': 'newsletter_blast.html',
            'html': f'<p>Error rendering: {str(e)}</p><pre>{traceback.format_exc()}</pre>',
            'description': 'Periodic newsletter email blasts to subscribers'
        })
    
    return render(request, 'icvybz/email_preview_all.html', {
        'email_previews': email_previews,
        'total_emails': len(email_previews)
    })
from django.shortcuts import render, get_object_or_404, redirect
from django.views.generic import ListView, DetailView
from django.contrib.admin.views.decorators import staff_member_required
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import Comic, Season, Episode, Dialogue, POV, ComicComment, TrafficSource
from django.utils.safestring import mark_safe
from .forms import ComicCommentForm
import json
import os
from datetime import datetime
import re


class ComicView(ListView):
    model = Comic
    template_name = 'tilf/titles.html'
    context_object_name = 'comics'

    def get_queryset(self):
        return Comic.objects.prefetch_related('seasons__episodes').all()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Filter episodes to only show published ones
        for comic in context['comics']:
            for season in comic.seasons.all():
                # Create a custom property to filter episodes and order by episode_number
                season.published_episodes = season.episodes.filter(is_published=True).order_by('episode_number')
        return context


class SeasonDetailView(DetailView):
    model = Season
    template_name = 'tilf/season_detail.html'
    context_object_name = 'season'


class EpisodeDetailView(DetailView):
    model = Episode
    template_name = 'tilf/episode_detail.html'
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
    template_name = 'tilf/episode_preview.html'
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
    template_name = 'tilf/episode_analytics.html'
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
    template_name = 'tilf/episode_analytics.html'  # Use the same template
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

def log_share_click(request, platform, episode_id):
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
        'episode_id': episode_id,
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
        
        if not platform or not episode_id:
            return JsonResponse({'error': 'Missing platform or episode_id'}, status=400)
        
        log_share_click(request, platform, episode_id)
        return JsonResponse({'success': True})
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)



from django.shortcuts import render, redirect, reverse, get_object_or_404
from django.utils import timezone
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from .forms import ContactModelForm, ProductNotificationForm, RegisterForm
from snmov.models import Product, Comment, ReachOut, SiteImage, Testimonials, ProductNotification, About, ARUsage, ModelUsage
from django.contrib import messages
from django.conf import settings
from django.core.mail import send_mail, BadHeaderError
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse, HttpRequest, HttpResponseNotFound, FileResponse
from django.views.generic.edit import DeleteView
from django.views.generic import TemplateView, FormView, ListView
from django.template.loader import render_to_string
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.conf import settings
import random
import uuid
from django.contrib.auth import login, logout, authenticate, get_user_model

User = get_user_model()
from django.contrib.auth.tokens import PasswordResetTokenGenerator, default_token_generator
from django.db.models.signals import post_save
from django.contrib.contenttypes.models import ContentType
from django.db.models import Prefetch
from django.dispatch import receiver
from snm.settings.base import DEFAULT_FROM_EMAIL, SUPPORT_EMAIL
from django.contrib.sites.models import Site
from django.contrib.sites.shortcuts import get_current_site
import mimetypes
import os


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    def _make_hash_value(self, user, timestamp):
        return f"{user.pk}{timestamp}{user.is_active}"

email_verification_token = EmailVerificationTokenGenerator()


FRONTEND_PUBLIC_ASSETS = frozenset({
    'jv_header.svg',
    'jv_header 1.2.svg',
    'logo-80x80.svg',
    'logo 80x80.svg',
    'logo.svg',
    'logo192.png',
    'logo512.png',
    'powered-by-logo.png',
    'favicon.ico',
    'manifest.json',
    'robots.txt',
})


def serve_frontend_public_asset(request, filename):
    """Serve CRA public/ files from frontend/build/ (not collected by collectstatic)."""
    if filename not in FRONTEND_PUBLIC_ASSETS:
        return HttpResponseNotFound()
    filepath = os.path.join(settings.BASE_DIR, 'frontend', 'build', filename)
    if not os.path.isfile(filepath):
        return HttpResponseNotFound()
    content_type, _ = mimetypes.guess_type(filepath)
    return FileResponse(open(filepath, 'rb'), content_type=content_type or 'application/octet-stream')



class ReactAppView(TemplateView):
    """View to serve React app's index.html for client-side routing"""
    
    @method_decorator(ensure_csrf_cookie)
    def get(self, request, *args, **kwargs):
        """Serve React index.html file directly"""
        import os
        import logging
        from django.conf import settings
        from django.http import HttpResponse, JsonResponse
        
        logger = logging.getLogger(__name__)
        
        # Safety check: If this view is somehow called for an API route,
        # return a proper error instead of HTML (should never happen due to URL ordering)
        path = kwargs.get('path', '')
        
        # Log when catch-all route is hit for debugging
        # Only log in development to avoid production noise
        from django.conf import settings
        if settings.DEBUG:
            print(f'\n[ReactAppView] ===== CATCH-ALL ROUTE MATCHED =====')
            print(f'[ReactAppView] Path param: {path}')
            print(f'[ReactAppView] Request path: {request.path}')
            print(f'[ReactAppView] Full path: {request.get_full_path()}')
            print(f'[ReactAppView] Method: {request.method}')
            print(f'[ReactAppView] Host: {request.get_host()}')
            print(f'[ReactAppView] Accept header: {request.headers.get("Accept", "N/A")}')
            print(f'[ReactAppView] ======================================\n')
        
        logger.warning(f'[ReactAppView] Catch-all route matched! Path: {path}, Full URL: {request.get_full_path()}, Method: {request.method}')
        logger.warning(f'[ReactAppView] Request headers: Host={request.get_host()}, Accept={request.headers.get("Accept", "N/A")}')
        
        # Safety check: If this view is somehow called for an API route,
        # return a proper error instead of HTML (should never happen due to URL ordering)
        if path.startswith('api/') or request.path.startswith('/api/'):
            if settings.DEBUG:
                print(f'\n[ReactAppView] ERROR: API route caught by catch-all!')
                print(f'[ReactAppView] Path param: {path}')
                print(f'[ReactAppView] Request path: {request.path}\n')
            logger.error(f'[ReactAppView] ERROR: API route caught by catch-all! Path: {path}, Request path: {request.path}')
            # In production, still return JSON error but without debug details
            debug_info = {
                'path': path,
                'request_path': request.path,
                'full_path': request.get_full_path(),
                'url': request.build_absolute_uri()
            } if settings.DEBUG else {}
            return JsonResponse({
                'error': 'API route not found',
                'message': 'This should not happen - API routes should be matched before catch-all',
                **({'debug': debug_info} if settings.DEBUG else {})
            }, status=404)
        
        index_path = os.path.join(settings.BASE_DIR, 'frontend', 'build', 'index.html')
        try:
            with open(index_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return HttpResponse(content, content_type='text/html')
        except FileNotFoundError:
            return HttpResponse('React app not found. Please build the frontend.', status=404)
class HomePageView(FormView, TemplateView):
    template_name = None  # We'll serve React directly
    form_class = ProductNotificationForm
    
    def get(self, request, *args, **kwargs):
        """Serve React index.html for homepage"""
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
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # Only keep about section (testimonials moved to snmov list view)
        context.update({
            'about': About.objects.first(),
            'random_image_url': 'https://justvybz.com/static/snmov/img/default-product.jpg',  # Default image
        })
        
        return context


    def form_valid(self, form):
        first_name = form.cleaned_data['first_name']
        last_name = form.cleaned_data['last_name']
        email = form.cleaned_data['email']
        products = form.cleaned_data['products']

        # Initialize a list to store notification details
        notification_details = []

        # Save notifications for each selected product
        for product in products:
            notification = ProductNotification.objects.create(
                first_name=first_name,
                last_name=last_name,
                email=email,
                product=product,
                created_at=timezone.now(),
            )

            # Add the notification ID and product title to the details list
            notification_details.append(f"\nProduct: {product.title} \nNotification ID: JVN-{notification.id}")

        # Send email notification
        notification_info = "\n".join(notification_details)
        email_subject = 'Product Availability Notification Request'
        email_message = (
            f"Hello {first_name},\n\n"
            f"Thank you for your interest in our products. You will be notified when the following products become available:\n"
            f"{notification_info}\n\n"
            "Best regards,\n"
            "Team Justvybz"
        )
        send_mail(
            email_subject,
            email_message,
            settings.DEFAULT_FROM_EMAIL,  # From email
            [settings.SUPPORT_EMAIL],  # To email
            fail_silently=False,
        )

        # Display success message and redirect with the anchor
        messages.success(self.request, 'Thank you, we will notify you of product availability.')
        return redirect(reverse('homepage') + '#notification_form')

    def form_invalid(self, form):
        # Simply render the form with the context
        context = self.get_context_data(form=form)
        return self.render_to_response(context)

def track_ar_usage(request):
    # Track the AR usage
    user = request.user if request.user.is_authenticated else None
    anonymous_user_id = None

    if not user:
        # Get session key or generate a UUID
        anonymous_user_id = request.session.session_key or str(uuid.uuid4())

    if request.method == "POST":
        # Save the usage data
        ARUsage.objects.create(
            user=user,
            anonymous_user_id=anonymous_user_id,
            count=1  # Or any count logic you need
        )

        return JsonResponse({"status": "success"})
    return JsonResponse({"status": "error"}, status=400)


def track_model_usage(request):
    # Track the AR usage
    user = request.user if request.user.is_authenticated else None
    anonymous_user_id = None

    if not user:
        # Get session key or generate a UUID
        anonymous_user_id = request.session.session_key or str(uuid.uuid4())

    if request.method == "POST":
        # Save the usage data
        ModelUsage.objects.create(
            user=user,
            anonymous_user_id=anonymous_user_id,
            count=1  # Or any count logic you need
        )

        return JsonResponse({"status": "success"})
    return JsonResponse({"status": "error"}, status=400)





def about_page(request):
    return render(request,
                  template_name="about.html",
                  context={"title": "About"})


def privacy_page(request):
    return render(request,
                  template_name="privacy.html",
                  context={"title": "Privacy Policy"})


def terms_page(request):
    return render(request,
                  template_name="terms.html",
                  context={"title": "Terms of Use"})


def cookie_page(request):
    return render(request,
                  template_name="cookie_policy.html",
                  context={"title": "Cookie Policy"})


def contact_page(request):
    form = ContactModelForm(request.POST or None)

    if request.method == "POST":
        form = ContactModelForm(request.POST)
        if form.is_valid():
            #Save the form data to the database
            obj = form.save()

            #Send an email to your custom email address
            subject = 'Contact Form'
            message = f"Name: {obj.full_name}\nEmail: {obj.email}\n\nSubject:{obj.subject}\n\nMessage:{obj.content}"
            from_email = settings.DEFAULT_FROM_EMAIL
            to_email = SUPPORT_EMAIL

            send_mail(subject, message, from_email, [to_email])

            messages.success(request, f'Thanks for reaching out. Your message has been sent')

            return redirect('contact')
        else:
            print(f"the form errors are: {form.errors}")

    return render(request,
                  template_name="form.html",
                  context={"title": "feedback & enquiry", "form": form})


def register_view(request):
    form = RegisterForm()

    if request.method == "POST":
        form = RegisterForm(request.POST)
        
        if form.is_valid():
            print("form is valid")
            # Save the user and create the user object
            user = form.save()
            username = form.cleaned_data.get('username')
            
            # Generate the verification token
            token = default_token_generator.make_token(user)
            print(token)
            
            # Get current site and build the full verification URL dynamically
            current_host = settings.ALLOWED_HOSTS[0]
            scheme = "https" if request.is_secure() else "http"
            verification_link = reverse('verify_email', args=[user.id, token])
            full_verification_url = f"{scheme}://{current_host}{verification_link}"
            
            # Send the email
            subject = "Verify Your Email"
            message = (
                f"Hi {username},\n\n"
                f"Please verify your email address by clicking the link below:'\n"
                f"{full_verification_url}'\n\n"
                "Best regards,\nJustVybz Team"
            )
            from_email = settings.DEFAULT_FROM_EMAIL
            to_email = user.email

            send_mail(subject, message, from_email, [to_email])

            # Log the user in and redirect to the homepage
            login(request, user)

            # Show a success message
            messages.success(request, "Registration successful. Please check your email to verify your account.")

            return redirect("homepage")
        else:
            for msg in form.error_messages:
                print(form.error_messages[msg])

    return render(request, "register.html", {"title": "Register", "form": form})


def verify_email(request, user_id, token):
    try:
        user = get_user_model().objects.get(id=user_id)
        
        if default_token_generator.check_token(user, token):
            user.is_active = True
            if hasattr(user, 'is_email_verified'):
                user.is_email_verified = True
                user.email_verification_token = None
                user.email_verification_sent_at = None
            user.save()
            messages.success(request, "Your email has been verified successfully!")
            return redirect('login')  # Redirect to login page
        else:
            messages.error(request, "Invalid or expired verification link.")
            return redirect('homepage')  # Redirect to home or error page
    except get_user_model().DoesNotExist:
        messages.error(request, "User does not exist.")
        return redirect('invalid_link')

def invalidlink_view(request):
    from django.http import HttpResponse
    return HttpResponse('Invalid verification link', content_type='text/html')

def custom_404(request, exception):
    return render(request, '404.html', status=404)

def custom_500(request):
    """
    Custom 500 error handler with logging and fallback.
    """
    import logging
    import traceback
    from django.http import HttpResponse
    
    logger = logging.getLogger(__name__)
    
    # Log the error details
    try:
        # Try to get exception info from request if available
        exc_info = getattr(request, '_exception_info', None)
        if exc_info:
            logger.error(
                f"500 Error: {exc_info[1]}",
                exc_info=exc_info
            )
        else:
            logger.error("500 Internal Server Error (no exception info available)")
    except Exception as log_error:
        logger.error(f"Error logging 500: {log_error}")
    
    # Try to render the 500.html template
    try:
        return render(request, '500.html', status=500)
    except Exception as template_error:
        # If template rendering fails, return a simple error message
        logger.error(f"Error rendering 500.html template: {template_error}")
        logger.error(traceback.format_exc())
        return HttpResponse(
            '<h1>500 Internal Server Error</h1><p>An error occurred. Please check the server logs.</p>',
            status=500,
            content_type='text/html'
        )
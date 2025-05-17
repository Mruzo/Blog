from django.shortcuts import render, redirect, reverse, get_object_or_404
from django.utils import timezone
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from .forms import ContactModelForm, ProductNotificationForm, RegisterForm
from snmov.models import Product, Comment, ReachOut, SiteImage, Testimonials, ProductNotification, About, ARUsage, ModelUsage
from django.contrib import messages
from django.conf import settings
from django.core.mail import send_mail, BadHeaderError
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse, HttpRequest, HttpResponseNotFound
from django.views.generic.edit import DeleteView
from django.views.generic import TemplateView, FormView, ListView
from django.template.loader import render_to_string
from django.conf import settings
import random
import uuid
from django.contrib.auth import login, logout, authenticate, get_user_model
from django.contrib.auth.models import User
from django.contrib.auth.tokens import PasswordResetTokenGenerator, default_token_generator
from django.db.models.signals import post_save
from django.contrib.contenttypes.models import ContentType
from django.db.models import Prefetch
from django.dispatch import receiver
from snm.settings.base import DEFAULT_FROM_EMAIL, SUPPORT_EMAIL
from django.contrib.sites.models import Site
from django.contrib.sites.shortcuts import get_current_site


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    def _make_hash_value(self, user, timestamp):
        return f"{user.pk}{timestamp}{user.is_active}"

email_verification_token = EmailVerificationTokenGenerator()


class HomePageView(FormView, TemplateView):
    template_name = 'home.html'
    form_class = ProductNotificationForm
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # Fetch testimonials and products
        testimonials = Testimonials.objects.all()
        available_products = Product.objects.filter(available=True)
        unavailable_products = Product.objects.filter(available=False)

        # Prefetch related SiteImage objects for available and unavailable products
        image_prefetch = Prefetch(
            'images',
            queryset=SiteImage.objects.exclude(image__isnull=True).exclude(image=''),
            to_attr='product_images'
        )

        available_products = available_products.prefetch_related(image_prefetch)
        unavailable_products = unavailable_products.prefetch_related(image_prefetch)

        # Create discounted_products list
        discounted_products = [
            {
                'title': product.title,
                'original_price': product.price,
                'discounted_price': product.get_discounted_price(),
                'discount_percentage': product.discount_percentage,
                'images': product.product_images  # Include preloaded images
            }
            for product in available_products
            if product.discount_percentage > 0
        ]

        # Create a dictionary with product slugs and their respective GLTF model file paths
        product_urls = {
            product.slug: {
                'gltf': product.gltf_model.url if product.gltf_model else '',
                'usdz': product.usdz_model.url if product.usdz_model else ''
            }
            for product in available_products
        }

        # Select a random picture for the meta tag
        all_available_pictures = [img for product in available_products for img in product.product_images]
        random_image_url = random.choice(all_available_pictures).image.url if all_available_pictures else 'https://justvybz.com/static/snmov/img/default-product.jpg'

        unavailable_pictures = SiteImage.objects.filter(
            product__in=unavailable_products  # Ensure filtering by product, not content_type
        ).exclude(image__isnull=True).exclude(image='')



        # Add these to the context
        context.update({
            'available_products': available_products,
            'discounted_products': discounted_products,
            'unavailable_products': unavailable_products,
            'unavailable_pictures': unavailable_pictures,
            'testimonials': testimonials,
            'about': About.objects.first(),
            'product_urls': product_urls,
            'random_image_url': random_image_url, 
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
            [SUPPORT_EMAIL],  # To email
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
            # Token is valid, activate the user
            user.is_active = True
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
    return render(request, "invalid_link.html", {"message": "Invalid verification link"})

def custom_404(request, exception):
    return render(request, '404.html', status=404)

def custom_500(request):
    return render(request, '500.html', status=500)
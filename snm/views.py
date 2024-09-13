from django.shortcuts import render, redirect, reverse
from django.utils import timezone
from .forms import ContactModelForm, ProductNotificationForm
from snmov.models import Product, Comment, ReachOut, SiteImage, Testimonials, ProductNotification, About, ARUsage, ModelUsage
from django.contrib import messages
from django.conf import settings
from django.core.mail import send_mail, BadHeaderError
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.views.generic.edit import DeleteView
from django.views.generic import TemplateView, FormView
from django.conf import settings
from random import sample
import uuid


class HomePageView(FormView, TemplateView):
    template_name = 'home.html'
    form_class = ProductNotificationForm
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Fetch pictures, testimonials, and products
        pictures = SiteImage.objects.filter(content_type__model='product')
        testimonials = Testimonials.objects.all()
        available_products = Product.objects.filter(available=True)
        unavailable_products = Product.objects.filter(available=False)
        

        # Create a dictionary with product slugs and their respective GLTF model file paths
        product_urls = {product.gltf_model: product.gltf_model if product.gltf_model else '' for product in available_products}
        
        # Prefetch related SiteImage objects for better performance
        available_pictures = pictures.filter(object_id__in=available_products.values('id'))
        unavailable_pictures = pictures.filter(object_id__in=unavailable_products.values('id'))
        
        # Add these to the context
        context.update({
            'available_products': available_products,
            'available_pictures': available_pictures,
            'unavailable_pictures': unavailable_pictures,
            'testimonials': testimonials,
            'about': About.objects.first(),
            'product_urls': product_urls, 
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
            [settings.DEFAULT_TO_EMAIL],  # To email
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
            from_email = 'justvybz@justvybz.com'
            to_email = 'uzo@justvybz.com'

            send_mail(subject, message, from_email, [to_email])

            messages.success(request, f"Thanks for reaching out. Your message has been sent")

            return redirect('contact')

    return render(request,
                  template_name="form.html",
                  context={"title": "feedback & enquiry", "form": form})



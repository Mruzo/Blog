from django.shortcuts import render, redirect
from django.utils import timezone
from .forms import ContactModelForm, ProductNotificationForm
from snmov.models import Product, Comment, ReachOut, SiteImage, Testimonials, ProductNotification, About
from django.contrib import messages
from django.conf import settings
from django.core.mail import send_mail, BadHeaderError
from django.http import HttpResponse, HttpResponseRedirect
from django.views.generic.edit import DeleteView
# from .settings.pro import EMAIL_HOST_USER
from random import sample



def home_page(request):
    pictures = SiteImage.objects.filter(content_type__model='product')
    testimonials = Testimonials.objects.all()

    # Filter available and unavailable products
    available_products = Product.objects.filter(available=True)
    unavailable_products = Product.objects.filter(available=False)

    # Prefetch related SiteImage objects for better performance
    available_pictures = pictures.filter(object_id__in=available_products.values('id'))
    unavailable_pictures = pictures.filter(object_id__in=unavailable_products.values('id'))

    # Process Notify Me form
    if request.method == 'POST':
        form = ProductNotificationForm(request.POST)
        if form.is_valid():
            first_name = form.cleaned_data['first_name']
            last_name = form.cleaned_data['last_name']
            email = form.cleaned_data['email']
            products = form.cleaned_data['products']

            # Save notifications for each selected product
            for product in products:
                ProductNotification.objects.create(
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                    product=product,
                    created_at=timezone.now()
                )

            # Send confirmation email (optional)
            # send_mail(
            #     'Notification Confirmation',
            #     'Thank you, we will only notify you of product availability.',
            #     settings.DEFAULT_FROM_EMAIL,
            #     [email],
            #     fail_silently=True,
            # )

            # Display success message
            messages.success(request, 'Thank you, we will only notify you of product availability.')
            return redirect(home_page)
    else:
        form = ProductNotificationForm()

    about_us = About.objects.first()


    context = {
        'available_pictures': available_pictures,
        'unavailable_pictures': unavailable_pictures,
        'testimonials': testimonials,
        'form': form,
        'about': about_us
    }

    return render(request, 'home.html', context)


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
            subject = 'New Contact Form Submission'
            message = f"Name: {obj.full_name}\nEmail: {obj.email}\nMessage:{obj.content}"
            from_email = 'justvybz@justvybz.com'
            to_email = 'uzo@justvybz.com'

            send_mail(subject, message, from_email, [to_email])

            messages.success(request, f"Thanks for reaching out. Your message has been sent")

            return redirect('contact')

    return render(request,
                  template_name="form.html",
                  context={"title": "Contact Us", "form": form})



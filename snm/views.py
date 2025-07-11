from django.shortcuts import render, redirect, get_object_or_404, reverse
from .forms import ContactModelForm, RegisterForm
from snmov.models import Article,Comment, ReachOut, About, CraftCategory, Craft, CraftImage
from django.contrib import messages
from django.contrib.auth import login, logout, authenticate, get_user_model
from django.contrib.auth.models import User
from django.core.mail import send_mail, BadHeaderError
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from .settings.pro import EMAIL_HOST_USER
from random import sample
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator, default_token_generator


def home_page(request):
    id_list = Article.objects.all().values_list('id', flat=True)
    if id_list.count() > 2:
        random_profiles_id_list = sample(list(id_list), 3
                                        )
        qs = Article.objects.filter(id__in=random_profiles_id_list)
    else:
        qs = id_list
    context = {'article_list': qs}
    return render(request, "home.html", context)


def home_list(request):
    id_list = Article.objects.all().values_list('id', flat=True)

    if id_list.count() > 2:
        random_profiles_id_list = sample(list(id_list), 3)
        qs = Article.objects.filter(id__in=random_profiles_id_list)
    else:
        qs = Article.objects.all()  # Show all articles if fewer than 3 exist

    # Attach media (either gif or image) to each article in the queryset
    article_list = []
    for article in qs:
        # Get the meta image or gif for each article
        article_media = article.get_meta_image()  # get_meta_image() will handle both gif and image
        article_list.append({
            'article': article,
            'media_url': article_media  # This is either the gif URL or the image URL
        })

    context = {'article_list': article_list}
    return render(request, "article_list.html", context)


def about_page(request):
    about_me = About.objects.order_by('-created_at').first()
    return render(request,
                  template_name="about.html",
                  context={"persona": about_me})

def get_craft_categories(request):
    categories = CraftCategory.objects.all()
    context = {'craft_categories':categories}
    return render(request, "craft_categories_list.html",context)

def craft_list(request):
    crafts = Craft.objects.select_related('category').all()
    return render(request, 'craft_list.html', {'crafts': crafts})

def craft_detail(request, craft_id):
    craft = get_object_or_404(Craft, id=craft_id)
    category = craft.category.name
    images = craft.craft_images.all()
    return render(request, 'craft_detail.html', {'craft': craft, 'category': category, 'images': images})


def register_view(request):
    form = RegisterForm()

    if request.method == "POST":
        form = RegisterForm(request.POST)
        
        if form.is_valid():
            print("form is valid")
            
            # Create the user but don't save yet
            user = form.save(commit=False)
            # Set user as inactive until email verification
            user.is_active = False
            # Save the user to get an ID
            user.save()
            
            # Generate the verification token for the actual user
            token = default_token_generator.make_token(user)
            print(f"Token for user {user.username}: {token}")
            
            # Get current site and build the full verification URL dynamically
            current_host = settings.ALLOWED_HOSTS[0]
            scheme = "https" if request.is_secure() else "http"
            verification_link = reverse('verify_email', args=[user.id, token])
            full_verification_url = f"{scheme}://{current_host}{verification_link}"
            
            # Send the email
            subject = "Verify Your Email"
            message = (
                f"Hi {user.username},\n\n"
                f"Thanks for signing up. Please verify your email address by clicking the link below:\n"
                f"{full_verification_url}\n\n"
                "Best regards,\nTeam Uzo"
            )
            from_email = settings.DEFAULT_FROM_EMAIL
            to_email = user.email

            try:
                send_mail(subject, message, from_email, [to_email])
                # Show a success message
                messages.success(request, "Registration successful. Please check your email to verify your account.")
            except Exception as e:
                # If email fails, delete the user and show error
                user.delete()
                messages.error(request, "Registration failed. Please try again.")
                print(f"Email sending failed: {e}")

            return redirect("homepage")
        else:
            for msg in form.error_messages:
                messages.error(request, "Registration was unsuccessful")
                print(form.error_messages[msg])

    return render(request, "register.html", {"title": "Register", "form": form})


def validate_username(request):
    username = request.GET.get('username', None)
    data = {
        'is_taken': User.objects.filter(username__iexact=username).exists()
    }
    if data['is_taken']:
        data['error_message'] = 'A user with this username already exists.'
    return JsonResponse(data)

def verify_email(request, user_id, token):
    try:
        user = get_user_model().objects.get(id=user_id)
        
        if default_token_generator.check_token(user, token):
            # Token is valid, activate the user
            user.is_active = True
            user.save()
            login(request, user)  # Log in after verification
            messages.success(request, "Your email has been verified successfully!")
            return redirect('homepage')  # Redirect to homepage
        else:
            messages.error(request, "Invalid or expired verification link.")
            return redirect('homepage')  # Redirect to home or error page
    except get_user_model().DoesNotExist:
        messages.error(request, "User does not exist.")
        return redirect('homepage')

def invalidlink_view(request):
    return render(request, "invalid_link.html", {"message": "Invalid verification link"})

def logout_request(request):
    logout(request)
    messages.info(request, "Logged out successfully!")
    return redirect('/')

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
            obj = form.save()
            # Send mail
            try:
                send_mail(
                    subject=f"New reachout: {obj.full_name}",
                    message=f"{obj.full_name}\n\n{obj.email}\n\n{obj.content}",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=['chrisuzoewulu@gmail.com'],
                    fail_silently=False,
                )
                response_data = {'success': True, 'message': "Thanks for reaching out. Tap logo to return home."}
            except Exception as e:
                response_data = {'success': False, 'message': "There was an error sending the email."}

            # Return JSON response for AJAX
            if request.is_ajax():
                return JsonResponse(response_data)
            else:
                return redirect('contact_page')  # Redirect to clear form data

        else:
            response_data = {'success': False, 'message': "There was an error with your submission. Please try again."}
            if request.is_ajax():
                return JsonResponse(response_data)

    return render(request, "form.html", { "title":"Reach out", "form": form})



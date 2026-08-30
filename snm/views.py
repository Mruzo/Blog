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
    # TEMP message removed after preview
    return render(request, "home.html", context)


def home_list(request):
    id_list = list(Article.objects.published().values_list('id', flat=True))

    if len(id_list) > 2:
        random_ids = sample(id_list, 3)
        qs = Article.objects.published().filter(id__in=random_ids)
    else:
        qs = Article.objects.published().all()

    context = {'article_list': qs}
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

def verify_contact_email(request, contact_id, token):
    try:
        contact = ReachOut.objects.get(id=contact_id)
        
        # Check if token matches
        if contact.verification_token == token:
            # Token is valid, mark contact as verified
            contact.is_verified = True
            contact.save()
            
            # Send the actual contact email to admin
            try:
                send_mail(
                    subject=f"New reachout: {contact.full_name}",
                    message=f"{contact.full_name}\n\n{contact.email}\n\n{contact.content}",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=['chrisuzoewulu@gmail.com'],
                    fail_silently=False,
                )
                messages.success(request, "Your contact form has been verified and sent successfully!")
            except Exception as e:
                messages.error(request, "Contact form verified but there was an error sending the message. Please try again.")
                print(f"Email sending failed: {e}")
            
            return redirect('homepage')  # Redirect to homepage
        else:
            messages.error(request, "Invalid or expired verification link.")
            return redirect('homepage')  # Redirect to home or error page
    except ReachOut.DoesNotExist:
        messages.error(request, "Contact form does not exist.")
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
            # Create the contact form but don't save yet
            obj = form.save(commit=False)
            # Set as unverified initially
            obj.is_verified = False
            # Generate a simple verification token
            import uuid
            obj.verification_token = str(uuid.uuid4())
            # Save the contact form
            obj.save()
            
            # Get current site and build the full verification URL dynamically
            current_host = settings.ALLOWED_HOSTS[0]
            scheme = "https" if request.is_secure() else "http"
            verification_link = reverse('verify_contact_email', args=[obj.id, obj.verification_token])
            full_verification_url = f"{scheme}://{current_host}{verification_link}"
            
            # Send verification email
            subject = "Verify Your Contact Form Submission"
            message = (
                f"Hi {obj.full_name},\n\n"
                f"Thanks for reaching out to us. Please verify your email address by clicking the link below:\n"
                f"{full_verification_url}\n\n"
                "Once verified, we'll receive your message and get back to you soon.\n\n"
                "Best regards,\nTeam Uzo"
            )
            from_email = settings.DEFAULT_FROM_EMAIL
            to_email = obj.email

            try:
                send_mail(subject, message, from_email, [to_email])
                # Show a success message
                messages.success(request, "Contact form submitted successfully. Please check your email to verify your submission.")
                response_data = {'success': True, 'message': "Thanks for reaching out. Please check your email to verify your submission."}
            except Exception as e:
                # If email fails, delete the contact form and show error
                obj.delete()
                messages.error(request, "Contact form submission failed. Please try again.")
                response_data = {'success': False, 'message': "There was an error sending the verification email. Please try again."}
                print(f"Email sending failed: {e}")

            # Return JSON response for AJAX
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse(response_data)
            else:
                return redirect('contact')  # Redirect to clear form data

        else:
            response_data = {'success': False, 'message': "There was an error with your submission. Please try again."}
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse(response_data)

    return render(request, "form.html", { "title":"Reach out", "form": form})


def delete_user_data(request, user_id):
    """Delete all user data in compliance with GDPR right to erasure"""
    try:
        user = User.objects.get(id=user_id)
        
        # Get user's email for contact form deletion
        user_email = user.email
        
        # Delete comments by this user first
        from snmov.models import Comment
        Comment.objects.filter(user_name=user).delete()
        
        # Delete contact form submissions by this user's email
        from snmov.models import ReachOut
        ReachOut.objects.filter(email=user_email).delete()
        
        # Delete user account last (this cascades to related data)
        user.delete()
        
        # Note: Analytics data (IP-based) would need manual deletion
        # as it's stored in JSON files, not database
        
        messages.success(request, "All your personal data has been successfully deleted.")
        return redirect('homepage')
        
    except User.DoesNotExist:
        messages.error(request, "User not found.")
        return redirect('homepage')

def data_access_request(request, user_id):
    """Provide user data in compliance with GDPR right to access"""
    try:
        user = User.objects.get(id=user_id)
        
        # Collect all user data
        user_data = {
            'user_info': {
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'date_joined': user.date_joined.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
            },
            'comments': list(Comment.objects.filter(user_name=user).values(
                'comment_cont', 'comment_date', 'comment_post__title'
            )),
            'contact_submissions': list(ReachOut.objects.filter(email=user.email).values(
                'full_name', 'subject', 'content', 'created_at'
            )),
        }
        
        # Return JSON response with user data
        from django.http import JsonResponse
        return JsonResponse(user_data, safe=False)
        
    except User.DoesNotExist:
        messages.error(request, "User not found.")
        return redirect('homepage')



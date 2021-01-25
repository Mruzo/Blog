from django.shortcuts import render, redirect
from .forms import ContactModelForm, ContactForm
from snmov.models import Article, Comment, ReachOut
from django.contrib import messages
from django.core.mail import send_mail, BadHeaderError
from django.http import HttpResponse, HttpResponseRedirect
from .settings.pro import EMAIL_HOST_USER
from random import sample


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
            messages.success(request, f"Thanks for reaching out")
            obj = form.save()
            return redirect(contact_page)

    return render(request,
                  template_name="form.html",
                  context={"title": "Say Hello!", "form": form})


def contact_page_m(request):
    form = ContactForm(request.POST or None)
    if request.method == 'POST':
        form = ContactForm(request.POST)
        if form.is_valid():
            # full_name = form.cleaned_data['full_name']
            subject = form.cleaned_data['subject']
            from_email = form.cleaned_data['from_email']
            message = form.cleaned_data['message']
            try:
                send_mail(subject, message, from_email, ['chris@misteruzo.com'], fail_silently=True)
                messages.success(request, f"Thanks for reaching out")
            except BadHeaderError:
                return HttpResponse('Invalid header found.')
            return redirect('/contact')
    return render(request, "contact.html", {"title": "", "form": form})



# def feedback_form(request):
#     form = FeedbackForm(request.POST or None)
#     if request.method == 'POST':
#         form = FeedbackForm(request.POST)
#         if form.is_valid():
#             subject = 'Feedback'
#             from_email = form.cleaned_data['from_email']
#             message = form.cleaned_data['message']
#             try:
#                 send_mail(subject, message, from_email, ['sneakymotivator@gmail.com'], fail_silently=True)
#                 messages.success(request, f"Thanks for the feedback")
#             except BadHeaderError:
#                 return HttpResponse('Invalid header found.')
#             return redirect('/')
#         return render(request, "base.html", {"feedback": "Leave a feedback?", "form": form})


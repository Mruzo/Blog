from django.shortcuts import render, redirect
from .forms import ContactModelForm
from snmov.models import Article, Comment, ReachOut
from django.contrib import messages


def home_page(request):
    qs = Article.objects.all()[:5]
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
                  context={"title": "Contact me", "form": form})
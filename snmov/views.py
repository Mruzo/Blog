from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.admin.views.decorators import staff_member_required
from .models import Article, Comment, Preference
from .forms import ArticleModelForm, CommentForm
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth import login, logout, authenticate
from django.contrib import messages


# Create your views here.

def article_list_view(request):
    #list of articles
    qs = Article.objects.all().published()
    if request.user.is_authenticated:
        my_qs = Article.objects.filter(user=request.user)
        qs = (qs | my_qs).distinct()

    return render(request,
                  template_name = 'snmov/list.html',
                  context = {'object_list': qs}
                  )


@staff_member_required
def article_create_view(request):
    form = ArticleModelForm(request.POST or None, request.FILES or None)
    if form.is_valid():
        obj = form.save(commit=False)
        obj.user = request.user
        obj.save()
        form = ArticleModelForm()

    return render(request,
                  template_name = 'form.html',
                  context={'form': form}
                  )


def article_detail_view(request, slug):
    obj = get_object_or_404(Article, slug=slug)

    return render(request,
                  template_name='snmov/home.html',
                  context={'object': obj}
                  )


@login_required
def add_comment_to_article(request, slug):
    post = get_object_or_404(Article, slug=slug)
    if request.method == "POST":
        form = CommentForm(request.POST)
        if form.is_valid():
            comment = form.save(commit=False)
            comment.user_name = request.user
            comment.comment_post = post
            comment.save()
            return redirect(article_detail_view, slug=post.slug)
    else:
        form = CommentForm()

    return render(request,
                  template_name='snmov/formc.html',
                  context={"title": f"Two Cents on {post.title}", "form": form}
                  )


@login_required
def article_preference(request, slug, value):
    if request.method == "POST":
        object = get_object_or_404(Article, slug=slug)
        obj = ""
        valueobj = ""

        try:
            obj = Preference.objects.get(user=request.user, post=object)
            valueobj = obj.value #value of userpreference
            value = int(value)

            if valueobj != value:
                obj.delete()
                upref = Preference()
                upref.user = request.user #current logged in user
                upref.post = object
                upref.value = value

                if value == 1 and valueobj != 1:
                    object.likes += 1
                    object.dislikes -= 1
                elif value == 2 and valueobj != 2:
                    object.dislikes += 1
                    object.likes -= 1
                upref.save()
                object.save()

                return render(request,
                              template_name='snmov/home.html',
                              context={'object': object, 'slug': slug}
                              )
            elif valueobj == value:
                obj.delete()

                if value == 1:
                    object.likes -= 1
                elif value == 2:
                    object.dislikes -= 1

                object.save()

                return render(request,
                              template_name='snmov/home.html',
                              context={'object': object, 'slug': slug}
                              )

        except Preference.DoesNotExist:
            upref = Preference()
            upref.user = request.user
            upref.post = object
            upref.value = value
            value = int(value)

            if value == 1:
                object.likes += 1
            elif value == 2:
                object.dislikes += 1
            upref.save()
            object.save()

            return render(request,
                          template_name='snmov/home.html',
                          context = {'object': object, 'slug': slug})

    else:
        objects = get_object_or_404(Article, slug=slug)

        return render(request,
                      template_name='snmov/home.html',
                      context={'objects': objects, 'slug': slug}
                      )


@staff_member_required
def article_update_view(request, slug):
    obj = get_object_or_404(Article, slug=slug)
    form = ArticleModelForm(request.POST or None, instance=obj)

    if form.is_valid():
        form.save()

    return render(request,
                  template_name = 'form.html',
                  context = {'title': f"Update {obj.title}", "form": form}
                  )


@staff_member_required
def article_delete_view(request, slug):

    obj = get_object_or_404(Article, slug=slug)
    template_name = 'snmov/delete.html'
    if request.method == "POST":
        obj.delete()
        return redirect("/article")

    return render(request,
                  template_name,
                  context={"object": obj}
                  )


# @login_required()
# def comment_delete_view(request, pk):
#
#     obj = get_object_or_404(Comment, pk=pk)
#     template_name = 'snmov/delete.html'
#     if request.method == "POST":
#         obj.delete()
#         return redirect("/article")
#     context = {"object": obj}
#     return render(request, template_name, context)

def logout_request(request):
    logout(request)
    messages.info(request, "Logged out successfully!")
    return redirect('/')


def login_request(request):
    if request.method == 'POST':
        form = AuthenticationForm(request=request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(username=username, password=password)
            if user is not None:
                login(request, user)
                messages.info(request, f"You are now logged in as {username}")
                return redirect("/article")
            else:
                messages.error(request, "Invalid username or password")
        else:
            messages.error(request, "Invalid username or password")
    else:
        messages.error(request, "Invalid username or password")

    form = AuthenticationForm()
    return render(request,
                  template_name="snmov/login.html",
                  context={"title": "Log In", "form": form},
                  )


def register_view(request):
    if request.method == "POST":
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            username = form.cleaned_data.get('username')
            login(request, user)
            return redirect("/article")
        else:
            for msg in form.error_messages:
                print(form.error_messages[msg])

    form1 = UserCreationForm
    return render(request,
                  template_name = "snmov/register.html",
                  context={"title": "Register", "form1": form1}
                  )
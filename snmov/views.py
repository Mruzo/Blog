from django.shortcuts import render, redirect, get_object_or_404, reverse
from django.contrib.auth.decorators import login_required
from django.contrib.admin.views.decorators import staff_member_required
from .models import Article, Comment, Preference
from .forms import ArticleModelForm, CommentForm, RegisterForm
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.models import User
from django.contrib import messages
from django.http import JsonResponse
from django.views import generic
from django.core.paginator import Paginator, EmptyPage,PageNotAnInteger
from django.template.loader import render_to_string
from django.urls import reverse_lazy
from django.views.generic.edit import DeleteView


# Create your views here.

class article_list_view(generic.ListView):
    model = Article
    template_name = 'snmov/list.html'
    context_object_name = 'object_list'
    paginate_by = 4

# def article_list_view(request):
#     #list of articles
#     qs = Article.objects.all().published()
#     # if request.user.is_authenticated:
#     #     my_qs = Article.objects.filter(user=request.user)
#     #     qs = (qs | my_qs).distinct()
#
#     return render(request,
#                   template_name='snmov/list.html',
#                   context={'object_list': qs}
#                   )


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
    template_name = ['snmov/home.html']
    context = {}
    context['object'] = obj
    context['meta'] = obj.as_meta()
    return render(request, template_name, context)


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
            messages.success(request, 'Thank You!')
            return redirect(article_detail_view, slug=post.slug)
    else:
        form = CommentForm()

    return render(request,
                  template_name='snmov/formc.html',
                  context={"title": f"Comment on {post.title}", "form": form}
                  )

# def add_comment_to_article(request, slug):
#     post = get_object_or_404(Article, slug=slug)
#     formc = CommentForm()
#     context = {'form': formc, "title": {post.title}}
#     html_form = render_to_string('snmov/formc.html',
#                                  context,
#                                  request=request,
#                                  )
#     return JsonResponse({'html_form': html_form})


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


# def comment_delete_view(request, pk, user):
#     obj = get_object_or_404(Comment, pk=pk, user=user)
#     # if obj.user_name == request.user:
#     # template_name = 'snmov/deletec.html'
#     data = dict()
#     if request.method == "POST":
#         obj.delete()
#         data['form_is_valid'] = True
#         objs = Comment.objects.all()
#         data['comment_list'] = render_to_string('snmov/home.html', {'objs': objs})
#     else:
#         context = {'obj': obj}
#         data['deletec_html'] = render_to_string('snmov/deletec.html',
#                                                 context,
#                                                 request=request,)
#     return JsonResponse(data)


def comment_delete_view(request, slug, pk):
    obj = get_object_or_404(Comment, comment_post__slug=slug, pk=pk)
    template_name = 'snmov/deletec.html'
    if request.method == 'POST':
        obj.user = request.user
        obj.delete()
        messages.info(request, 'Comment deleted')
        return redirect('article_detail', obj.comment_post.slug)
    return render(request, template_name, {'obj': obj})


def logout_request(request):
    logout(request)
    messages.info(request, "Logged out successfully!")
    return redirect('/')


def register_view(request):
    if request.method == "POST":
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            username = form.cleaned_data.get('username')
            login(request, user)
            return redirect("/article")
        else:
            for msg in form.error_messages:
                form.error_messages[msg]

    form1 = RegisterForm
    return render(request,
                  template_name = "snmov/register.html",
                  context={"title": "Register", "form1": form1}
                  )

def validate_username(request):
    username = request.GET.get('username', None)
    data = {
        'is_taken': User.objects.filter(username__iexact=username).exists()
    }
    if data['is_taken']:
        data['error_message'] = 'A user with this username already exists.'
    return JsonResponse(data)

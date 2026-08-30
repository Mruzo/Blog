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
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.template.loader import render_to_string
from django.urls import reverse_lazy
from django.views.generic.edit import DeleteView
from django.core.mail import send_mail
from django.conf import settings


# Create your views here.

class article_list_view(generic.ListView):
    model = Article
    template_name = 'snmov/list.html'
    context_object_name = 'object_list'
    paginate_by = 4

    def get_queryset(self):
        sort_by = self.request.GET.get('sort', 'latest')
        qs = Article.objects.published()

        if sort_by == 'earliest':
            return qs.order_by('publish_date')
        elif sort_by == 'title':
            return qs.order_by('title')
        else:
            return qs.order_by('-publish_date')


@staff_member_required
def article_create_view(request):
    form = ArticleModelForm(request.POST or None, request.FILES or None)
    if form.is_valid():
        obj = form.save(commit=False)
        obj.user = request.user
        obj.save()
        form = ArticleModelForm()

    return render(request,
                  template_name='form.html',
                  context={'form': form}
                  )


def article_detail(request, slug):
    article = get_object_or_404(Article.objects.published(), slug=slug)
    structured_data = {
        'type': 'Article',
        'title': article.title,
        'description': article.content[:200],  # First 200 characters as description
        'publish_date': article.publish_date,
        'modified_date': article.updated,
        'url': request.build_absolute_uri(),
        'gif': article.gif_model.url if article.gif_model else None,
        'image': article.image.url if article.image else None
    }
    context = {
        'object': article,
        'meta_data': article.generate_meta_tags(),
        'structured_data': structured_data
    }
    return render(request, 'snmov/detail.html', context)


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
            return redirect(article_detail, slug=post.slug)
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
        article = get_object_or_404(Article, slug=slug)
        value = int(value)

        try:
            pref = Preference.objects.get(user=request.user, post=article)
            previous_value = pref.value

            if previous_value != value:
                pref.delete()
                upref = Preference(user=request.user, post=article, value=value)

                if value == 1 and previous_value != 1:
                    article.likes += 1
                    article.dislikes -= 1
                elif value == 2 and previous_value != 2:
                    article.dislikes += 1
                    article.likes -= 1
                upref.save()
                article.save()
            else:
                pref.delete()

                if value == 1:
                    article.likes -= 1
                elif value == 2:
                    article.dislikes -= 1

                article.save()

        except Preference.DoesNotExist:
            Preference.objects.create(user=request.user, post=article, value=value)

            if value == 1:
                article.likes += 1
            elif value == 2:
                article.dislikes += 1
            article.save()

    return redirect('article_detail', slug=slug)


@staff_member_required
def article_update_view(request, slug):
    obj = get_object_or_404(Article, slug=slug)
    form = ArticleModelForm(request.POST or None, instance=obj)

    if form.is_valid():
        form.save()

    return render(request,
                  template_name='form.html',
                  context={'title': f"Update {obj.title}", "form": form}
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
#         data['comment_list'] = render_to_string('snmov/detail.html', {'object': obj.comment_post})
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


def validate_username(request):
    username = request.GET.get('username', None)
    data = {
        'is_taken': User.objects.filter(username__iexact=username).exists()
    }
    if data['is_taken']:
        data['error_message'] = 'A user with this username already exists.'
    return JsonResponse(data)

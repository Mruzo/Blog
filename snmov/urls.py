from django.urls import path
from .views import (
    article_list_view,
    article_detail,
    article_create_view,
    article_update_view,
    article_delete_view,
    add_comment_to_article,
    article_preference,
    comment_delete_view,
)


urlpatterns = [
    path('', article_list_view.as_view(), name='article_list'),
    path('<str:slug>/', article_detail, name='article_detail'),
    path('<str:slug>/update/', article_update_view, name='article_update'),
    path('<str:slug>/delete/', article_delete_view, name='article_delete'),
    path('<str:slug>/comment/', add_comment_to_article, name='add_comment'),
    path('<str:slug>/preference/<int:value>/', article_preference, name='article_preference'),
    path('<str:slug>/comment/<int:pk>/delete/', comment_delete_view, name='comment_delete'),
]

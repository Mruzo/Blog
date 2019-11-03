from django.urls import path
from .views import (
    article_detail_view,
    article_list_view,
    article_update_view,
    article_delete_view,
    add_comment_to_article,
    article_preference,
)


urlpatterns = [
    path('', article_list_view),
    path('<str:slug>/', article_detail_view, name='article_detail'),
    path('<str:slug>/addc/', add_comment_to_article),
    path('<str:slug>/userpreference/<int:value>/', article_preference, name='artclepreference'),
    path('<str:slug>/edit/', article_update_view),
    path('<str:slug>/delete/', article_delete_view),
]
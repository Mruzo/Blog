from django.urls import path
from .views import (
    ProductDetailView,
    Product_list_view,
    article_update_view,
    article_delete_view,
    add_comment_to_article,
    article_preference,
    comment_delete_view,
    categories
)


urlpatterns = [
    # path('', article_list_view, name='article'),
    path('categories/', categories, name='categories'),
    path('', Product_list_view.as_view(), name='product'),
    path('<str:slug>/', ProductDetailView.as_view(), name='product_detail'),
    # path('<str:slug>/addc/', add_comment_to_article, name='add_comment'),
    # path('<str:slug>/userpreference/<int:value>/',
    #      article_preference, name='artclepreference'),
    # path('<str:slug>/edit/', article_update_view),
    # path('<str:slug>/delete/', article_delete_view),
    # path('<str:slug>/<int:pk>/delete/',
    #      comment_delete_view, name='delete_comment'),
]

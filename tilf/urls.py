from django.urls import path
from . import views

urlpatterns = [
    path('', views.ComicView.as_view(), name='comic_list'),
    path('seasons/<int:pk>/', views.SeasonDetailView.as_view(), name='season_detail'),
    path('seasons/<int:season_id>/episodes/<int:pk>/', views.EpisodeDetailView.as_view(), name='episode_detail'),
    path('seasons/<int:season_id>/episodes/<int:pk>/add-comment/', views.EpisodeDetailView.as_view(), name='add_comment'),
    path('seasons/<int:season_id>/episodes/<int:pk>/delete-comment/<int:comment_id>/', views.delete_comment, name='delete_comment'),
    path('preview/seasons/<int:season_id>/episodes/<int:pk>/', views.EpisodePreviewView.as_view(), name='episode_preview'),
]

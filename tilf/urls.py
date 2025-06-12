from django.urls import path
from . import views

urlpatterns = [
    path('', views.ComicView.as_view(), name='season_list'),
    path('seasons/<int:pk>/', views.SeasonDetailView.as_view(), name='season_detail'),
    path('seasons/<int:season_id>/episodes/<int:pk>/', views.EpisodeDetailView.as_view(), name='episode_detail'),
]

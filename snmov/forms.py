from django import forms
from .models import Product, Comment, ReachOut
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm


class ArticleForm(forms.Form):
    title = forms.CharField()
    slug = forms.SlugField()
    content = forms.CharField(widget=forms.Textarea)


class ArticleModelForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = ['title', 'slug', 'content', 'publish_date']

        def clean_title(self, *args, **kwargs):
            instance = self.instance
            title = self.cleaned_data.get('title')
            qs = Product.objects.filter(title__iexact=title)
            if instance is not None:
                qs = qs.exclude(pk=instance.pk)
            if qs.exists():
                raise forms.ValidationError(
                    "This tile has already been useed. Pleaser try another")
            return title


class ReachOutForm(forms.ModelForm):
    class Meta:
        model = ReachOut
        fields = ['full_name', 'email', 'subject', 'content']


class CommentForm(forms.ModelForm):
    comment_cont = forms.CharField(widget=forms.Textarea, label="")

    class Meta:
        model = Comment
        fields = ['comment_cont']

    def clean_user(self):
        if self.instance and self.instance.pk:
            return self.instance.user_name
        else:
            return self.cleaned_data['user_name']


class RegisterForm(UserCreationForm):
    username = forms.CharField(label="Username")
    email = forms.EmailField(label="Email")
    first_name = forms.CharField(label="First Name")
    last_name = forms.CharField(label="Last Name")

    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'email', 'username')

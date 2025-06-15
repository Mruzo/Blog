from django import forms
from .models import ComicComment

class ComicCommentForm(forms.ModelForm):
    comment_cont = forms.CharField(
        widget=forms.Textarea(attrs={
            'rows': 2,
            'class': 'form-control',
            'placeholder': 'Write your comment here...',
            'style': 'resize: none; width: 100%;'

        }),
        label=""
    )
    class Meta:
        model = ComicComment
        fields = ['comment_cont']

    def clean_user(self):
        if self.instance and self.instance.pk:
            return self.instance.user_name
        else:
            return self.cleaned_data['user_name'] 
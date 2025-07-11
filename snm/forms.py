from django import forms
from snmov.models import ReachOut
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User


class ContactModelForm(forms.ModelForm):

    class Meta:
        model = ReachOut
        fields = ['full_name', 'email', 'subject', 'content']
        labels = {
            'content': 'Message',
                  }

    def clean_email(self, *args, **kwargs):
        email = self.cleaned_data.get('email')
        if not email.endswith(".com"):
            raise forms.ValidationError("Please use an email that ends with .com")
        return email


class RegisterForm(UserCreationForm):
    username = forms.CharField(label="Username")
    email = forms.EmailField(label="Email")
    first_name = forms.CharField(label="First Name")
    last_name = forms.CharField(label="Last Name")

    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'email', 'username', 'password1', 'password2')

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if User.objects.filter(email=email).exists():
            raise forms.ValidationError("A user with this email address already exists.")
        return email

# class FeedbackForm(forms.Form):
#     from_email = forms.EmailField(required=True, label="Email")
#     message = forms.CharField(widget=forms.Textarea, required=True)

from django import forms
from snmov.models import ReachOut


class ContactModelForm(forms.ModelForm):

    class Meta:
        model = ReachOut
        fields = ['full_name', 'email', 'subject', 'content']

    def clean_email(self, *args, **kwargs):
        email = self.cleaned_data.get('email')
        if not email.endswith(".com"):
            raise forms.ValidationError("Please use an email that ends with .com")
        return email
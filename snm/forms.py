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

class ContactForm(forms.Form):
    from_email = forms.EmailField(required=True, label="Email")
    subject = forms.CharField(required=True)
    message = forms.CharField(widget=forms.Textarea, required=True)

    def clean_email(self, *args, **kwargs):
        from_email = self.cleaned_data.get('email')
        if not from_email.endswith(".com"):
            raise forms.ValidationError("Please use an email that ends with .com")
        return from_email

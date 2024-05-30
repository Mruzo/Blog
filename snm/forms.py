from django import forms
from snmov.models import ReachOut


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


# class FeedbackForm(forms.Form):
#     from_email = forms.EmailField(required=True, label="Email")
#     message = forms.CharField(widget=forms.Textarea, required=True)

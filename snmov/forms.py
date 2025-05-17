from django import forms
from django.contrib.auth import get_user_model
from .models import Product, Comment, ReachOut, SiteImage, ShippingAddress, ProductNotification
from django.contrib.auth.forms import UserCreationForm

User = get_user_model()

def get_admin_user():
    """Get the admin user (chris) instance"""
    try:
        return User.objects.get(username='chris')
    except User.DoesNotExist:
        return None

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


class ShippingAddressForm(forms.ModelForm):
    class Meta:
        model = ShippingAddress
        fields = [
            'full_name',
            'address_line_1',
            'address_line_2',
            'city',
            'state',
            'postal_code',
            'country_code',
        ]
        widgets = {
            'full_name': forms.TextInput(attrs={'placeholder': 'first and last name'}),
        }

        def __init__(self, *args, **kwargs):
            user = kwargs.pop('user', None)
            super().__init__(*args, **kwargs)

            if user and user.is_authenticated:
                full_name = f"{user.first_name} {user.last_name}".strip()
                self.fields['full_name'].widget.attrs.update({
                'placeholder': full_name or 'Full Name'
                })


class ShippingSelectionForm(forms.Form):
    rate_id = forms.ChoiceField(label="Select Shipping Option")

    def __init__(self, *args, rates=None, **kwargs):
        super().__init__(*args, **kwargs)
        if rates:
            choices = [(r['rate_id'], f"{r['courier_name']} - {r['shipment_charge']['amount']} {r['shipment_charge']['currency']}")
                       for r in rates]
            self.fields['rate_id'].choices = choices


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


class SiteImageForm(forms.ModelForm):
    class Meta:
        model = SiteImage
        fields = ['image', 'caption']

    # def clean_object_id(self):
    #     object_id = self.cleaned_data.get('object_id')
    #     if object_id:
    #         try:
    #             # Ensure the object_id is a valid UUID
    #             from uuid import UUID
    #             UUID(str(object_id))
    #         except ValueError:
    #             raise forms.ValidationError("Enter a valid UUID.")
    #     return object_id

class CustomUserCreationForm(UserCreationForm):
    email = forms.EmailField(required=True)
    first_name = forms.CharField(required=True)
    last_name = forms.CharField(required=True)

    class Meta:
        model = User
        fields = ("username", "email", "first_name", "last_name", "password1", "password2")

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if User.objects.filter(email=email).exists():
            raise forms.ValidationError("This email address is already in use.")
        return email

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data["email"]
        user.first_name = self.cleaned_data["first_name"]
        user.last_name = self.cleaned_data["last_name"]
        if commit:
            user.save()
        return user

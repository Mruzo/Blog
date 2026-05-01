from django import forms
from django.contrib.auth import get_user_model
from .models import Product, Comment, ReachOut, SiteImage, ShippingAddress, ProductNotification, Coupon
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
    
    def clean(self):
        """High Priority: Validate postal code format based on country"""
        cleaned_data = super().clean()
        postal_code = cleaned_data.get('postal_code', '')
        country_code = cleaned_data.get('country_code', '')
        
        if not postal_code or not country_code:
            return cleaned_data
        
        import re
        postal_code = postal_code.strip().upper()
        country_code = country_code.upper()
        
        # Canadian postal code: A1A 1A1 or A1A1A1
        if country_code == 'CA':
            # Remove spaces and validate format
            postal_code_clean = postal_code.replace(' ', '')
            if not re.match(r'^[A-Z]\d[A-Z]\d[A-Z]\d$', postal_code_clean):
                raise forms.ValidationError({
                    'postal_code': 'Invalid Canadian postal code format. Expected format: A1A 1A1'
                })
            # Format with space: A1A 1A1
            cleaned_data['postal_code'] = f"{postal_code_clean[:3]} {postal_code_clean[3:]}"
        
        # US ZIP code: 12345 or 12345-6789 (exactly 5 digits, optionally followed by - and 4 digits)
        elif country_code == 'US':
            # Remove any spaces first
            postal_code_clean = postal_code.replace(' ', '')
            if not re.match(r'^\d{5}(-\d{4})?$', postal_code_clean):
                raise forms.ValidationError({
                    'postal_code': 'Invalid US ZIP code format. Expected format: 12345 or 12345-6789'
                })
            cleaned_data['postal_code'] = postal_code_clean
        
        # For other countries, just return as-is (can be extended later)
        return cleaned_data


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
        fields = ['product', 'content_type', 'object_id', 'image', 'caption']
        widgets = {
            'object_id': forms.TextInput(attrs={'placeholder': 'Enter UUID or ID'})
        }

    def clean(self):
        cleaned_data = super().clean()
        product = cleaned_data.get('product')
        content_type = cleaned_data.get('content_type')
        object_id = cleaned_data.get('object_id')

        # If product is set, clear content_type and object_id
        if product:
            cleaned_data['content_type'] = None
            cleaned_data['object_id'] = None
        # If content_type is set, ensure object_id is valid
        elif content_type and object_id:
            try:
                # Get the model class from content type
                model_class = content_type.model_class()
                # Try to get the object to validate it exists
                model_class.objects.get(id=object_id)
            except (ValueError, model_class.DoesNotExist):
                raise forms.ValidationError("Invalid object ID for the selected content type.")
        
        return cleaned_data


class CouponAdminForm(forms.ModelForm):
    """
    Admin form for Coupon: use HTML5 datetime-local for starts/ends so values persist reliably.

    ModelAdmin replaces model DateTimeField with SplitDateTimeField + AdminSplitDateTime.
    Only swapping the widget for DateTimeInput leaves SplitDateTimeField in place; it then
    expects a list of values and raises "Enter a list of values." Replace the whole field.
    """

    class Meta:
        model = Coupon
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        dt_widget = forms.DateTimeInput(
            format='%Y-%m-%dT%H:%M',
            attrs={'type': 'datetime-local', 'step': '60', 'class': 'vTextField'},
        )
        formats = [
            '%Y-%m-%dT%H:%M',
            '%Y-%m-%dT%H:%M:%S',
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%d %H:%M:%S.%f',
            '%Y-%m-%d %H:%M',
            '%Y-%m-%d',
        ]
        for name in ('starts_at', 'ends_at'):
            if name not in self.fields:
                continue
            old = self.fields[name]
            self.fields[name] = forms.DateTimeField(
                required=old.required,
                widget=dt_widget,
                input_formats=formats,
                label=old.label,
                help_text=old.help_text,
                initial=self.initial.get(name),
            )


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

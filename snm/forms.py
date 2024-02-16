from django import forms
from snmov.models import ReachOut, ProductNotification, Product
from django.core.validators import EmailValidator


class ContactModelForm(forms.ModelForm):

    class Meta:
        model = ReachOut
        fields = ['full_name', 'email', 'subject', 'content']

    def __init__(self, *args, **kwargs):
        super(ContactModelForm, self). __init__(*args, **kwargs)

        for field_name, field in self.fields.items():
            field.widget.attrs['class'] = 'subtext-btn-sm'
            field.widget.attrs['style'] = 'width:100%;'

    email = forms.EmailField(validators=[EmailValidator(message="Please enter a valid email address")])
    content = forms.CharField(widget=forms.Textarea(attrs={'rows':4}))


class ProductNotificationForm(forms.ModelForm):
    first_name = forms.CharField(max_length=30,
                                 required=True,
                                 )
    last_name = forms.CharField(max_length=30,
                                required=True,
                                 widget=forms.TextInput(attrs={'class': ' subtext-btn-sm'}))
    products = forms.ModelMultipleChoiceField(
        queryset = Product.objects.filter(available=False),
        widget = forms.CheckboxSelectMultiple(attrs={'class': 'form-check form-check-inline subtext-btn-sm'}),
        required=True,
        )

    class Meta:
        model = ProductNotification
        fields = ['first_name', 'last_name', 'products', 'email']

    def clean(self):
        cleaned_data = super().clean()
        products = cleaned_data.get('products')

        if not products:
            self.add_error('products', 'Please select at least one product.')

        return cleaned_data

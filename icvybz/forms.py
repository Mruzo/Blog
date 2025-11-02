from django import forms
from .models import ComicComment, Comic, Season, Episode, Dialogue, Character, POV

class ComicCommentForm(forms.ModelForm):
    comment_cont = forms.CharField(
        widget=forms.Textarea(attrs={
            'rows': 2,
            'class': 'form-control',
            'placeholder': 'how cool is this?',
            'style': 'resize: none; width: 100%; font-size: 0.85rem;'

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


class StoryForm(forms.ModelForm):
    class Meta:
        model = Comic
        fields = ['title', 'description', 'comic_image']
        widgets = {
            'title': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter your story title',
                'style': 'font-size: 1.1rem; padding: 12px;'
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-control',
                'placeholder': 'Describe your story...',
                'rows': 4,
                'style': 'resize: vertical; font-size: 1rem;'
            }),
            'comic_image': forms.FileInput(attrs={
                'class': 'form-control',
                'accept': 'image/*',
                'style': 'padding: 8px;'
            })
        }
        labels = {
            'title': 'Story Title',
            'description': 'Story Description',
            'comic_image': 'Cover Image'
        }


class SeasonForm(forms.ModelForm):
    def clean_model_gltf(self):
        gltf_file = self.cleaned_data.get('model_gltf')
        if gltf_file:
            # Check file size (50MB limit)
            if gltf_file.size > 50 * 1024 * 1024:
                raise forms.ValidationError("GLB/GLTF file size cannot exceed 50MB. Please optimize your model.")
            
            # Check file extension
            if not gltf_file.name.lower().endswith(('.glb', '.gltf')):
                raise forms.ValidationError("Please upload a valid GLB or GLTF file.")
        
        return gltf_file
    
    def clean_model_usdz(self):
        usdz_file = self.cleaned_data.get('model_usdz')
        if usdz_file:
            # Check file size (25MB limit for USDZ)
            if usdz_file.size > 25 * 1024 * 1024:
                raise forms.ValidationError("USDZ file size cannot exceed 25MB. Please optimize your model.")
            
            # Check file extension
            if not usdz_file.name.lower().endswith('.usdz'):
                raise forms.ValidationError("Please upload a valid USDZ file.")
        
        return usdz_file
    
    class Meta:
        model = Season
        fields = ['season_number', 'title', 'description', 'release_date', 'model_gltf', 'model_usdz']
        widgets = {
            'season_number': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': 1,
                'style': 'font-size: 1rem; padding: 10px;'
            }),
            'title': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Season title',
                'style': 'font-size: 1rem; padding: 10px;'
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-control',
                'placeholder': 'Season description...',
                'rows': 3,
                'style': 'resize: vertical; font-size: 1rem;'
            }),
            'release_date': forms.DateInput(attrs={
                'class': 'form-control',
                'type': 'date',
                'style': 'font-size: 1rem; padding: 10px;'
            }),
            'model_gltf': forms.FileInput(attrs={
                'class': 'form-control',
                'accept': '.gltf,.glb',
                'style': 'padding: 8px;'
            }),
            'model_usdz': forms.FileInput(attrs={
                'class': 'form-control',
                'accept': '.usdz',
                'style': 'padding: 8px;'
            })
        }
        labels = {
            'season_number': 'Season Number',
            'title': 'Season Title',
            'description': 'Season Description',
            'release_date': 'Release Date',
            'model_gltf': '3D Model (GLTF)',
            'model_usdz': '3D Model (USDZ)'
        }


class EpisodeForm(forms.ModelForm):
    class Meta:
        model = Episode
        fields = ['episode_number', 'title', 'is_published']
        widgets = {
            'episode_number': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': 1,
                'style': 'font-size: 1rem; padding: 10px;'
            }),
            'title': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Episode title',
                'style': 'font-size: 1rem; padding: 10px;'
            }),
            'is_published': forms.CheckboxInput(attrs={
                'class': 'form-check-input',
                'style': 'transform: scale(1.2);'
            })
        }
        labels = {
            'episode_number': 'Episode Number',
            'title': 'Episode Title',
            'is_published': 'Publish Episode'
        }


class CharacterForm(forms.ModelForm):
    class Meta:
        model = Character
        fields = ['name', 'bio', 'personality', 'love_interest']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Character name',
                'style': 'font-size: 1rem; padding: 10px;'
            }),
            'bio': forms.Textarea(attrs={
                'class': 'form-control',
                'placeholder': 'Character bio...',
                'rows': 3,
                'style': 'resize: vertical; font-size: 1rem;'
            }),
            'personality': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Character personality',
                'style': 'font-size: 1rem; padding: 10px;'
            }),
            'love_interest': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Love interest',
                'style': 'font-size: 1rem; padding: 10px;'
            })
        }
        labels = {
            'name': 'Character Name',
            'bio': 'Character Bio',
            'personality': 'Personality',
            'love_interest': 'Love Interest'
        }


class POVForm(forms.ModelForm):
    class Meta:
        model = POV
        fields = ['head_x', 'head_y', 'head_z']
        widgets = {
            'head_x': forms.NumberInput(attrs={
                'class': 'form-control',
                'step': '0.1',
                'style': 'font-size: 1rem; padding: 8px;'
            }),
            'head_y': forms.NumberInput(attrs={
                'class': 'form-control',
                'step': '0.1',
                'style': 'font-size: 1rem; padding: 8px;'
            }),
            'head_z': forms.NumberInput(attrs={
                'class': 'form-control',
                'step': '0.1',
                'style': 'font-size: 1rem; padding: 8px;'
            })
        }
        labels = {
            'head_x': 'Head X Position',
            'head_y': 'Head Y Position',
            'head_z': 'Head Z Position'
        }


class DialogueForm(forms.ModelForm):
    character = forms.ModelChoiceField(
        queryset=Character.objects.none(),
        empty_label="Select a character...",
        widget=forms.Select(attrs={
            'class': 'form-control',
            'style': 'font-size: 1rem; padding: 8px;'
        })
    )
    
    class Meta:
        model = Dialogue
        fields = ['text', 'order', 'camera_orbit', 'camera_target', 'field_of_view', 'zoom_speed', 'rotation']
        widgets = {
            'text': forms.Textarea(attrs={
                'class': 'form-control',
                'placeholder': 'Enter dialogue text...',
                'rows': 3,
                'style': 'resize: vertical; font-size: 1rem;'
            }),
            'order': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': 1,
                'style': 'font-size: 1rem; padding: 8px;'
            }),
            'camera_orbit': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'e.g., 0deg 75deg 3m',
                'style': 'font-size: 1rem; padding: 8px;'
            }),
            'camera_target': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'e.g., 0m 1.6m 0m',
                'style': 'font-size: 1rem; padding: 8px;'
            }),
            'field_of_view': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': 1,
                'max': 180,
                'step': '0.1',
                'style': 'font-size: 1rem; padding: 8px;'
            }),
            'zoom_speed': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': 0.1,
                'max': 10,
                'step': '0.1',
                'style': 'font-size: 1rem; padding: 8px;'
            }),
            'rotation': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'e.g., 0deg 0deg 0deg',
                'style': 'font-size: 1rem; padding: 8px;'
            })
        }
        labels = {
            'text': 'Dialogue Text',
            'order': 'Order',
            'character': 'Character',
            'camera_orbit': 'Camera Orbit',
            'camera_target': 'Camera Target',
            'field_of_view': 'Field of View',
            'zoom_speed': 'Zoom Speed',
            'rotation': 'Rotation'
        } 
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.db.models import Q
from meta.models import ModelMeta
from django.template.loader import render_to_string


# Create your models here.

User = settings.AUTH_USER_MODEL


class ArticleQuerySet(models.QuerySet):
    def published(self):
        now = timezone.now()
        return self.filter(publish_date__lte=now)

    def search(self, query):
        lookup = (
                    Q(title__icontains=query) |
                    Q(content__icontains=query) |
                    Q(slug__icontains=query)
                    # user search
                    # Q(user__first_name__icontains=query) |
                    # Q(user__last_name__icontains=query) |
                    # Q(user__username__icontains=query)
                  )
        return self.filter(lookup)


class ArticleManager(models.Manager):

    class Meta:
        ordering = ['-publish_date', '-updated', '-timestamp']

    def get_queryset(self):
        return ArticleQuerySet(self.model, using=self._db)

    def published(self):
        return self.get_queryset().published()

    def search(self, query=None):
        if query is None:
            return self.get_queryset().none()
        return self.get_queryset().published().search(query)


class Article(ModelMeta, models.Model):
    user = models.ForeignKey(User, default=1, null=True, on_delete=models.SET_NULL)
    image = models.ImageField(upload_to='image/', blank=True, null=True)
    title = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    description = models.CharField(max_length=160, null=True)
    content = models.TextField(null=True, blank=True)
    publish_date = models.DateTimeField(auto_now=False, auto_now_add=False, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    likes = models.IntegerField(default=0)
    dislikes = models.IntegerField(default=0)
    updated = models.DateTimeField(auto_now=True)

    # GIF model field
    gif_model = models.ImageField(upload_to='gif_models/', blank=True, null=True)

    objects = ArticleManager()

    _metadata = {
        'title': 'title',
        'description': 'description',
        'image': 'get_meta_image',
    }

    def get_meta_image(self):
        # Check if a GIF is available, if not return the image
        if self.gif_model:
            return self.gif_model.url
        elif self.image:
            return self.image.url
        return None

    def generate_meta_tags(self):
        meta_tags = {
            'title': self.title,
            'description': self.description,
            'image': self.get_meta_image(),
            'url': self.get_absolute_url(),
        }
        return render_to_string('meta_tags.html', {'meta_tags': meta_tags})

    class Meta:
        ordering = ['-publish_date', '-updated', '-timestamp']

    def __str__(self):
        return self.title

    def get_absolute_url(self):
        return f"/article/{self.slug}"

    def get_edit_url(self):
        return f"{self.get_absolute_url()}/edit"

    def get_delete_url(self):
        return f"{self.get_absolute_url()}/delete"

    def approved_comments(self):
        return self.comments.filter(approved_comment=True)

    @property
    def comments_count_multiplied(self):
        return 2 * self.comments.count()

class About(models.Model):
    body = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now=False, auto_now_add=False, null=True, blank=True)

class CraftCategory(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name
    
class Craft(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    category = models.ForeignKey(CraftCategory, on_delete=models.CASCADE)
    url = models.URLField(null=True, blank=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return self.name
    
    def generate_meta_tags(self):
        primary_image = self.craft_images.first()
        meta_tags = {
            'title': self.name,
            'description': self.description,
            'image': primary_image.image.url if primary_image else None,
        }
        return render_to_string('meta_tags.html', {'meta_tags': meta_tags})
    
class CraftImage(models.Model):
    craft = models.ForeignKey(Craft, on_delete=models.CASCADE, related_name='craft_images')
    image = models.ImageField(upload_to='craft_images/')
    caption = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"Image for {self.craft.name}"
    
    def get_craft_category(self):
        return self.craft.category.name
    get_craft_category.short_description = 'Category'

class Preference(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    post = models.ForeignKey(Article, on_delete=models.CASCADE, related_name='preferences')
    value = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user.username} : \'{self.post.slug}\''

    class Meta:
        unique_together = ('user', 'post', 'value')

class CommentManager(models.Manager):
    def approved(self):
        return self.filter(approved_comment=True)

class Comment(models.Model):
    comment_cont = models.TextField(max_length=200, verbose_name='Comment')
    user_name = models.ForeignKey(User, default=1, null=True, on_delete=models.SET_NULL)
    comment_post = models.ForeignKey(Article, on_delete=models.CASCADE, related_name='comments')
    comment_date = models.DateTimeField(default=timezone.now)
    approved_comment = models.BooleanField(default=False)

    objects = CommentManager()

    class Meta:
        ordering = ['-comment_date']

    def __str__(self):
        return self.comment_cont

    def get_absolute_url(self):
        return f"/article/{self.pk}"

    # def get_absolute_url(self):
    #     return f"{Article.get_absolute_url()}"

    def get_addc_url(self):
        return f"{self.get_absolute_url()}/addc"

    def get_deletec_url(self):
        return f"{self.get_absolute_url()}/deletec"

    def approve(self):
        self.approved_comment = True
        self.save()

    def get_article(self):
        return self.comment_post.slug
    get_article.short_description = 'Article'

    def get_email(self):
        return self.user_name.email if self.user_name else 'No User'
    get_email.short_description = 'User Email'


class ReachOut(models.Model):
    full_name = models.CharField(max_length=30)
    email = models.EmailField(max_length=40)
    subject = models.CharField(max_length=50, null=True)
    content = models.TextField(max_length=250)
    created_at = models.DateTimeField(default=timezone.now)
    is_verified = models.BooleanField(default=False)
    verification_token = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.subject

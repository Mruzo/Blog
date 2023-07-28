from django.db import models
from django.conf import settings
from django.utils import timezone
from django.db.models import Q
from meta.models import ModelMeta


# Create your models here.

User = settings.AUTH_USER_MODEL


class ProductQuerySet(models.QuerySet):
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


class ProductManager(models.Manager):

    class Meta:
        ordering = ['-publish_date', '-updated', '-timestamp']

    def get_queryset(self):
        return ProductQuerySet(self.model, using=self._db)

    def published(self):
        return self.get_queryset().published()

    def search(self, query=None):
        if query is None:
            return self.get_queryset().none()
        return self.get_queryset().published().search(query)


class Product(ModelMeta, models.Model):
    user = models.ForeignKey(User, default=1, null=True,
                             on_delete=models.SET_NULL)
    title = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    description = models.CharField(max_length=160, null=True)
    content = models.TextField(null=True, blank=True)
    publish_date = models.DateTimeField(
        auto_now=False, auto_now_add=False, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    likes = models.IntegerField(default=0)
    dislikes = models.IntegerField(default=0)
    updated = models.DateTimeField(auto_now=True)

    objects = ProductManager()

    _metadata = {
        'title': 'title',
        'description': 'description',
        'image': 'get_meta_image',
    }

    def get_meta_image(self):
        if self.image:
            return self.image.url

    class Meta:
        ordering = ['-publish_date', '-updated', '-timestamp']
        app_label = 'snmov'

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


class ReachOut(models.Model):
    full_name = models.CharField(max_length=30)
    email = models.EmailField(max_length=40)
    subject = models.CharField(max_length=50, null=True)
    content = models.TextField(max_length=250)

    def __str__(self):
        return self.subject


class About(models.Model):
    body = models.TextField(null=True, blank=True)


class SiteImage(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='product_image')
    about = models.ForeignKey(
        About, on_delete=models.CASCADE, related_name='about_image')
    image = models.ImageField(upload_to='image/', blank=True, null=True)
    caption = models.CharField(max_length=50, blank=True)

    metadata = {
        'image': 'get_meta_image',
    }


class Preference(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    post = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='preferences')
    value = models.IntegerField()
    created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user.username} : \'{self.post.slug}\''

    class Meta:
        unique_together = ('user', 'post', 'value')


class Comment(models.Model):
    comment_cont = models.TextField(max_length=200, verbose_name='Comment')
    user_name = models.ForeignKey(
        User, default=1, null=True, on_delete=models.SET_NULL)
    comment_post = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='comments')
    comment_date = models.DateTimeField(default=timezone.now)
    approved_comment = models.BooleanField(default=False)

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

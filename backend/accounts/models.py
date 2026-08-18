from django.contrib.auth.models import AbstractUser
from django.db import models

from .validators import validate_image_file


class User(AbstractUser):
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=32, blank=True, default="")
    profile_picture = models.ImageField(
        upload_to="profiles/", validators=[validate_image_file], null=True, blank=True
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.email

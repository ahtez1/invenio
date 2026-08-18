from django.core.exceptions import ValidationError

MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5MB
ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def validate_image_file(file):
    if file.size > MAX_IMAGE_SIZE_BYTES:
        raise ValidationError(
            f"Image files cannot be larger than {MAX_IMAGE_SIZE_BYTES // (1024 * 1024)}MB."
        )
    content_type = getattr(file, "content_type", None)
    if content_type and content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise ValidationError("Unsupported image type. Use JPEG, PNG, WEBP, or GIF.")

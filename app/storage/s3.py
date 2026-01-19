import boto3
from urllib.parse import quote

from .. import settings


def _client():
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        return boto3.client(
            "s3",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
    return boto3.client("s3", region_name=settings.AWS_REGION)


def _public_base_url(bucket: str) -> str:
    if settings.S3_PUBLIC_BASE_URL:
        return settings.S3_PUBLIC_BASE_URL.rstrip("/")
    if not settings.AWS_REGION:
        raise RuntimeError("AWS_REGION is not set")
    return f"https://{bucket}.s3.{settings.AWS_REGION}.amazonaws.com"


def public_url(bucket: str, key: str) -> str:
    base = _public_base_url(bucket)
    return f"{base}/{quote(key.lstrip('/'), safe='/')}"


def create_presigned_put_url(
    bucket: str,
    key: str,
    content_type: str,
    expires_seconds: int = 300,
) -> str:
    client = _client()
    return client.generate_presigned_url(
        "put_object",
        Params={"Bucket": bucket, "Key": key, "ContentType": content_type},
        ExpiresIn=expires_seconds,
    )


def head_object(bucket: str, key: str) -> dict:
    client = _client()
    return client.head_object(Bucket=bucket, Key=key)

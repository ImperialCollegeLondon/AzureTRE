from core import config

STORAGE_ENDPOINT = config.STORAGE_ENDPOINT_SUFFIX


def get_account_url(account_name: str) -> str:
    return f"https://{account_name}.blob.{STORAGE_ENDPOINT}/"



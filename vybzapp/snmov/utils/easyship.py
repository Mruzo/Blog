# utils/easyship.py
import requests
from django.conf import settings

HEADERS = {
    "Authorization": f"Bearer {settings.EASYSHIP_API_KEY}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

def easyship_post(endpoint, data):
    url = f"{settings.EASYSHIP_API_BASE}{endpoint}"
    response = requests.post(url, headers=HEADERS, json=data)
    response.raise_for_status()  # Raises an error if the request fails
    return response.json()

def easyship_get(endpoint, params=None):
    url = f"{settings.EASYSHIP_API_BASE}{endpoint}"
    response = requests.get(url, headers=HEADERS, params=params)
    response.raise_for_status()
    return response.json()


# utils.py



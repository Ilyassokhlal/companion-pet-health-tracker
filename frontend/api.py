import json
import os
import requests
import streamlit as st



API_URL = os.environ.get("API_URL", "http://localhost:8000")

# ---------- api ----------

def auth_headers():
    """Return the authorization headers for API requests."""
    token = st.session_state.get("token")
    if not token:
        return {}
    return {"Authorization": f"Bearer {token}"}

def _request(method, path, **kwargs):
    """Single place where a dead backend turns into a message instead of a stack trace."""
    try:
        kwargs.setdefault("timeout", 30)
        return requests.request(method, f"{API_URL}{path}", headers=auth_headers(), **kwargs)
    except requests.exceptions.ConnectionError:
        st.error("Cannot reach the API. Is the backend running?")
        st.stop()

def get_api(path):
    """Send a GET request to the API."""
    response = _request("GET", path)
    response.raise_for_status()
    return response.json()


def post_api(path, payload=None):
    """Send a POST request to the API."""
    response = _request("POST", path, json=payload)
    response.raise_for_status()
    return response.json()


def patch_api(path, payload):
    """Send a PATCH request to the API."""
    response = _request("PATCH", path, json=payload)
    response.raise_for_status()
    return response.json()


def delete_api(path):
    """Send a DELETE request to the API. 204 has no body, so nothing is parsed."""
    response = _request("DELETE", path)
    response.raise_for_status()


def ask_stream(pet_id, question):
    """Yield answer tokens, then return {sources, confidence} from the final line."""
    try:
        response = requests.post(
            f"{API_URL}/ask",
            headers=auth_headers(),
            json={"pet_id": pet_id, "question": question},
            stream=True,
            timeout=120,
        )
    except requests.exceptions.ConnectionError:
        st.error("Cannot reach the API. Is the backend running?")
        st.stop()
    response.raise_for_status()

    if response.headers.get("content-type", "").startswith("application/json"):
        data = response.json()
        yield data["answer"]
        return {"sources": data.get("sources", []), "confidence": data.get("confidence")}

    meta = {}
    buffer = ""
    for chunk in response.iter_content(chunk_size=None):
        if not chunk:
            continue
        buffer += chunk.decode("utf-8")
        while "\n" in buffer:
            line, buffer = buffer.split("\n", 1)
            if not line.strip():
                continue
            data = json.loads(line)
            if "token" in data:
                yield data["token"]
            elif "meta" in data:
                meta = data["meta"]
    return meta
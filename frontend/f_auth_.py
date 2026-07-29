import requests
import streamlit as st
from api import post_api, get_api


# ---------- auth screens ----------

def login_form():
    """Render the login form."""
    st.session_state.user = None
    st.session_state.pets = []
    st.session_state.records = []

    st.text_input("Email", key="login_email")
    st.text_input("Password", type="password", key="login_password")
    if st.button("Login"):
        payload = {
            "email": st.session_state.login_email,
            "password": st.session_state.login_password,
        }
        try:
            response = post_api("/auth/login", payload)
            st.session_state.token = response["access_token"]
            st.session_state.user = get_api("/auth/me")
            st.success("Logged in successfully!")
            st.rerun()

        except requests.exceptions.HTTPError as e:
            st.error(f"Login failed: {e.response.json().get('detail', str(e))}")


def register_form():
    """Render the registration form."""
    st.text_input("Username", key="register_username")
    st.text_input("Email", key="register_email")
    st.text_input("Password", type="password", key="register_password")
    st.text_input("Confirm Password", type="password", key="register_confirm_password")
    if st.button("Register"):
        if st.session_state.register_password != st.session_state.register_confirm_password:
            st.error("Passwords do not match.")
            return
        payload = {
            "username": st.session_state.register_username,
            "email": st.session_state.register_email,
            "password": st.session_state.register_password,
        }
        try:
            post_api("/auth/register", payload)
            st.success("Registered successfully! Please log in.")
        except requests.exceptions.HTTPError as e:
            st.error(f"Registration failed: {e.response.json().get('detail', str(e))}")


def auth_screen():
    """Render the authentication screen with login and registration forms."""
    st.title("🐾 Companion — Login or Register")
    col1, col2 = st.columns(2)
    with col1:
        st.header("🔑 Login")
        login_form()
    with col2:
        st.header("📝 Register")
        register_form()
import requests
import streamlit as st
from api import get_api, post_api, patch_api, delete_api
from datetime import date


# ---------- pets ----------
SPECIES_ICONS = {"dog": "🐶", "cat": "🐱"}
def _pet_label(pet):
    return f"{SPECIES_ICONS.get((pet.get('species') or '').lower(), '🐾')} {pet['name']}"


def load_pets():
    """Fetch the current user's pets into the session state."""
    try:
        st.session_state.pets = get_api("/pets")
    except requests.exceptions.HTTPError as e:
        st.error(f"Failed to load pets: {e.response.json().get('detail', str(e))}")
        st.session_state.pets = []

def pet_selector():
    """Render a dropdown to select a pet."""
    if not st.session_state.pets:
        st.info("No pets found. Please add a pet.")
        return None
    return st.selectbox("Select a pet", st.session_state.pets, format_func=_pet_label)

@st.dialog("➕ Add a pet")
def add_pet_dialog():
    """Dialog to add a new pet."""
    add_pet_form()

def add_pet_form():
    """Render the form to add a new pet."""
    with st.form("add_pet", clear_on_submit=True):
        name = st.text_input("Pet Name")
        species = st.selectbox("Species", ["Dog", "Cat"])
        breed = st.text_input("Breed")
        birth_date = st.date_input("Birth Date", value=None, min_value=date(1990, 1, 1), max_value=date.today())
        weight = st.text_input("Weight (kg)")
        submitted = st.form_submit_button("➕ Add Pet")

    if not submitted:
        return

    try:
        payload = {
            "name": name,
            "species": species,
            "breed": breed or None,
            "birth_date": birth_date.isoformat() if birth_date else None,
            "weight": float(weight) if weight else None,
        }
    except ValueError:
        st.error("Weight must be a number.")
        return

    try:
        response = post_api("/pets", payload)
        st.session_state.pets.append(response)
        st.toast(f"Added {response['name']}", icon="✅")
        st.rerun()
    except requests.exceptions.HTTPError as e:
        st.error(f"Failed to add pet: {e.response.json().get('detail', str(e))}")


def _age(pet):
    """Human-readable age from birth date."""
    if not pet.get("birth_date"):
        return "—"
    born = date.fromisoformat(pet["birth_date"])
    today = date.today()
    years = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
    if years >= 1:
        return f"{years} year{'s' if years != 1 else ''}"
    months = (today.year - born.year) * 12 + today.month - born.month
    return f"{max(months, 0)} month{'s' if months != 1 else ''}"

@st.dialog("🗑️ Delete pet")
def delete_pet_dialog(pet):
    """Dialog to confirm deletion of a pet."""
    st.warning(f"This permanently deletes **{pet['name']}** and every health record attached to it.")
    col_del, col_cancel = st.columns(2)
    if col_del.button("Delete", type="primary", use_container_width=True):
        try:
            delete_api(f"/pets/{pet['id']}")
            st.session_state.pets = [p for p in st.session_state.pets if p["id"] != pet["id"]]
            st.toast(f"Deleted {pet['name']}", icon="🗑️")
            st.rerun()
        except requests.exceptions.HTTPError as e:
            st.error(f"Failed to delete: {e.response.json().get('detail', str(e))}")
    if col_cancel.button("Cancel", use_container_width=True):
        st.rerun()

def pet_details(pet):
    """Read-only pet info, with an Edit button that swaps in the form."""
    editing = f"editing_pet_{pet['id']}"

    if st.session_state.get(editing):
        edit_pet_form(pet)
        return

    col_edit, col_delete, _ = st.columns([1, 1, 4])
    if col_edit.button("✏️ Edit", key=f"edit_btn_{pet['id']}", use_container_width=True):
        st.session_state[editing] = True
        st.rerun()
    if col_delete.button("🗑️ Delete", key=f"del_btn_{pet['id']}", use_container_width=True):
        delete_pet_dialog(pet)

    icon = SPECIES_ICONS.get((pet.get("species") or "").lower(), "🐾")
    st.subheader(f"{icon} {pet['name']}")

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Species", pet["species"])
    c2.metric("Breed", pet["breed"] or "—")
    c3.metric("Age", _age(pet))
    c4.metric("Weight", f"{pet['weight']} kg" if pet["weight"] is not None else "—")

    if pet.get("birth_date"):
        st.caption(f"Born {pet['birth_date']}")

def edit_pet_form(pet):
    """Render the form to edit an existing pet."""
    with st.form(f"edit_pet_{pet['id']}"):
        name = st.text_input("Pet Name", value=pet["name"])
        species = st.selectbox(
            "Species", ["Dog", "Cat"],
            index=["Dog", "Cat"].index(pet["species"]) if pet["species"] in ["Dog", "Cat"] else 0,
        )
        breed = st.text_input("Breed", value=pet["breed"] or "")
        birth_date = st.date_input(
            "Birth Date",
            value=date.fromisoformat(pet["birth_date"]) if pet["birth_date"] else None,
            min_value=date(1990, 1, 1), max_value=date.today(),
        )
        weight = st.text_input("Weight (kg)", value=str(pet["weight"]) if pet["weight"] is not None else "")
        col_save, col_cancel = st.columns(2)
        submitted = col_save.form_submit_button("💾 Save", use_container_width=True)
        cancelled = col_cancel.form_submit_button("Cancel", use_container_width=True)

    if cancelled:
        st.session_state[f"editing_pet_{pet['id']}"] = False
        st.rerun()

    if not submitted:
        return

    try:
        payload = {
            "name": name,
            "species": species,
            "breed": breed or None,
            "birth_date": birth_date.isoformat() if birth_date else None,
            "weight": float(weight) if weight else None,
        }
    except ValueError:
        st.error("Weight must be a number.")
        return

    try:
        response = patch_api(f"/pets/{pet['id']}", payload)
        for i, p in enumerate(st.session_state.pets):
            if p["id"] == pet["id"]:
                st.session_state.pets[i] = response
                break
        st.toast("Pet updated", icon="✅")
        st.session_state[f"editing_pet_{pet['id']}"] = False
        st.rerun()
    except requests.exceptions.HTTPError as e:
        st.error(f"Failed to update pet: {e.response.json().get('detail', str(e))}")
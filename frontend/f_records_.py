from datetime import date
import requests
import streamlit as st
from api import get_api, post_api, delete_api

# ---------- records ----------
RECORD_ICONS = {
    "Vaccination": "💉",
    "Vet Visit": "🏥",
    "Medication": "💊",
    "Weight": "⚖️",
    "Symptom": "🤒",
}

def load_records(pet):
    """Fetch one pet's health records into the session state."""
    try:
        return get_api(f"/pets/{pet['id']}/records")
    except requests.exceptions.HTTPError as e:
        st.error(f"Failed to load records: {e.response.json().get('detail', str(e))}")
        return []

def record_timeline(records):
    """Render the timeline of health records for a specific pet."""
    if not records:
        st.info("No health records found for this pet.")
        return
    for record in records:
        col_body, col_del = st.columns([14, 1], vertical_alignment="center")
        with col_body:
            due = f" - next due {record['next_due_date']}" if record.get("next_due_date") else ""
            icon = RECORD_ICONS.get(record["record_type"], "📄")
            st.write(f"{icon} **{record['date']}** - {record['record_type']}: {record['title']}{due}")
            if record.get("description") and not st.session_state.get("compact_records"):
                st.caption(record["description"])
        if col_del.button("🗑️", key=f"del_rec_{record['id']}", help="Delete this record"):
            try:
                delete_api(f"/records/{record['id']}")
                st.toast("Record deleted", icon="🗑️")
                st.rerun()
            except requests.exceptions.HTTPError as e:
                st.error(f"Failed to delete record: {e.response.json().get('detail', str(e))}")

@st.dialog("➕ Add a health record")
def add_record_dialog(pet):
    """Dialog to add a new health record for a specific pet."""
    add_record_form(pet)

def add_record_form(pet):
    """Render the form to add a new health record for a specific pet."""
    with st.form(f"add_record_{pet['id']}", clear_on_submit=True):
        record_type = st.selectbox("Record Type", ["Vaccination", "Vet Visit", "Medication", "Weight", "Symptom"])
        title = st.text_input("Title")
        record_date = st.date_input("Date", value=date.today())
        description = st.text_area("Description")
        next_due = st.date_input("Next Due Date (optional)", value=None, min_value=date.today(), max_value=date(2100, 1, 1))
        st.caption("Leave blank if this record doesn't need a follow-up.")
        submitted = st.form_submit_button("➕ Add Record")

    if not submitted:
        return

    payload = {
        "record_type": record_type,
        "title": title,
        "date": record_date.isoformat(),
        "description": description or None,
        "next_due_date": next_due.isoformat() if next_due else None,
    }
    try:
        post_api(f"/pets/{pet['id']}/records", payload)
        st.toast(f"Added {title}", icon="✅")
        st.rerun()
    except requests.exceptions.HTTPError as e:
        st.error(f"Failed to add record: {e.response.json().get('detail', str(e))}")


def due_soon(records, within_days=30):
    """Show records whose next_due_date is overdue or coming up."""
    today = date.today()
    upcoming = []
    for record in records:
        if not record.get("next_due_date"):
            continue
        due = date.fromisoformat(record["next_due_date"])
        days = (due - today).days
        if days <= within_days:
            upcoming.append((days, record))

    if not upcoming:
        st.info("Nothing due in the next 30 days.")
        return

    for days, record in sorted(upcoming):
        label = f"overdue by {-days} days" if days < 0 else f"due in {days} days"
        icon = "⚠️" if days < 0 else "📅"
        line = f"{icon} **{record['title']}** ({record['record_type']}) — {label}"
        st.error(line) if days < 0 else st.warning(line)
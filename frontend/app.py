import streamlit as st
from f_auth_ import auth_screen
from f_pets_ import load_pets, pet_selector, add_pet_dialog, pet_details
from f_records_ import load_records, record_timeline, add_record_dialog, due_soon
from f_chat_ import chat_panel


# ---------- session ----------

def init_state():
    """Initialize the session state."""
    if "user" not in st.session_state:
        st.session_state.user = None
    if "pets" not in st.session_state:
        st.session_state.pets = []
    if "records" not in st.session_state:
        st.session_state.records = []
    if "chat_height" not in st.session_state:
        st.session_state.chat_height = 500
    if "compact_records" not in st.session_state:
        st.session_state.compact_records = False


def logout():
    """Clear the session state to log out the user."""
    st.session_state.user = None
    st.session_state.token = None
    st.session_state.pets = []
    st.session_state.records = []
    st.rerun()


# ---------- layout ----------

def sidebar():
    """Render the sidebar for a signed-in user."""
    st.sidebar.title("🐾 Companion")
    st.sidebar.write(f"👤 Signed in as {st.session_state.user['username']}")
    if st.sidebar.button("🚪 Log out"):
        logout()
    st.sidebar.divider()


def main():
    """Main function to run the Streamlit app."""
    st.set_page_config(page_title="Companion", page_icon="🐾", layout="wide")
    st.markdown(
        """<style>
        div[data-baseweb='select'] > div { font-size: 1.05rem; font-weight: 600; }
        .block-container { padding-top: 2.5rem; }
        </style>""",
        unsafe_allow_html=True,
    )
    init_state()

    if not st.session_state.user:
        auth_screen()
        return

    sidebar()

    if not st.session_state.pets:
        load_pets()

    st.title("Welcome to Companion")
    st.caption("Health records and answers for the family members who can't tell you where it hurts.")

    col_select, col_add = st.columns([4, 1], vertical_alignment="bottom")
    with col_select:
        pet = pet_selector()
    with col_add:
        if st.button("➕ Add pet", use_container_width=True):
            add_pet_dialog()

    if pet is None:
        return

    records = load_records(pet)

    with st.sidebar:
        st.subheader("📅 Due soon")
        due_soon(records)

        st.divider()
        st.subheader("📊 Overview")
        c1, c2 = st.columns(2)
        c1.metric("Pets", len(st.session_state.pets))
        c2.metric("Records", len(records), help=f"Records for {pet['name']}")

        st.divider()
        with st.expander("⚙️ Settings"):
            st.session_state.chat_height = st.slider(
                "Chat height (px)", 300, 900,
                value=st.session_state.chat_height, step=50,
            )
            st.session_state.compact_records = st.toggle(
                "Compact records",
                value=st.session_state.compact_records,
                help="Hide record descriptions in the timeline",
            )

    col_main, col_chat = st.columns([1, 1], gap="large")

    with col_main:
        tab_info, tab_records = st.tabs(["🐾 Companion info", "📋 Records"])

        with tab_info:
            pet_details(pet)

        with tab_records:
            if st.button("➕ Add a record", use_container_width=True):
                add_record_dialog(pet)
            record_timeline(records)

    with col_chat:
        st.subheader(f"💬 Ask about {pet['name']}")
        chat_panel(pet)


if __name__ == "__main__":
    main()
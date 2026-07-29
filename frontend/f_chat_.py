import requests
import streamlit as st
from api import ask_stream, get_api, delete_api

# ---------- chat ----------

DISCLAIMER = "This is general information, not veterinary advice — consult your vet."

class _Capture:
    """Wrap a generator so its return value can survive st.write_stream"""

    def __init__(self, gen):
        self.gen = gen
        self.meta = None

    def __iter__(self):
        self.meta = yield from self.gen

def chat_panel(pet):
    """Ask a question about this pet, grounded in the corpus and its records."""
    try:
        history = get_api(f"/pets/{pet['id']}/messages")
    except requests.exceptions.HTTPError as e:
        st.error(f"Failed to load chat history: {e.response.json().get('detail', str(e))}")
        history = []

    if history:
        _, col_clear = st.columns([4, 1])
        if col_clear.button("🧹 Clear", key=f"clear_chat_{pet['id']}", use_container_width=True):
            delete_api(f"/pets/{pet['id']}/messages")
            st.rerun()

    messages = st.container(height=st.session_state.get("chat_height", 500))
    question = st.chat_input(f"💬 Ask about {pet['name']}...")

    with messages:
        for i, entry in enumerate(history):
            with st.chat_message(entry["role"]):
                if entry["role"] == "user":
                    col_msg, col_del = st.columns([12, 1], vertical_alignment="center")
                    col_msg.markdown(entry["content"])
                    if col_del.button("✕", key=f"del_msg_{entry['id']}", help="Delete this exchange"):
                        delete_api(f"/messages/{entry['id']}")
                        nxt = history[i + 1] if i + 1 < len(history) else None
                        if nxt and nxt["role"] == "assistant":
                            delete_api(f"/messages/{nxt['id']}")
                        st.rerun()
                else:
                    st.markdown(entry["content"])
                    st.caption(DISCLAIMER)
                    for source in entry.get("sources", []):
                        st.caption(source)

        if not question:
            return

        with st.chat_message("user"):
            st.markdown(question)

        with st.chat_message("assistant"):
            stream = _Capture(ask_stream(pet["id"], question))
            iterator = iter(stream)
            try:
                with st.spinner("🤔 Thinking…"):
                    first = next(iterator, None)
            except requests.exceptions.HTTPError as e:
                st.error(f"Failed to get an answer: {e.response.json().get('detail', str(e))}")
                return

            # Define a generator to yield the first token and then the rest of the tokens
            def remaining():
                """re-yield the first token, then yield the rest of the tokens from the iterator"""
                if first is not None:
                    yield first
                yield from iterator

            st.write_stream(remaining())
            st.caption(DISCLAIMER)

            meta = stream.meta or {}
            sources = meta.get("sources", [])
            if sources:
                with st.expander(f"Sources - {meta.get('confidence', 'unknown')} confidence"):
                    for source in sources:
                        st.caption(source)
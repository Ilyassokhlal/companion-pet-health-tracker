"""The assistant. Claude is never called: answers are mocked here, and conftest stubs the question translation."""

import json
from types import SimpleNamespace

import rag
from routers.ask import _gate_query, _with_context, _with_ingredients


def test_ask_declines_when_corpus_is_empty(client, pet):
    """With nothing indexed, /ask declines with the no-information reply instead of calling Claude."""
    headers, pet_data = pet
    pet_id = pet_data["id"]

    # Ask a question while the corpus is still empty
    r = client.post("/ask", json={"pet_id": pet_id, "question": "What should I feed my pet?"}, headers=headers)

    # Check that the response indicates no sources were found
    assert r.status_code == 200
    body = r.json()
    assert body["confidence"] == "none"
    assert body["sources"] == []


def test_chat_history_is_persisted(client, pet):
    """An out-of-scope reply is stored alongside the user's question."""
    headers, pet_data = pet
    pet_id = pet_data["id"]

    r = client.post(
        "/ask",
        json={"pet_id": pet_id, "question": "What should I feed my pet?"},
        headers=headers,
    )
    assert r.status_code == 200
    answer = r.json()["answer"]

    r = client.get(f"/pets/{pet_id}/messages", headers=headers)
    assert r.status_code == 200
    history = r.json()
    assert [msg["role"] for msg in history] == ["user", "assistant"]
    assert history[0]["content"] == "What should I feed my pet?"
    assert history[1]["content"] == answer


def test_ask_returns_answer_with_sources(client, pet, monkeypatch, tmp_path):
    """With a corpus indexed, /ask streams tokens and reports the sources it used."""
    (tmp_path / "doc1.txt").write_text(
        "Feeding a dog a balanced diet matters for its long term health. Adult dogs "
        "generally do well on two measured meals a day, and portion size should be "
        "adjusted to body condition rather than the label on the bag."
    )
    (tmp_path / "doc2.txt").write_text(
        "Cats are obligate carnivores and need a diet high in animal protein. Wet food "
        "helps maintain hydration, which supports urinary tract health in cats that "
        "drink little water."
    )

    # Ingest the documents into the RAG system, remembering what was there before
    before = set(rag.collection.get()["ids"])
    rag.ingest(str(tmp_path))
    try:
        # Mock the RAG generate function to return a fixed response
        monkeypatch.setattr(rag, "generate", lambda messages, lang=None: iter(["Kennel ", "cough."]))

        # Get headers and pet data from the fixture
        headers, pet_data = pet

        # Extract the pet ID for the request
        pet_id = pet_data["id"]

        # Ask a question using the /ask endpoint
        r = client.post("/ask", json={"pet_id": pet_id, "question": "Should my cat eat wet food?"}, headers=headers)

        # Check that the response contains the expected tokens and sources
        assert r.status_code == 200
        lines = r.text.strip().split("\n")
        data = [json.loads(line) for line in lines]
        assert any("token" in item for item in data)
        assert "meta" in data[-1] and data[-1]["meta"]["sources"]
    finally:
        # The collection is shared by the whole run, and the tests above need it empty, so leave it as it was found
        rag.collection.delete(ids=list(set(rag.collection.get()["ids"]) - before))


def test_gate_query_replaces_only_whole_words():
    """A pet's name must not be substituted inside unrelated words.

    A pet called "Bo" once turned "Bo has a boil on his body" into
    "Dog has a Dogil on his Dogdy", which then failed the scope gate for
    reasons invisible to the user.
    """
    bo = SimpleNamespace(name="Bo", species="Dog")
    assert _gate_query("Bo has a boil on his body", bo) == "Dog has a boil on his body"

    sam = SimpleNamespace(name="Sam", species="Dog")
    assert _gate_query("is the same dose safe for Sam", sam) == "is the same dose safe for Dog"

    cat = SimpleNamespace(name="Cat", species="Cat")
    assert _gate_query("should I use a catheter", cat) == "should I use a catheter"


def test_short_follow_up_inherits_the_previous_question():
    """A question too short to retrieve on is expanded with the previous one."""
    assert _with_context("how often?", [{"role": "user", "content": "what vaccines does my dog need"}, {"role": "assistant", "content": "..."}]).startswith("what vaccines does my dog need")
    assert _with_context("how often should a dog get the rabies vaccine", [{"role": "user", "content": "what vaccines does my dog need"}, {"role": "assistant", "content": "..."}]) == "how often should a dog get the rabies vaccine"
    assert _with_context("how often?", []) == "how often?"


def test_brand_names_get_their_ingredients():
    """The search knows nothing about brand names, so a brand is matched on its active ingredients as well."""
    assert _with_ingredients("Is Bravecto safe for my dog?") == "Is Bravecto (fluralaner) safe for my dog?"
    assert _with_ingredients("is simparica trio ok") == "is simparica trio (sarolaner and moxidectin) ok"
    assert _with_ingredients("Is Bravecto (fluralaner) safe?") == "Is Bravecto (fluralaner) safe?"
    assert _with_ingredients("My dog ate grapes") == "My dog ate grapes"

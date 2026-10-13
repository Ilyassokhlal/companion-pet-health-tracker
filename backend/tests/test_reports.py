"""Reporting an AI answer: what a report keeps, who can report what, and the owner's reports command."""

from datetime import datetime, timedelta

import admin
from models.models import AiReport, User


def _ask(client, headers, pet_id, question="What should I feed my pet?"):
    """Ask with an empty corpus, so the no answer reply comes back at once with its id."""
    r = client.post("/ask", json={"pet_id": pet_id, "question": question}, headers=headers)
    assert r.status_code == 200
    return r.json()["message_id"]


def test_an_answer_is_reported_once_with_a_copy_of_the_exchange(client, pet, db):
    """The report keeps the question, the answer, the reason and the note. The list marks the answer as reported, and a second report changes nothing."""
    headers, pet_data = pet
    answer_id = _ask(client, headers, pet_data["id"])

    r = client.post(f"/messages/{answer_id}/report", json={"reason": "wrong_or_unsafe", "note": "  Not what my vet said  "}, headers=headers)
    assert r.status_code == 204
    r = client.post(f"/messages/{answer_id}/report", json={"reason": "offensive"}, headers=headers)
    assert r.status_code == 204

    history = client.get(f"/pets/{pet_data['id']}/messages", headers=headers).json()
    assert [(m["role"], m["reported"]) for m in history] == [("user", False), ("assistant", True)]
    report = db.query(AiReport).one()
    assert (report.reason, report.note, report.question) == ("wrong_or_unsafe", "Not what my vet said", "What should I feed my pet?")
    assert (report.answer, report.user_id) == (history[1]["content"], db.query(User).one().id)


def test_only_your_own_answers_can_be_reported(client, pet, auth):
    """A question is not an answer, someone else's answer is not found, and the reason must be one of the four."""
    headers, pet_data = pet
    answer_id = _ask(client, headers, pet_data["id"])
    question_id = client.get(f"/pets/{pet_data['id']}/messages", headers=headers).json()[0]["id"]

    assert client.post(f"/messages/{question_id}/report", json={"reason": "other"}, headers=headers).status_code == 400
    assert client.post(f"/messages/{answer_id}/report", json={"reason": "rude"}, headers=headers).status_code == 422
    assert client.post(f"/messages/{answer_id}/report", json={"reason": "other", "note": "x" * 1001}, headers=headers).status_code == 422
    stranger = auth(username="other", email="other@example.com")
    assert client.post(f"/messages/{answer_id}/report", json={"reason": "other"}, headers=stranger).status_code == 404


def test_a_report_outlives_the_chat_and_the_account(client, pet, db):
    """Clearing the chat keeps the report's copy. Deleting the account keeps the report without the link to it."""
    headers, pet_data = pet
    answer_id = _ask(client, headers, pet_data["id"])
    client.post(f"/messages/{answer_id}/report", json={"reason": "off_topic"}, headers=headers)

    assert client.delete(f"/pets/{pet_data['id']}/messages", headers=headers).status_code == 204
    db.expire_all()
    report = db.query(AiReport).one()
    assert report.message_id is None and report.question == "What should I feed my pet?"

    assert client.request("DELETE", "/auth/me", json={"password": "password"}, headers=headers).status_code == 204
    db.expire_all()
    report = db.query(AiReport).one()
    assert report.user_id is None and report.answer


def test_a_locked_account_can_still_report(client, pet, db):
    """Reporting stays open after the free month, like reading the answers."""
    headers, pet_data = pet
    answer_id = _ask(client, headers, pet_data["id"])
    user = db.query(User).one()
    user.trial_ends_at = datetime.now() - timedelta(days=1)
    db.commit()

    assert client.post(f"/messages/{answer_id}/report", json={"reason": "other"}, headers=headers).status_code == 204


def test_the_reports_command_lists_the_latest_reports(client, pet, capsys):
    """Newest first, with the account's email and the reason in words."""
    headers, pet_data = pet
    first = _ask(client, headers, pet_data["id"])
    second = _ask(client, headers, pet_data["id"], "Can my cat eat grapes?")
    client.post(f"/messages/{first}/report", json={"reason": "other"}, headers=headers)
    client.post(f"/messages/{second}/report", json={"reason": "offensive", "note": "Rude"}, headers=headers)

    assert admin.main(["reports"]) == 0
    out = capsys.readouterr().out
    assert out.index("Can my cat eat grapes?") < out.index("Something else")
    assert "testuser@example.com  Offensive or inappropriate" in out and "Note: Rude" in out
    assert admin.main(["reports", "nobody@example.com"]) == 0
    assert capsys.readouterr().out == ""

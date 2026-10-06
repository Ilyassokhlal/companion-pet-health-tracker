"""Expenses and the monthly budget."""


def test_logging_an_expense_stamps_the_currency_and_lists_newest_first(client, pet):
    """An expense should have its currency set and the list of expenses should be ordered with the newest first."""
    headers, pet_data = pet
    pet_id = pet_data["id"]

    older = client.post(f"/pets/{pet_id}/expenses", json={"date": "2026-08-02", "amount": 12.5, "category": "food"}, headers=headers)
    assert older.status_code == 201
    assert older.json()["currency"] == "USD"

    client.post(f"/pets/{pet_id}/expenses", json={"date": "2026-08-20", "amount": 90, "category": "vet", "notes": "Annual check."}, headers=headers).raise_for_status()

    expenses = client.get(f"/pets/{pet_id}/expenses", headers=headers).json()
    assert [e["date"] for e in expenses] == ["2026-08-20", "2026-08-02"]
    assert expenses[0]["category"] == "vet"


def test_an_unknown_category_and_a_free_expense_are_refused(client, pet):
    """An unknown category and a free expense should be refused."""
    headers, pet_data = pet
    pet_id = pet_data["id"]

    assert client.post(f"/pets/{pet_id}/expenses", json={"date": "2026-08-02", "amount": 10, "category": "toys"}, headers=headers).status_code == 422
    assert client.post(f"/pets/{pet_id}/expenses", json={"date": "2026-08-02", "amount": 0, "category": "food"}, headers=headers).status_code == 422


def test_expenses_are_isolated_between_users(client, auth, pet):
    """Expenses should be isolated between different users."""
    headers_a, pet_a = pet
    expense_id = client.post(f"/pets/{pet_a['id']}/expenses", json={"date": "2026-08-02", "amount": 10, "category": "food"}, headers=headers_a).json()["id"]

    headers_b = auth(username="other", email="other@example.com")
    assert client.get(f"/pets/{pet_a['id']}/expenses", headers=headers_b).status_code == 404
    assert client.delete(f"/expenses/{expense_id}", headers=headers_b).status_code == 404
    assert len(client.get(f"/pets/{pet_a['id']}/expenses", headers=headers_a).json()) == 1


def test_the_summary_totals_only_that_month_and_flags_the_limit(client, pet):
    """The summary should only include expenses from the specified month and indicate if the monthly budget is exceeded."""
    headers, pet_data = pet
    pet_id = pet_data["id"]
    client.patch(f"/pets/{pet_id}", json={"monthly_budget": 100}, headers=headers).raise_for_status()

    for payload in (
        {"date": "2026-08-02", "amount": 30, "category": "food"},
        {"date": "2026-08-15", "amount": 55, "category": "vet"},
        {"date": "2026-07-30", "amount": 500, "category": "vet"},
    ):
        client.post(f"/pets/{pet_id}/expenses", json=payload, headers=headers).raise_for_status()

    summary = client.get(f"/pets/{pet_id}/expense-summary?month=2026-08", headers=headers).json()
    assert summary["total"] == 85
    assert summary["limit"] == 100
    assert summary["percent"] == 85.0
    assert summary["status"] == "warning"
    assert summary["by_category"][0] == {"category": "vet", "total": 55.0}
    assert summary["currencies"] == ["USD"]


def test_a_pet_with_no_limit_reports_no_status(client, pet):
    """If a pet has no monthly budget set, the expense summary should report no status."""
    headers, pet_data = pet
    client.post(f"/pets/{pet_data['id']}/expenses", json={"date": "2026-08-02", "amount": 40, "category": "food"}, headers=headers).raise_for_status()

    summary = client.get(f"/pets/{pet_data['id']}/expense-summary?month=2026-08", headers=headers).json()
    assert summary["limit"] is None
    assert summary["percent"] is None
    assert summary["status"] == "none"


def test_an_expense_survives_the_record_it_was_attached_to(client, pet):
    """Deleting a health record should clear the link from the expense but keep the expense itself. The foreign key is SET NULL, not CASCADE."""
    headers, pet_data = pet
    pet_id = pet_data["id"]
    record_id = client.post(
        f"/pets/{pet_id}/records",
        json={"record_type": "Vet Visit", "title": "Annual check", "date": "2026-08-15"},
        headers=headers,
    ).json()["id"]
    expense_id = client.post(
        f"/pets/{pet_id}/expenses",
        json={"date": "2026-08-15", "amount": 90, "category": "vet", "record_id": record_id},
        headers=headers,
    ).json()["id"]

    client.delete(f"/records/{record_id}", headers=headers).raise_for_status()

    remaining = client.get(f"/pets/{pet_id}/expenses", headers=headers).json()
    assert [e["id"] for e in remaining] == [expense_id]
    assert remaining[0]["record_id"] is None

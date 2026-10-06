"""Pets: creating, changing and deleting them, and keeping each owner's pets private."""


def test_pets_require_authentication(client):
    """All pet endpoints should require authentication and return a 401 Unauthorized error if no token is provided."""
    r = client.get("/pets")
    assert r.status_code == 401
    assert r.json()["detail"] == "Not authenticated"


def test_pet_lifecycle(client, pet):
    """Create, list, patch, delete."""
    headers, pet_data = pet
    pet_id = pet_data["id"]
    # List pets
    r = client.get("/pets", headers=headers)
    assert r.status_code == 200
    assert any(p["id"] == pet_id for p in r.json())

    # Patch pet
    r = client.patch(f"/pets/{pet_id}", json={"name": "Fluffy Updated"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["name"] == "Fluffy Updated"

    # Delete pet
    r = client.delete(f"/pets/{pet_id}", headers=headers)
    assert r.status_code == 204

    # Ensure pet is deleted
    r = client.get(f"/pets/{pet_id}", headers=headers)
    assert r.status_code == 404


def test_users_cannot_reach_each_others_pets(client, pet, auth):
    """Register a second user. Every route on the first user's pet must 404."""
    _, pet_data = pet
    pet_id = pet_data["id"]
    # Register a second user
    headers2 = auth(username="seconduser", email="seconduser@example.com")
    # Attempt to access the first user's pet
    r = client.get(f"/pets/{pet_id}", headers=headers2)
    assert r.status_code == 404
    r = client.patch(f"/pets/{pet_id}", json={"name": "Hacked"}, headers=headers2)
    assert r.status_code == 404
    r = client.delete(f"/pets/{pet_id}", headers=headers2)
    assert r.status_code == 404

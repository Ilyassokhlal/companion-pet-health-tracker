"""Record photos: uploads, the gallery and the zip download."""

import io
import os
import zipfile

from config import settings
from PIL import Image
from utils.photos import read_photo


def test_record_photos_are_isolated_between_users(client, auth, pet, jpeg):
    """User B must not be able to read or delete user A's photos."""

    # Create a record and upload a photo for user A
    headers_a, pet_a = pet

    # Create a record for user A
    r = client.post(f"/pets/{pet_a['id']}/records", json={"title": "Vaccination", "record_type": "Vaccination", "date": "2024-01-01"}, headers=headers_a)
    assert r.status_code == 201
    record_id = r.json()["id"]

    # Upload a photo for the record
    r = client.post(f"/records/{record_id}/photos", files={"files": ("x.jpg", jpeg(), "image/jpeg")}, headers=headers_a)
    assert r.status_code == 201
    photo_id = r.json()[0]["id"]

    # Attempt to access the photo as user B
    headers_b = auth(username="userb", email="userb@example.com")
    r = client.get(f"/pets/{pet_a['id']}/photos", headers=headers_b)
    assert r.status_code == 404
    r = client.delete(f"/record-photos/{photo_id}", headers=headers_b)
    assert r.status_code == 404

    # Verify that user A can still access the photo
    r = client.get(f"/pets/{pet_a['id']}/photos", headers=headers_a)
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_photo_upload_rejects_bad_type_and_oversize(client, pet):
    """Only jpeg/png/webp under the size cap are accepted."""

    # Get headers and pet data from the fixture
    headers, pet_data = pet

    # Extract the pet ID for the request
    pet_id = pet_data["id"]

    # Create a record for the pet
    r = client.post(f"/pets/{pet_id}/records", json={"title": "Test", "record_type": "Vaccination", "date": "2024-01-01"}, headers=headers)

    # Extract the record ID from the response
    assert r.status_code == 201
    record_id = r.json()["id"]
    r = client.post(f"/records/{record_id}/photos", files={"files": ("x.txt", b"fake-bytes", "text/plain")}, headers=headers)
    assert r.status_code == 400

    # Attempt to upload a photo with an invalid file type or an oversized file, expecting a 400 Bad Request response.
    r = client.post(f"/records/{record_id}/photos", files={"files": ("x.jpg", b"x" * (settings.MAX_PHOTO_MB * 1024 * 1024 + 1), "image/jpeg")}, headers=headers)
    assert r.status_code == 400
    assert r.json()["code"] == "image_too_large"
    assert r.json()["params"] == {"name": "x.jpg", "max": settings.MAX_PHOTO_MB}


def test_photo_upload_shrinks_rotates_and_makes_a_thumbnail(client, pet, jpeg):
    """A large sideways phone photo is stored upright, capped at 2560 px, with a grid thumbnail beside it."""
    headers, pet_data = pet
    r = client.post(f"/pets/{pet_data['id']}/records", json={"title": "Scan", "record_type": "Symptom", "date": "2024-01-01"}, headers=headers)
    record_id = r.json()["id"]

    # 4000 x 3000 stored sideways; orientation 6 means "rotate 90 degrees to display"
    r = client.post(f"/records/{record_id}/photos", files={"files": ("wide.jpg", jpeg(4000, 3000, orientation=6), "image/jpeg")}, headers=headers)
    assert r.status_code == 201
    photo = r.json()[0]
    assert photo["thumbnail"] == photo["filename"].replace(".jpg", "_thumb.jpg")

    with Image.open(os.path.join(settings.PHOTO_DIR, photo["filename"])) as stored:
        assert stored.size == (1920, 2560)
    with Image.open(os.path.join(settings.PHOTO_DIR, photo["thumbnail"])) as thumb:
        assert max(thumb.size) == 400

    # the record now carries its photos, which is what lets an edit form list them
    records = client.get(f"/pets/{pet_data['id']}/records", headers=headers).json()
    assert [p["id"] for p in records[0]["photos"]] == [photo["id"]]


def test_a_rejected_batch_stores_nothing(client, pet, jpeg):
    """One unreadable file in a batch rejects the whole request and leaves no stray files behind."""
    headers, pet_data = pet
    r = client.post(f"/pets/{pet_data['id']}/records", json={"title": "Batch", "record_type": "Symptom", "date": "2024-01-01"}, headers=headers)
    record_id = r.json()["id"]
    before = set(os.listdir(settings.PHOTO_DIR))

    files = [("files", ("good.jpg", jpeg(), "image/jpeg")), ("files", ("broken.jpg", b"not an image", "image/jpeg"))]
    r = client.post(f"/records/{record_id}/photos", files=files, headers=headers)
    assert r.status_code == 400
    assert r.json()["params"]["name"] == "broken.jpg"
    assert set(os.listdir(settings.PHOTO_DIR)) == before


def test_photo_zip_contains_exactly_the_selected_photos(client, pet, jpeg):
    """The archive holds one entry per selected photo, with the stored bytes intact."""
    headers, p = pet
    r = client.post(f"/pets/{p['id']}/records", json={"title": "Vet Visit", "record_type": "Vet Visit", "date": "2024-03-04"}, headers=headers)
    record_id = r.json()["id"]

    r = client.post(f"/records/{record_id}/photos", files=[("files", ("a.jpg", jpeg(), "image/jpeg")), ("files", ("b.jpg", jpeg(6, 4), "image/jpeg"))], headers=headers)
    assert r.status_code == 201
    stored = r.json()
    ids = [photo["id"] for photo in stored]

    r = client.get(f"/pets/{p['id']}/photos/download", params={"ids": ids}, headers=headers)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/zip"

    archive = zipfile.ZipFile(io.BytesIO(r.content))
    names = archive.namelist()
    assert len(names) == 2
    # The record's date and title name the entries, not the stored UUIDs.
    assert all(name.startswith("2024-03-04-Vet Visit-") for name in names)
    # Uploads are re-encoded on the way in, so the archive must match what was stored rather than what was sent.
    assert sorted(archive.read(n) for n in names) == sorted(read_photo(photo["filename"]) for photo in stored)


def test_photo_zip_refuses_a_photo_belonging_to_another_user(client, auth, pet, jpeg):
    """An id outside the requested pet is a 404, and nothing partial comes back."""
    headers_a, pet_a = pet
    r = client.post(f"/pets/{pet_a['id']}/records", json={"title": "Vaccination", "record_type": "Vaccination", "date": "2024-01-01"}, headers=headers_a)
    record_id = r.json()["id"]
    r = client.post(f"/records/{record_id}/photos", files={"files": ("x.jpg", jpeg(), "image/jpeg")}, headers=headers_a)
    photo_id = r.json()[0]["id"]

    headers_b = auth(username="userb", email="userb@example.com")
    pet_b_id = client.post("/pets", json={"name": "Rex", "species": "dog"}, headers=headers_b).json()["id"]

    r = client.get(f"/pets/{pet_b_id}/photos/download", params={"ids": [photo_id]}, headers=headers_b)
    assert r.status_code == 404


def test_photo_zip_caps_the_selection(client, pet):
    """Eleven ids is refused before any ownership lookup or file read."""
    headers, p = pet
    r = client.get(f"/pets/{p['id']}/photos/download", params={"ids": list(range(1, 12))}, headers=headers)
    assert r.status_code == 400
    assert "too_many_photos" in r.text


def test_the_gallery_comes_in_pages_and_filters_on_the_server(client, pet, jpeg):
    """Photos arrive a page at a time, newest record first, and the type and date filters reach photos that have not been loaded yet."""
    headers, pet_data = pet
    pet_id = pet_data["id"]
    uploads = {}
    for record_type, day, count in (("Vaccination", "2026-01-10", 1), ("Symptom", "2026-02-10", 2), ("Vet Visit", "2026-03-10", 1)):
        record_id = client.post(f"/pets/{pet_id}/records", json={"title": record_type, "record_type": record_type, "date": day}, headers=headers).json()["id"]
        files = [("files", (f"{i}.jpg", jpeg(), "image/jpeg")) for i in range(count)]
        uploads[record_type] = [photo["id"] for photo in client.post(f"/records/{record_id}/photos", files=files, headers=headers).json()]

    def gallery(**params):
        return client.get(f"/pets/{pet_id}/photos", params=params, headers=headers).json()

    first, second, third = gallery(limit=2), gallery(limit=2, offset=2), gallery(limit=2, offset=4)
    assert [p["record_type"] for p in first + second] == ["Vet Visit", "Symptom", "Symptom", "Vaccination"]
    assert third == []
    # Two photos uploaded together: the one stored last comes first
    assert [first[1]["id"], second[0]["id"]] == uploads["Symptom"][::-1]

    assert {p["id"] for p in gallery(record_type="Symptom")} == set(uploads["Symptom"])
    assert len(gallery(record_type=["Symptom", "Vet Visit"])) == 3
    assert len(gallery(since="2026-02-01")) == 3
    assert len(gallery(since="2026-02-01", until="2026-02-28")) == 2
    assert len(gallery()) == 4

    assert client.get(f"/pets/{pet_id}/photo-counts", headers=headers).json() == {"Vaccination": 1, "Symptom": 2, "Vet Visit": 1}

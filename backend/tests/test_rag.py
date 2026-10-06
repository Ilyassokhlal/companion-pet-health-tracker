"""Indexing the corpus and linking to its sources."""

import rag


def test_a_paragraph_can_cite_its_own_source(tmp_path):
    """A paragraph ending in a SOURCE line is indexed without that line and cites its own source, while the file's other paragraphs keep the source its ATTRIBUTION row gives."""
    (tmp_path / "ATTRIBUTION.md").write_text(
        "| `guide_test.txt` | [Test guide](https://example.org/guide) |\n", encoding="utf-8"
    )
    (tmp_path / "guide_test.txt").write_text(
        "Test guide - Flea treatments\n"
        "Bravecto contains fluralaner, an insecticide and acaricide given by mouth or applied to the skin.\n"
        "SOURCE: Fluralaner | https://en.wikipedia.org/wiki/Fluralaner\n\n"
        "Test guide - Routine care\n"
        "Adult dogs and cats should see a veterinarian at least once a year for a health check.\n",
        encoding="utf-8",
    )
    ids = ["guide_test.txt-0", "guide_test.txt-1"]
    rag.ingest(str(tmp_path))
    try:
        stored = rag.collection.get(ids=ids, include=["documents", "metadatas"])
        docs = dict(zip(stored["ids"], stored["documents"], strict=True))
        metas = dict(zip(stored["ids"], stored["metadatas"], strict=True))

        # The cited paragraph: no SOURCE line in its text, its own title and URL, and no section
        assert "SOURCE:" not in docs[ids[0]]
        assert metas[ids[0]]["title"] == "Fluralaner"
        assert metas[ids[0]]["url"] == "https://en.wikipedia.org/wiki/Fluralaner"
        assert metas[ids[0]]["section"] == ""

        # The plain paragraph keeps the file's ATTRIBUTION row and its section
        assert metas[ids[1]]["title"] == "Test guide"
        assert metas[ids[1]]["url"] == "https://example.org/guide"
        assert metas[ids[1]]["section"] == "Routine care"
    finally:
        # The collection is shared by the whole run, so leave it as it was found
        rag.collection.delete(ids=ids)


def test_only_wikipedia_links_get_a_section_anchor():
    """Only Wikipedia builds anchors from section headings, so any other site gets a link to the page itself."""
    wiki = rag.SourceChunk(text="", source="cat.txt", distance=0.1, title="Cat", url="https://en.wikipedia.org/wiki/Cat", section="Hunting and feeding")
    other = rag.SourceChunk(text="", source="cdc_dogs.txt", distance=0.1, title="Dogs", url="https://www.cdc.gov/healthy-pets/about/dogs.html", section="Healthy dogs")
    assert wiki.link == "https://en.wikipedia.org/wiki/Cat#Hunting_and_feeding"
    assert other.link == "https://www.cdc.gov/healthy-pets/about/dogs.html"
    assert rag.SourceChunk(text="", source="none.txt", distance=0.1).link == ""

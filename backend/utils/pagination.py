from fastapi import Query
from sqlalchemy.orm import Query as SqlQuery

# The longest page a client can ask for
MAX_PAGE = 100


class Page:
    """The `limit` and `offset` of a list that loads a page at a time, as a dependency.

    Without `limit` the whole list comes back, which is what app versions from before paging still ask for."""

    def __init__(self, limit: int | None = Query(None, ge=1, le=MAX_PAGE), offset: int = Query(0, ge=0)):
        self.limit = limit
        self.offset = offset

    def apply(self, query: SqlQuery) -> SqlQuery:
        """The requested slice of a query that is already in its final order."""
        query = query.offset(self.offset)
        return query.limit(self.limit) if self.limit else query

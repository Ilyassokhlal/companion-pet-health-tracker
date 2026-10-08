"""The owner's admin commands. Run on the server, inside the backend container:

    docker compose exec backend python -m admin ban someone@example.com --reason "Spam"
    docker compose exec backend python -m admin unban someone@example.com
    docker compose exec backend python -m admin grant someone@example.com --until 2027-01-31
    docker compose exec backend python -m admin revoke someone@example.com
    docker compose exec backend python -m admin delete someone@example.com
    docker compose exec backend python -m admin log someone@example.com

grant without --until is for life. Every command but log takes --reason, kept in the action log and never shown to the user.
None of this is reachable from the web: changing an account needs a shell on the server.
"""

import argparse
import sys
from datetime import date

from database import SessionLocal
from utils import admin as actions

COMMANDS = {
    "ban": "suspend an account: no sign in, no reminders, renewals stopped, and its email can't sign up again",
    "unban": "lift a ban, also for an account that was deleted",
    "grant": "give Companion Premium, for life or through --until",
    "revoke": "take back granted Premium",
    "delete": "permanently delete a banned account and everything it owns",
}


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m admin", description="Companion admin commands. Every change is written to the action log.")
    commands = parser.add_subparsers(dest="command", required=True)
    for name, help_text in COMMANDS.items():
        command = commands.add_parser(name, help=help_text)
        command.add_argument("email")
        command.add_argument("--reason", help="kept in the action log, never shown to the user")
        if name == "grant":
            command.add_argument("--until", type=date.fromisoformat, metavar="YYYY-MM-DD", help="the last day of Premium, for life when left out")
    log = commands.add_parser("log", help="show the latest actions, for one email or for everyone")
    log.add_argument("email", nargs="?")
    log.add_argument("--limit", type=int, default=50)
    return parser


def _print_log(entries) -> None:
    for entry in entries:
        print("  ".join(part for part in (entry.created_at.strftime("%Y-%m-%d %H:%M"), entry.action, entry.email, entry.detail, entry.reason) if part))


def main(argv: list[str] | None = None) -> int:
    """Run one command. Returns the exit code: 0 when it was done, 1 when nothing was changed."""
    args = _parser().parse_args(argv)
    db = SessionLocal()
    try:
        warnings: list[str] = []
        if args.command == "log":
            _print_log(actions.recent_actions(db, args.email, args.limit))
            return 0
        if args.command == "ban":
            warnings = actions.ban(db, args.email, args.reason)
        elif args.command == "grant":
            warnings = actions.grant(db, args.email, args.until, args.reason)
        else:
            getattr(actions, args.command)(db, args.email, args.reason)
    except actions.AdminError as e:
        print(f"Nothing changed: {e}", file=sys.stderr)
        return 1
    finally:
        db.close()

    print(f"Done: {args.command} {args.email}")
    for warning in warnings:
        print(f"Warning: {warning}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

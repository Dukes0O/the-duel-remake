"""Keep Kyle's Cockpit project "The Duel" in step with the board (AGENTS rule 18).

Each Cockpit task names its board cards in its notes ("Board cards A, B.").
This sets the task's status from those cards and never blocks a merge: a
Cockpit failure prints a warning and exits 0. Run it through the Command
Center's protected runner, giving this file's full path (the runner starts in
the Command Center folder):

  powershell -File <command-center>/scripts/run_command_center_postgres.ps1 python <this folder>/tools/cockpit-sync.py

Add --dry-run to list what would change without writing anything. Changes are
recorded in Cockpit's history under the source "board-sync".
"""
import re
import sys
from pathlib import Path

COMMAND_CENTER = Path(r"C:\Users\kyleb\dev\command-center")
SLUG = "pers-the-duel"
BOARD = Path(__file__).resolve().parent.parent / "docs" / "board" / "board.yaml"
# Final statuses (cockpit_store._TERMINAL_TASK_STATUSES): someone chose them; keep them.
LEAVE_ALONE = {"done", "published", "deferred", "cancelled", "closed"}
WAITING = "Waiting on Kyle: "
# Only ids after "Board card(s)", up to the end of that sentence, count.
CARD_LIST = re.compile(r"Board cards?\s+(.*?)(?:\.\s|\.?$)", re.S)
CARD_ID = re.compile(r"\b[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*\b")


def read_board(text):
    """Return ({card: (status, waiting_on)}, {completed cards})."""
    found = re.search(r"^completed: \[(.*)\]$", text, re.M)
    completed = {c.strip() for c in found.group(1).split(",")} if found else set()
    cards = {}
    for block in re.split(r"\n  - id: ", text)[1:]:
        card = block.split("\n", 1)[0].strip()
        field = lambda name: (re.search(rf'\n    {name}: *"?([^"\n]*)', block) or [None, ""])[1]
        cards[card] = (field("status"), field("waiting_on"))
    return cards, completed


def card_names(notes, known):
    listed = CARD_LIST.search(notes or "")
    return [n for n in CARD_ID.findall(listed.group(1)) if n in known] if listed else []


def wanted_status(names, cards, completed):
    """The task's (status, blocker) from its cards, or None to leave it as it is."""
    open_cards = [cards[n] for n in names if n in cards]
    if not open_cards:
        return ("Done", "") if names and all(n in completed for n in names) else None
    waiting = [n for n in names if n in cards and cards[n][1] == "kyle"]
    if waiting:
        return "Blocked", WAITING + ", ".join(waiting)
    states = {status for status, _ in open_cards}
    for board_state, cockpit_state in (("building", "In Progress"), ("review", "In Review"),
                                       ("ready", "Not Started")):
        if board_state in states:
            # Some cards finished and the rest waiting to start: the work is under way.
            if cockpit_state == "Not Started" and any(n in completed for n in names):
                return "In Progress", ""
            return cockpit_state, ""
    return None


def main(dry_run=False):
    sys.path.insert(0, str(COMMAND_CENTER))
    import cockpit_store as store
    from cockpit_db import get_conn

    cards, completed = read_board(BOARD.read_text(encoding="utf8"))
    known = set(cards) | completed
    conn = get_conn()
    project = store.get_project(conn, SLUG)
    tasks = conn.execute("SELECT task_code, task, status, blocker, notes FROM tasks "
                         "WHERE project_id = ? ORDER BY id", (project["id"],)).fetchall()
    tracked, changes, kept = set(), [], []
    for task in tasks:
        names = card_names(task["notes"], known)
        tracked.update(names)
        wanted = wanted_status(names, cards, completed)
        if wanted is None and task["status"] == "Blocked" and (task["blocker"] or "").startswith(WAITING):
            wanted = ("Not Started", "")  # Kyle answered and the card left the active list
        if wanted is None or (task["status"], task["blocker"] or "") == wanted:
            continue
        if (task["status"] or "").lower() in LEAVE_ALONE:
            kept.append(f"{task['task_code']} stays {task['status']} (board says {wanted[0]}): {task['task']}")
            continue
        status, blocker = wanted
        fields = {"status": status, "blocker": blocker}
        if status == "Done":
            fields["next_action"] = ""  # a finished task has no next step
        if dry_run:
            changes.append(f"{task['task_code']} {task['status']} -> {status}: {task['task']}")
            continue
        try:
            store.update_task(conn, SLUG, task["task_code"], fields, "board-sync")
            changes.append(f"{task['task_code']} {task['status']} -> {status}: {task['task']}")
        except Exception as error:
            conn.rollback()
            changes.append(f"{task['task_code']} not changed ({error})")
    for line in changes + kept:
        print(line)
    verb = "would change" if dry_run else "changed"
    print(f"cockpit-sync: {sum(' -> ' in line for line in changes)} task(s) {verb}")
    untracked = sorted(c for c, (status, _) in cards.items() if c not in tracked and status != "backlog")
    if untracked:
        print("Cards with no Cockpit task (add one or name them in a task's notes): " + ", ".join(untracked))


if __name__ == "__main__":
    try:
        main(dry_run="--dry-run" in sys.argv[1:])
    except Exception as error:  # never block a merge on Cockpit
        print(f"cockpit-sync warning: {error}")

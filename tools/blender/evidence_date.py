"""The Python twin of tools/evidence-date.mjs: the day of an `.evidence/<date>/` folder (QA-EVIDENCE-MIDNIGHT-AGAIN).

The day is the laptop's local calendar date. `DUEL_EVIDENCE_NOW` (a local time such as 2026-11-19T00:01:00, no zone)
fixes the clock exactly as it does for the Node tools, so a test that starts Node and Python children with one value
gets one day from all of them, whatever the hour. A value with a zone is read in that zone and turned to local time,
as JavaScript's `new Date()` does.
"""
import os
from datetime import date, datetime


def evidence_date(env=None):
    text = (os.environ if env is None else env).get('DUEL_EVIDENCE_NOW')
    if not text:
        return date.today().isoformat()
    try:
        moment = datetime.fromisoformat(text[:-1] + '+00:00' if text.endswith('Z') else text)
    except ValueError:
        raise ValueError(f'DUEL_EVIDENCE_NOW is not a date: {text}') from None
    if moment.tzinfo is not None:
        moment = moment.astimezone()
    return moment.date().isoformat()

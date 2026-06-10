"""Notification helpers - centralized in-app notifications."""
import uuid
from datetime import datetime, timezone


async def push_notification(db, user_id: str, kind: str, title: str, message: str, sound: str = "ding", icon: str = "Bell", link: str | None = None):
    """Create a notification visible in the user's bell dropdown."""
    doc = {
        "notif_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "kind": kind,
        "title": title,
        "message": message,
        "sound": sound,
        "icon": icon,
        "link": link,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notifications.insert_one(doc)
    return doc

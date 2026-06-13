"""Notification helpers - centralized in-app notifications.

Notifications are persisted in MongoDB AND pushed via Socket.IO when the
recipient is currently connected to the Nexus realtime layer.
"""
import uuid
from datetime import datetime, timezone


async def push_notification(db, user_id: str, kind: str, title: str, message: str,
                            sound: str = "ding", icon: str = "Bell", link: str | None = None):
    """Create a notification visible in the user's bell dropdown.
    Also pushes a `notification:new` event over Socket.IO if connected.
    """
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
    # Best-effort realtime push (lazy import to avoid circular deps)
    try:
        import logging
        import nexus_world
        # Strip MongoDB ObjectId (added by insert_one) so payload is JSON-serializable
        push_doc = {k: v for k, v in doc.items() if k != "_id"}
        await nexus_world.push_to_user(user_id, "notification:new", push_doc)
    except Exception as e:
        logging.getLogger("nexoria.notify").warning(f"push_notification realtime push failed: {e}")
    return doc

import { useState, useEffect } from "react";
import {
  fetchNotificationsAPI,
  createNotificationAPI,
  deleteNotificationAPI,
  markNotificationReadAPI,
  getNotificationTypeAPI,
  getSessionUser,
  deleteAllNotificationsAPI,
} from "../utils/functions";

// Helper: compute a user-friendly title for some types
function computeTitle(n) {
  if (!n) return "";
  if (n.type === "ban") {
    const dt = n.start_date || n.created_at || n.date || Date.now();
    try {
      const d = new Date(dt);
      const local = d.toLocaleDateString("he-IL");
      return `החסימה מתחילה בתאריך ${local}`;
    } catch (_) {
      return "החסימה התחילה";
    }
  }
  return n.title || "התראה";
}

// Helper: normalize a notification object for UI consumers
function normalizeNotification(n) {
  return {
    ...n,
    computedTitle: computeTitle(n),
    is_read: n.status === "read" || n.is_read === true,
  };
}

// Map notification types locally based on user_type if backend endpoint isn't available
function localTypesForUserType(user_type) {
  if (user_type === "admin") return ["question","stock update","ban"]; // admin gets questions to review,stock updates and bans
  if (user_type === "courier") return ["order", "ban"]; // courier relevant types
  return ["order", "ban", "answer"]; // default/customer
}

// fetch all notifications for the current user
// returns: { notifications, loading, error, refresh, markRead, remove, create, types }
export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [types, setTypes] = useState([]);
  const [userId, setUserId] = useState(null);
  const [userType, setUserType] = useState(null);

  // Load session user first
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const session = await getSessionUser();
        if (!mounted) return;
        const uid = session?.user_id || session?.id || null;
        setUserId(uid);
        setUserType(session?.user_type || null);
      } catch (e) {
        if (!mounted) return;
        setError("שגיאה באחזור המשתמש הנוכחי");
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Load types once we know the user
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!userId) return;
      try {
        // Try backend-provided types; fallback to local mapping
        let t = null;
        try {
          t = await getNotificationTypeAPI(userId);
        } catch (_) {
          // ignore
        }
        const resolved = Array.isArray(t) && t.length ? t : localTypesForUserType(userType);
        if (mounted) setTypes(resolved);
      } catch (_) {
        if (mounted) setTypes(localTypesForUserType(userType));
      }
    })();
    return () => { mounted = false; };
  }, [userId, userType]);

  // Load notifications
  useEffect(() => {
    let mounted = true;
    if (!userId) return;
    setLoading(true);
    (async () => {
      try {
        const list = await fetchNotificationsAPI(userId);
        if (!mounted) return;
        const normalized = Array.isArray(list) ? list.map(normalizeNotification) : [];
        setNotifications(normalized);
        setError(null);
      } catch (e) {
        if (!mounted) return;
        setError("שגיאה בטעינת ההתראות");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [userId, refresh]);

  const reload = () => setRefresh((x) => x + 1);

  const markRead = async (id) => {
    if (!id) return;
    try {
      await markNotificationReadAPI(id);
      setNotifications((arr) => arr.map((n) => (n.id === id ? { ...n, status: "read", is_read: true } : n)));
    } catch (e) {
      // keep silent here; consumer can show toast
      throw e;
    }
  };

  const remove = async (id) => {
    if (!id) return;
    try {
      await deleteNotificationAPI(id);
      setNotifications((arr) => arr.filter((n) => n.id !== id));
    } catch (e) {
      throw e;
    }
  };

  const create = async ({ user_id, type, related_id, title, description }) => {
    const data = await createNotificationAPI({ user_id, type, related_id, title, description });
    // Optimistically refresh
    reload();
    return data;
  };

  const removeAll = async () => {
    if (!userId) return;
    await deleteAllNotificationsAPI(userId);
    setNotifications([]);
  };

  const unreadCount = notifications.reduce((acc, n) => acc + (n.is_read ? 0 : 1), 0);

  return {
    notifications,
    loading,
    error,
    refresh: reload,
    markRead,
    remove,
    create,
    types,
    unreadCount,
    removeAll,
  };
}


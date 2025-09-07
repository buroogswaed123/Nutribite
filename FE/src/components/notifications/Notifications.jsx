import React, { useRef, useEffect } from 'react';
import styles from './Notifications.module.css';
import NotificationItem from './NotificationItem';

export default function Notifications({
  isOpen,
  onClose,
  notifications = [],
  loading = false,
  onOpenNotification,
  onDelete,
  onDeleteAll,
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!isOpen) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.container} ref={panelRef}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.title}>התראות</div>
          <button className={styles.deleteAllBtn} onClick={() => onDeleteAll?.()}>
            נקה הכל
          </button>
        </div>
        <div className={styles.list} style={{ maxHeight: 360 }}>
          {loading ? (
            <div className={styles.empty}>טוען...</div>
          ) : notifications.length === 0 ? (
            <div className={styles.empty}>אין התראות</div>
          ) : (
            notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onOpen={onOpenNotification}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

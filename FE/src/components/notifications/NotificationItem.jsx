import React from 'react';
import { Trash2 } from 'lucide-react';
import styles from './Notifications.module.css';

export default function NotificationItem({ notification, onOpen, onDelete }) {
  if (!notification) return null;
  const { id, computedTitle, title, description, is_read } = notification;
  const displayTitle = (computedTitle || title || 'התראה');
  const subtitle = description || '';

  return (
    <div className={styles.item} onClick={() => onOpen?.(notification)}>
      <div>
        <div className={styles.titleRow}>
          {!is_read && <span className={styles.unreadDot} />}
          <h3 className={styles.h3} title={displayTitle}>{displayTitle}</h3>
        </div>
        {subtitle ? (
          <p className={styles.subtitle} title={subtitle}>{subtitle}</p>
        ) : null}
      </div>
      <div className={styles.itemActions} onClick={(e) => e.stopPropagation()}>
        <button className={styles.trashBtn} aria-label="Delete notification" title="Delete"
          onClick={() => onDelete?.(id)}>
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

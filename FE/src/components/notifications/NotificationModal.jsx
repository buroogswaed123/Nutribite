import React from 'react';
import { X, Trash2, CheckCircle2 } from 'lucide-react';
import styles from './Notifications.module.css';

export default function NotificationModal({
  open,
  notification,
  onClose,
  onMarkRead,
  onDelete,
}) {
  if (!open || !notification) return null;

  const {
    id,
    title,
    computedTitle,
    description,
    type,
    created_at,
    is_read,
    related_id,
  } = notification || {};

  const displayTitle = computedTitle || title || 'התראה';
  const dateText = created_at ? new Date(created_at).toLocaleString('he-IL') : '';

  return (
    <div className={styles.modalOverlay} onClick={() => onClose?.()}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{displayTitle}</h3>
          <button className={styles.closeBtn} onClick={() => onClose?.()}>
            <X size={18} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.field}>
            <span className={styles.label}>סוג</span>
            <div className={styles.value}>{type || '-'}</div>
          </div>
          {related_id != null && (
            <div className={styles.field}>
              <span className={styles.label}>מזהה קשור</span>
              <div className={styles.value}>{String(related_id)}</div>
            </div>
          )}
          {description && (
            <div className={styles.field}>
              <span className={styles.label}>תיאור</span>
              <div className={styles.value}>{description}</div>
            </div>
          )}
          <div className={styles.meta}>
            {dateText && <span>נוצר: {dateText}</span>}
            {is_read ? <span>נקרא</span> : <span>לא נקרא</span>}
          </div>
        </div>
        <div className={styles.modalFooter}>
          {!is_read && (
            <button
              className={styles.primaryBtn}
              onClick={() => onMarkRead?.(id)}
            >
              סמן כנקרא
            </button>
          )}
          <button className={styles.dangerBtn} onClick={() => onDelete?.(id)}>
            <Trash2 size={16} style={{ marginInlineEnd: 6 }} /> מחק
          </button>
          <button className={styles.closeFooterBtn} onClick={() => onClose?.()}>סגור</button>
        </div>
      </div>
    </div>
  );
}
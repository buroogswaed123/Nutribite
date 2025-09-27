import React from 'react';
import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { renewPlanAPI, markNotificationReadAPI } from '../../utils/functions';
import styles from './Notifications.module.css';

export default function NotificationItem({ notification, onOpen, onDelete }) {
  const navigate = useNavigate();
  if (!notification) return null;
  const { id, computedTitle, title, description, is_read, status, type, related_id } = notification;
  const displayTitle = (computedTitle || title || 'התראה');
  const subtitle = description || '';
  const isRead = is_read || status === 'read';

  async function renewPlan(e) {
    e.stopPropagation();
    try {
      if (related_id) await renewPlanAPI(related_id);
      if (id) await markNotificationReadAPI(id);
      // Soft close by simulating delete (panel parent usually refreshes after delete)
      if (onDelete && id) onDelete(id);
    } catch (err) {
      console.error('Failed to renew plan from notification:', err);
    }
  }

  return (
    <div className={`${styles.item} ${isRead ? styles.readItem : ''}`} onClick={() => onOpen?.(notification)}>
      <div>
        <div className={styles.titleRow}>
          {!isRead && <span className={styles.unreadDot} />}
          <h3 className={styles.h3} title={displayTitle}>{displayTitle}</h3>
        </div>
        {subtitle ? (
          <p className={styles.subtitle} title={subtitle}>{subtitle}</p>
        ) : null}
        {type === 'plan' && (
          <div className={styles.inlineActions} onClick={(e)=> e.stopPropagation()}>
            <button className={styles.inlinePrimary} onClick={() => navigate('/plan-maker')}>
              כן, חשב מחדש
            </button>
            <button className={styles.inlineSecondary} onClick={renewPlan}>
              לא, חדש לשבוע
            </button>
          </div>
        )}
        {type === 'order' && (
          <div className={styles.inlineActions} onClick={(e)=> e.stopPropagation()}>
            <button
              className={styles.inlinePrimary}
              onClick={async () => {
                try {
                  if (id) await markNotificationReadAPI(id);
                } catch(_) {}
                try { window.dispatchEvent(new Event('notif-close')); } catch(_) {}
                if (related_id) {
                  navigate(`/orders/${related_id}`);
                } else {
                  navigate('/orders');
                }
              }}
            >
              הצג סטטוס
            </button>
            <button
              className={styles.inlineSecondary}
              onClick={async () => {
                try { if (id) await markNotificationReadAPI(id); } catch(_) {}
                try { window.dispatchEvent(new Event('notif-close')); } catch(_) {}
                // Placeholder for receipt download; navigate to details for now
                if (related_id) {
                  navigate(`/orders/${related_id}`);
                } else {
                  navigate('/orders');
                }
              }}
            >
              הורד קבלה
            </button>
          </div>
        )}
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

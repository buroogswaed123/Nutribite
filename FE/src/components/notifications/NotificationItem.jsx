import React from 'react';
import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { renewPlanAPI, markNotificationReadAPI, getOrderAPI, deleteOrderAPI } from '../../utils/functions';
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
        {type === 'order' && (() => {
          const t = String(displayTitle || '').toLowerCase();
          const isContinue = t.includes('continue your order') || displayTitle.includes('המשך הגדרת ההזמנה');
          if (isContinue) {
            return (
              <div className={styles.inlineActions} onClick={(e)=> e.stopPropagation()}>
                <button
                  className={styles.inlinePrimary}
                  onClick={async () => {
                    try { if (id) await markNotificationReadAPI(id); } catch(_) {}
                    try { window.dispatchEvent(new Event('notif-close')); } catch(_) {}
                    if (related_id) {
                      // Guard: if order is not draft anymore, do not allow editing flow
                      try {
                        const od = await getOrderAPI(Number(related_id));
                        const status = od?.order?.order_status;
                        if (status && status !== 'draft') {
                          // eslint-disable-next-line no-alert
                          alert('ההזמנה הושלמה/איננה בטיוטה. לא ניתן להמשיך עריכה.');
                        }
                      } catch(_) {}
                      navigate(`/orders/${related_id}`);
                    } else {
                      navigate('/orders');
                    }
                  }}
                >
                  המשך הזמנה
                </button>
                <button
                  className={styles.inlineSecondary}
                  onClick={async () => {
                    try {
                      if (!related_id) return;
                      // Check draft status before deletion
                      let canDelete = true;
                      try {
                        const od = await getOrderAPI(Number(related_id));
                        const st = String(od?.order?.order_status || '').toLowerCase();
                        if (st !== 'draft') {
                          canDelete = false;
                          alert('לא ניתן לבטל הזמנה שאינה בטיוטה.');
                          return;
                        }
                      } catch (_) {}
                      if (canDelete) {
                        const ok = window.confirm('לבטל ולהסיר את ההזמנה בטיוטה? פעולה זו תמחק את הטיוטה.');
                        if (!ok) return;
                        await deleteOrderAPI(Number(related_id));
                        try { if (id) await markNotificationReadAPI(id); } catch(_) {}
                        if (onDelete && id) onDelete(id);
                        try { window.dispatchEvent(new Event('notif-close')); } catch(_) {}
                      }
                    } catch (err) {
                      console.error('Failed to cancel draft order from notification:', err);
                      alert('ביטול ההזמנה נכשל.');
                    }
                  }}
                >
                  בטל הזמנה
                </button>
              </div>
            );
          }
          return (
            <div className={styles.inlineActions} onClick={(e)=> e.stopPropagation()}>
              <button
                className={styles.inlinePrimary}
                onClick={async () => {
                  try { if (id) await markNotificationReadAPI(id); } catch(_) {}
                  try { window.dispatchEvent(new Event('notif-close')); } catch(_) {}
                  if (related_id) navigate(`/orders/${related_id}`); else navigate('/orders');
                }}
              >
                הצג סטטוס
              </button>
              <button
                className={styles.inlineSecondary}
                onClick={async () => {
                  try { if (id) await markNotificationReadAPI(id); } catch(_) {}
                  try { window.dispatchEvent(new Event('notif-close')); } catch(_) {}
                  if (related_id) navigate(`/orders/${related_id}?action=download-receipt`); else navigate('/orders');
                }}
              >
                הורד קבלה
              </button>
            </div>
          );
        })()}
        {type === 'faq_answer' && (
          <div className={styles.inlineActions} onClick={(e)=> e.stopPropagation()}>
            <button
              className={styles.inlinePrimary}
              onClick={async () => {
                try { if (id) await markNotificationReadAPI(id); } catch(_) {}
                try { window.dispatchEvent(new Event('notif-close')); } catch(_) {}
                const qid = related_id ? String(related_id) : '';
                const params = new URLSearchParams();
                // We can always include tab=my; the FAQ page will switch to public if the question is public
                params.set('tab', 'my');
                if (qid) params.set('highlight', qid);
                navigate(`/faq?${params.toString()}`);
              }}
            >
              צפה בתשובה
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

import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { renewPlanAPI, markNotificationReadAPI, getOrderAPI, deleteOrderAPI } from '../../utils/functions';
import styles from './Notifications.module.css';

export default function NotificationItem({ notification, onOpen, onDelete }) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
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
                          setConfirmError('ההזמנה הושלמה/איננה בטיוטה. לא ניתן להמשיך עריכה.');
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
                    setConfirmError('');
                    setConfirmOpen(true);
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
      {/* Confirm cancel draft order modal */}
      {confirmOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}
             onClick={() => !confirmLoading && setConfirmOpen(false)}>
          <div style={{ background:'#fff', borderRadius:12, width:'min(520px, 92vw)', padding:16, boxShadow:'0 10px 24px rgba(0,0,0,0.2)' }}
               onClick={(e)=> e.stopPropagation()}>
            <h3 style={{ marginTop:0, marginBottom:8 }}>ביטול הזמנה בטיוטה</h3>
            <p style={{ color:'#374151', marginTop:0 }}>האם לבטל ולהסיר לצמיתות את ההזמנה בטיוטה? פעולה זו תמחק את הטיוטה.</p>
            {confirmError && <div style={{ color:'#b91c1c', marginBottom:8 }}>{confirmError}</div>}
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className={styles.inlineSecondary} disabled={confirmLoading} onClick={()=> setConfirmOpen(false)}>ביטול</button>
              <button
                className={styles.inlinePrimary}
                disabled={confirmLoading}
                onClick={async ()=> {
                  try {
                    setConfirmLoading(true);
                    if (!related_id) { setConfirmError('מזהה הזמנה חסר'); return; }
                    // Validate still draft before deleting
                    let st = 'draft';
                    try {
                      const od = await getOrderAPI(Number(related_id));
                      st = String(od?.order?.order_status || '').toLowerCase();
                    } catch (_) {}
                    if (st !== 'draft') { setConfirmError('לא ניתן לבטל הזמנה שאינה בטיוטה.'); return; }
                    await deleteOrderAPI(Number(related_id));
                    try { if (id) await markNotificationReadAPI(id); } catch(_) {}
                    if (onDelete && id) onDelete(id);
                    try { window.dispatchEvent(new Event('notif-close')); } catch(_) {}
                    setConfirmOpen(false);
                  } catch (err) {
                    console.error('Failed to cancel draft order from notification:', err);
                    setConfirmError('ביטול ההזמנה נכשל');
                  } finally {
                    setConfirmLoading(false);
                  }
                }}
              >
                {confirmLoading ? 'מבטל…' : 'אשר ביטול'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { X, Trash2 } from 'lucide-react';
import styles from './Notifications.module.css';
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function NotificationModal({
  open,
  notification,
  onClose,
  onMarkRead,
  onDelete,
}) {
  // Unban request state
  const [showUnbanForm, setShowUnbanForm] = useState(false);
  const [unbanReason, setUnbanReason] = useState('');
  const [sending, setSending] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminId, setAdminId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const { createNotification } = useAuth();

  // Initialize identities for unban flow from the notification itself
  useEffect(() => {
    if (!open || !notification) return;
    // Prefer fields on the notification if present
    const nb = notification.banned_by || notification.admin_id || null;
    const nbName = notification.banned_by_name || notification.admin_name || '';
    setAdminId(nb);
    setAdminName(nbName);
    // The requester is the notification recipient (current user);
    // many backends omit this, but we can fall back to related_id when it represents the user
    const meId = notification.recipient_id || notification.user_id || null;
    setCurrentUserId(meId);
  }, [open, notification]);

  // After hooks: safely destructure and compute display values
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

          {type === 'ban' && (
            <div style={{ marginTop: 10 }}>
              {!showUnbanForm ? (
                <button
                  className={styles.primaryBtn}
                  onClick={() => setShowUnbanForm(true)}
                >
                  שלח בקשת ביטול חסימה
                </button>
              ) : (
                <div>
                  <label className={styles.label} htmlFor="unbanReason">נימוק לבקשת ביטול חסימה</label>
                  <textarea
                    id="unbanReason"
                    className={styles.textarea}
                    rows={4}
                    placeholder="כתוב כאן מדוע לדעתך יש להסיר את החסימה"
                    value={unbanReason}
                    onChange={(e) => setUnbanReason(e.target.value)}
                  />
                  <div className={styles.modalFooter}>
                    <button
                      className={styles.closeFooterBtn}
                      disabled={sending}
                      onClick={() => setShowUnbanForm(false)}
                    >ביטול</button>
                    <button
                      className={styles.primaryBtn}
                      disabled={sending || !unbanReason.trim() || !adminId}
                      onClick={async () => {
                        try {
                          if (!adminId) return;
                          setSending(true);
                          const title = 'בקשת ביטול חסימה';
                          await createNotification({
                            user_id: adminId,
                            type: 'unban request',
                            related_id: currentUserId || null,
                            title,
                            description: unbanReason.trim(),
                          });
                          setShowUnbanForm(false);
                          setUnbanReason('');
                          // Optionally mark as read
                          onMarkRead?.(id);
                        } catch (e) {
                          console.error('Failed to send unban request', e);
                        } finally {
                          setSending(false);
                        }
                      }}
                    >שלח</button>
                  </div>
                </div>
              )}
            </div>
          )}
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
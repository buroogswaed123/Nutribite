import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import styles from './ErrorModal.module.css';

export default function ErrorModal({ message, onClose }) {
  if (!message) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={20} />
        </button>
        
        <div className={styles.iconWrapper}>
          <AlertCircle size={48} color="#ef4444" />
        </div>
        
        <h2 className={styles.title}>שגיאה</h2>
        <p className={styles.message}>{message}</p>
        
        <button className={styles.okBtn} onClick={onClose}>
          אישור
        </button>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import styles from './contact.module.css';

export default function ContactUs() {
  const [name, setName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [message, setMessage] = useState('');

  const supportEmail = 'support@nutribite.com';

  const onSubmit = (e) => {
    e.preventDefault();
    const subject = `פנייה מאת ${name || 'ללא שם'}`;
    const bodyLines = [
      `שם: ${name || ''}`,
      `אימייל: ${fromEmail || ''}`,
      '',
      message || '',
    ];
    const href = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
    window.location.href = href;
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>צור קשר</h1>
      <p className={styles.lead}>
        נשמח לשמוע ממך. אפשר לשלוח מייל ישירות אל
        {' '}
        <a className={styles.link} href={`mailto:${supportEmail}`}>{supportEmail}</a>
        {' '}
        או למלא את הטופס:
      </p>

      <form onSubmit={onSubmit} className={styles.form}>
        <label className={styles.label}>
          <span>שם</span>
          <input
            className={styles.input}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="הקלד/י שם"
          />
        </label>

        <label className={styles.label}>
          <span>אימייל</span>
          <input
            className={styles.input}
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder="דואר אלקטרוני"
          />
        </label>

        <label className={styles.label}>
          <span>הודעה</span>
          <textarea
            className={styles.textarea}
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="כתוב/י את הודעתך כאן..."   
          />
        </label>

        <div className={styles.actions}>
          <button type="submit" className={styles.btn}>שליחה</button>
          <a className={styles.link} href={`mailto:${supportEmail}`}>שליחה ישירה במייל</a>
        </div>
      </form>
    </div>
  );
}
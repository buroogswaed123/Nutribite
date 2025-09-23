import React, { useState, useEffect } from 'react';
import { isPublicQuestion } from '../../../../utils/functions';
import styles from './faq.module.css';

function FAQ({ currentUser }) {
  const [items, setItems] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  // Resolved user (from prop or localStorage fallback)
  const [resolvedUser, setResolvedUser] = useState(currentUser);
  // Normalize user type for robust checks
  const userType = (resolvedUser?.user_type || '').toString().trim().toLowerCase();
  const isAdmin = userType === 'admin';
  const isCustomer = userType === 'customer';
  // Debug: verify received currentUser

 
  useEffect(() => {
    console.log('FAQ currentUser:', currentUser);
  }, [currentUser]);

  // Keep resolvedUser in sync with prop when provided
  useEffect(() => {
    if (currentUser) {
      setResolvedUser(currentUser);
      return;
    }
    // Fallback: try common localStorage keys
    try {
      const keys = ['currentUser', 'user', 'authUser'];
      for (const k of keys) {
        const raw = window.localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            setResolvedUser(parsed);
            break;
          }
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.debug('No user in localStorage');
    }
  }, [currentUser]);

  useEffect(() => {
    // Fetch questions from backend with optional text search (q)
    const q = String(searchTerm || '').trim();
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    fetch(`/api/questions${qs}`, { credentials: 'include' })
      .then(async (res) => {
        try {
          const data = await res.json();
          return data;
        } catch (e) {
          return [];
        }
      })
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error(err);
        setItems([]);
      });
  }, [searchTerm]);

  const handleAddQuestion = async () => {
    const q = newQuestion.trim();
    if (!q) return;
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_text: q, user_id: resolvedUser?.user_id }),
      });
      const data = await res.json();
      setItems([data, ...items]);
      setNewQuestion('');
      setShowConfirm(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAnswer = async (id, answer) => {
    try {
      const res = await fetch(`/api/questions/${id}/answer`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer_text: answer }),
      });
      const updated = await res.json();
      setItems(items.map(i => (i.question_id === id ? updated : i)));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className={styles.faq} dir="rtl">
      <h1 className={styles.title}>שאלות ותשובות על אוכל בריא</h1>

      <div className={styles.form}>
        <input
          className={styles.input}
          type="text"
          placeholder="חיפוש לפי מילות מפתח..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        {isCustomer && (
          <button
            className={styles.button}
            onClick={() => setShowAddModal(true)}
          >
            הוסף שאלה
          </button>
        )}
      </div>

      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()} dir="rtl">
            <h3 className={styles.modalTitle}>הוסף שאלה חדשה</h3>
            <input
              className={styles.input}
              type="text"
              placeholder="הקלד/י שאלה..."
              value={newQuestion}
              onChange={e => setNewQuestion(e.target.value)}
            />
            <div className={styles.modalActions}>
              <button
                className={styles.modalButton}
                onClick={() => {
                  handleAddQuestion();
                  setShowAddModal(false);
                }}
              >
                שלח שאלה
              </button>
              <button className={styles.modalButton} onClick={() => setShowAddModal(false)}>בטל</button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className={styles.modalOverlay} onClick={() => setShowConfirm(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()} dir="rtl">
            <h3 className={styles.modalTitle}>השאלה שלך נשלחה לאישור מנהל</h3>
            <div className={styles.modalActions}>
              <button className={styles.modalButton} onClick={() => setShowConfirm(false)}>סגור</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.list}>
        {Array.isArray(items) && items
          .filter(isPublicQuestion)
          .filter(i => {
            const q = (searchTerm || '').toLowerCase().trim();
            if (!q) return true;
            const question = (i.question_text || '').toLowerCase();
            const answer = (i.answer_text || '').toLowerCase();
            return question.includes(q) || answer.includes(q);
          })
          .map(item => (
          <div key={item.question_id} className={styles.item}>
            <h3 className={styles.question}>{item.question_text}</h3>
            {isAdmin && !item.answered && (
              <AdminAnswerForm question={item} onAnswer={handleAnswer} />
            )}
            {item.answered && (
              <div className={styles.dietitianAnswer}>
                <p className={styles.answerText}>{item.answer_text}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Small sub-component for admin answering
function AdminAnswerForm({ question, onAnswer }) {
  const [answer, setAnswer] = useState('');
  return (
    <div>
      <input
        type="text"
        placeholder="כתוב תשובה..."
        value={answer}
        onChange={e => setAnswer(e.target.value)}
      />
      <button onClick={() => onAnswer(question.question_id, answer)}>שלח תשובה</button>
    </div>
  );
}

export default FAQ;

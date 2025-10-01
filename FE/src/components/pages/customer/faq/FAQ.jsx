import React, { useState, useEffect, useMemo, useRef } from 'react';
import Loading from '../../../common/Loading';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { isPublicQuestion } from '../../../../utils/functions';
import styles from './faq.module.css';

function FAQ({ currentUser }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('public'); // kept for deep-link compatibility
  const [highlightId, setHighlightId] = useState(null);
  const highlightRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchMy, setSearchMy] = useState('');
  const [isMobile, setIsMobile] = useState(false);
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

  // Responsive: detect mobile width
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const onChange = () => setIsMobile(!!mq.matches);
    try {
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    } catch(_) {}
    onChange();
    return () => {
      try {
        if (mq.removeEventListener) mq.removeEventListener('change', onChange);
        else if (mq.removeListener) mq.removeListener(onChange);
      } catch(_) {}
    };
  }, []);
 
  // Parse query params for tab and highlight deep-linking
  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const tab = (params.get('tab') || '').toLowerCase();
    if (tab === 'my' || tab === 'public') {
      setActiveTab(tab);
    }
    const hi = params.get('highlight');
    if (hi) {
      setHighlightId(String(hi));
    }
    if (tab === 'my' || hi) {
      setSidebarOpen(true);
    }
  }, [location.search]);
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
    setLoading(true);
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
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setItems([]);
        setLoading(false);
      });
  }, [searchTerm]);

  // After items load/update, if highlightId is present, decide where to focus it
  useEffect(() => {
    if (!highlightId) return;
    // find the question
    const found = (Array.isArray(items) ? items : []).find(i => String(i.question_id) === String(highlightId));
    const isPub = found && isPublicQuestion(found);
    if (isPub) {
      // Keep public view; ensure sidebar is closed
      if (activeTab !== 'public') setActiveTab('public');
      setSidebarOpen(false);
    } else {
      // Not public: open My Questions sidebar
      if (activeTab !== 'my') setActiveTab('my');
      setSidebarOpen(true);
    }
    const el = highlightRef.current;
    if (el && typeof el.scrollIntoView === 'function') {
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (_) {}
    }
    const t = setTimeout(() => setHighlightId(null), 3000);
    return () => clearTimeout(t);
  }, [items, highlightId, activeTab]);

  // Derived collections per tab
  const publicItems = useMemo(() => (Array.isArray(items) ? items.filter(isPublicQuestion) : []), [items]);
  const myItems = useMemo(() => {
    const uid = resolvedUser?.user_id;
    if (!uid) return [];
    return (Array.isArray(items) ? items.filter(i => String(i.user_id) === String(uid)) : []);
  }, [items, resolvedUser]);

  const myFiltered = useMemo(() => {
    const q = (searchMy || '').toLowerCase().trim();
    if (!q) return myItems;
    return myItems.filter(i =>
      (i.question_text || '').toLowerCase().includes(q) ||
      (i.answer_text || '').toLowerCase().includes(q)
    );
  }, [myItems, searchMy]);

  const displayed = publicItems; // main area always shows public FAQ now

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

  if (loading) {
    return <Loading text="טוען שאלות..." />;
  }

  return (
    <div className={styles.faq} dir="rtl">
      <h1 className={styles.title}>שאלות ותשובות  </h1>
      <div style={{ color: '#6b7280', fontSize: 12, marginTop: -8, marginBottom: 8 }}>סה"כ שאלות : {publicItems.length}</div>

      {/* Sidebar attached handle (top-left), only when closed */}
      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open my questions"
          className={styles.sidebarHandleClosed}
          title={'פתח שאלות שלי'}
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* Left Sidebar: My Questions */}
      <div className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`} aria-hidden={!sidebarOpen}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarTitle}>השאלות שלי</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={styles.sidebarBadge}>{myItems.length}</span>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close my questions"
              title="סגור"
              className={styles.sidebarCloseBtn}
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
        <input
          type="text"
          value={searchMy}
          onChange={e => setSearchMy(e.target.value)}
          placeholder="חפש בשאלות שלך..."
          className={styles.sidebarSearchInput}
        />
        <div className={styles.sidebarList}>
          {myFiltered.length === 0 ? (
            searchMy.trim() ? (
              <div className={styles.sidebarNoResults}>לא נמצאו תוצאות התואמות את החיפוש</div>
            ) : (
              <div className={styles.sidebarEmpty}>אין לך שאלות להצגה כרגע</div>
            )
          ) : (
            myFiltered.map(item => {
              const isHighlighted = highlightId && String(item.question_id) === String(highlightId);
              return (
                <div
                  key={item.question_id}
                  ref={isHighlighted ? highlightRef : null}
                  className={`${styles.sidebarItem} ${isHighlighted ? styles.highlight : ''}`}
                  onClick={() => {
                    setHighlightId(String(item.question_id));
                    const p = new URLSearchParams(location.search || '');
                    p.set('tab', 'my');
                    p.set('highlight', String(item.question_id));
                    navigate(`/faq?${p.toString()}`, { replace: true });
                  }}
                >
                  <div className={styles.sidebarItemTitle}>{item.question_text}</div>
                  {item.answered ? (
                    <div style={{ fontSize: 13, color: '#111827' }}>{item.answer_text}</div>
                  ) : (
                    <div className={styles.sidebarItemPending}>ממתין לתשובה</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Mobile overlay when sidebar is open */}
      {sidebarOpen && isMobile && (
        <div
          onClick={() => setSidebarOpen(false)}
          className={styles.mobileOverlay}
          aria-hidden
        />
      )}

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
            <h3 className={styles.modalTitle}>השאלה שלך נשלחה  למנהל</h3>
            <div className={styles.modalActions}>
              <button className={styles.modalButton} onClick={() => setShowConfirm(false)}>סגור</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.list}>
        {Array.isArray(displayed) && displayed
          .filter(i => {
            const q = (searchTerm || '').toLowerCase().trim();
            if (!q) return true;
            const question = (i.question_text || '').toLowerCase();
            const answer = (i.answer_text || '').toLowerCase();
            return question.includes(q) || answer.includes(q);
          })
          .map(item => {
            const isHighlighted = highlightId && String(item.question_id) === String(highlightId);
            return (
              <div
                key={item.question_id}
                ref={isHighlighted ? highlightRef : null}
                className={`${styles.item} ${isHighlighted ? styles.highlight : ''}`}
              >
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
            );
          })}
        {Array.isArray(displayed) && displayed.filter(i => {
          const q = (searchTerm || '').toLowerCase().trim();
          if (!q) return true;
          const question = (i.question_text || '').toLowerCase();
          const answer = (i.answer_text || '').toLowerCase();
          return question.includes(q) || answer.includes(q);
        }).length === 0 && (
          <div style={{ color: '#6b7280', fontSize: 14, padding: 12 }}>
            לא נמצאו תוצאות לשאילתה בחלק הציבורי
          </div>
        )}
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

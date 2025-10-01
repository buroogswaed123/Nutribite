import React, { useEffect, useMemo, useState } from 'react';
import Loading from '../../../common/Loading';
import styles from './adminFaq.module.css';

export default function AdminFAQ() {
  const [tab, setTab] = useState('all'); // 'unanswered' | 'answered' | 'all'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [answerText, setAnswerText] = useState({}); // { [id]: text }
  const [publishing, setPublishing] = useState({}); // { [id]: boolean }
  const [saving, setSaving] = useState({}); // { [id]: boolean }
  const [unansweredFirst, setUnansweredFirst] = useState(true);
  // Reply modal state (admin only)
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyEditingId, setReplyEditingId] = useState(null);
  const [replyText, setReplyText] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const qs = new URLSearchParams();
      if (tab === 'unanswered') qs.set('answered', 'false');
      if (tab === 'answered') qs.set('answered', 'true');
      // when tab==='all' we don't set answered param => fetch all
      const res = await fetch(`/api/questions?${qs.toString()}`, { credentials: 'include' });
      const data = await res.json().catch(() => []);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || 'שגיאה בטעינת שאלות');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const openReplyModal = (q) => {
    setReplyEditingId(q.question_id);
    setReplyText(q.answer_text || '');
    setReplyModalOpen(true);
  };

  const closeReplyModal = () => {
    setReplyModalOpen(false);
    setReplyEditingId(null);
    setReplyText('');
  };

  const saveReplyFromModal = async () => {
    if (!replyEditingId) return;
    try {
      setSaving(s => ({ ...s, [replyEditingId]: true }));
      const res = await fetch(`/api/questions/${replyEditingId}/answer`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer_text: String(replyText || '').trim() })
      });
      if (!res.ok) throw new Error('שמירת תשובה נכשלה');
      const updated = await res.json();
      setItems(prev => prev.map(it => it.question_id === replyEditingId ? updated : it));
      closeReplyModal();
    } catch (e) {
      setError(e?.message || 'שמירת תשובה נכשלה');
    } finally {
      setSaving(s => ({ ...s, [replyEditingId]: false }));
    }
  };

  useEffect(() => { fetchData(); }, [tab]);

  const unanswered = useMemo(() => items.filter(q => !q.answered), [items]);
  const answered = useMemo(() => items.filter(q => !!q.answered), [items]);
  const all = useMemo(() => {
    if (!Array.isArray(items)) return [];
    if (!unansweredFirst) return [...items].sort((a,b) => (new Date(b.created_at||0)) - (new Date(a.created_at||0)));
    // unanswered first, then newest
    return [...items].sort((a,b) => {
      const aUn = a.answered ? 1 : 0;
      const bUn = b.answered ? 1 : 0;
      if (aUn !== bUn) return aUn - bUn; // 0 (unanswered) comes before 1 (answered)
      const ad = new Date(a.created_at||0).getTime();
      const bd = new Date(b.created_at||0).getTime();
      return bd - ad;
    });
  }, [items, unansweredFirst]);

  const handleAnswer = async (q) => {
    const txt = String(answerText[q.question_id] || '').trim();
    if (!txt) return;
    try {
      setSaving(s => ({ ...s, [q.question_id]: true }));
      const res = await fetch(`/api/questions/${q.question_id}/answer`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer_text: txt })
      });
      if (!res.ok) throw new Error('שמירת תשובה נכשלה');
      const updated = await res.json();
      setItems(prev => prev.map(it => it.question_id === q.question_id ? updated : it));
      setAnswerText(a => ({ ...a, [q.question_id]: '' }));
      // Optionally publish immediately if requested
      if (publishing[q.question_id]) {
        try {
          await fetch(`/api/questions/${q.question_id}/visibility`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ public: true }) });
          setItems(prev => prev.map(it => it.question_id === q.question_id ? { ...it, public: 1 } : it));
        } catch {}
      }
    } catch (e) {
      setError(e?.message || 'שמירת תשובה נכשלה');
    } finally {
      setSaving(s => ({ ...s, [q.question_id]: false }));
    }
  };

  const togglePublish = async (q, next) => {
    try {
      setSaving(s => ({ ...s, [q.question_id]: true }));
      const res = await fetch(`/api/questions/${q.question_id}/visibility`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public: !!next })
      });
      if (!res.ok) throw new Error('עדכון פרסום נכשל');
      setItems(prev => prev.map(it => it.question_id === q.question_id ? { ...it, public: next ? 1 : 0 } : it));
    } catch (e) {
      setError(e?.message || 'עדכון פרסום נכשל');
    } finally {
      setSaving(s => ({ ...s, [q.question_id]: false }));
    }
  };

  const list = tab === 'unanswered' ? unanswered : (tab === 'answered' ? answered : all);

  return (
    <div className={styles.wrap} dir="rtl">
      <h1 className={styles.title}>ניהול תגובות</h1>
      <div className={styles.tabs}>
        <button className={`${styles.tabBtn} ${tab==='unanswered'?styles.active:''}`} onClick={()=> setTab('unanswered')}>ממתינות למענה</button>
        <button className={`${styles.tabBtn} ${tab==='answered'?styles.active:''}`} onClick={()=> setTab('answered')}>נענו</button>
        <button className={`${styles.tabBtn} ${tab==='all'?styles.active:''}`} onClick={()=> setTab('all')}>הכל</button>
        {tab === 'all' && (
          <label className={styles.inline} style={{ marginInlineStart: 12 }}>
            <input type="checkbox" checked={!!unansweredFirst} onChange={(e)=> setUnansweredFirst(e.target.checked)} />
            סדר ממתינות למעלה
          </label>
        )}
      </div>
      {error && <div className={styles.error}>{error}</div>}
      {loading ? (
        <Loading text="טוען שאלות..." />
      ) : (
        <>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>שאלה</th>
                <th>נשלחה</th>
                {tab==='answered' && <th>תשובה</th>}
                <th>פרסום</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {list.map(q => (
                <tr key={q.question_id}>
                  <td>{q.question_id}</td>
                  <td>{q.question_text}</td>
                  <td>{q.created_at ? new Date(q.created_at).toLocaleString('he-IL') : '—'}</td>
                  {tab==='answered' && (
                    <td>
                      <div className={styles.answerBox}>{q.answer_text || '—'}</div>
                    </td>
                  )}
                  <td>
                    {tab==='unanswered' ? (
                      <label className={styles.inline}>
                        <input type="checkbox" checked={!!publishing[q.question_id]} onChange={(e)=> setPublishing(p=>({ ...p, [q.question_id]: e.target.checked }))} />
                        פרסם לאחר מענה
                      </label>
                    ) : (
                      <label className={styles.inline}>
                        <input type="checkbox" checked={!!q.public} onChange={(e)=> togglePublish(q, e.target.checked)} disabled={!!saving[q.question_id]} />
                        פרסם 
                      </label>
                    )}
                  </td>
                  <td>
                    {tab==='unanswered' ? (
                      <div className={styles.answerInline}>
                        <input
                          className={styles.input}
                          placeholder="כתוב תשובה"
                          value={answerText[q.question_id] || ''}
                          onChange={(e)=> setAnswerText(a=>({ ...a, [q.question_id]: e.target.value }))}
                        />
                        <button className={styles.btn} disabled={!!saving[q.question_id] || !answerText[q.question_id]} onClick={()=> handleAnswer(q)}>
                          {saving[q.question_id] ? 'שומר…' : 'השב'}
                        </button>
                        <button className={styles.btn} onClick={()=> openReplyModal(q)}>
                          צפה בתשובה
                        </button>
                      </div>
                    ) : (
                      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <button className={styles.btn} onClick={()=> openReplyModal(q)} disabled={!q.answer_text}>
                          צפה בתשובה
                        </button>
                        {!q.answer_text && <span className={styles.muted}>אין תשובה</span>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <div className={styles.muted} style={{ padding: 12 }}>אין פריטים להצגה</div>}
        </div>
        {replyModalOpen && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:50 }} onClick={closeReplyModal}>
            <div style={{ background:'#fff', width:'min(600px, 92vw)', margin:'10vh auto', borderRadius:12, padding:16 }} onClick={(e)=> e.stopPropagation()} dir="rtl">
              <h3 style={{ marginTop:0, marginBottom:12 }}>עריכת תשובה</h3>
              <textarea
                className={styles.input}
                style={{ width:'100%', minHeight:140, resize:'vertical' }}
                value={replyText}
                onChange={(e)=> setReplyText(e.target.value)}
                placeholder="כתוב/י תשובה..."
              />
              <div style={{ display:'flex', gap:8, justifyContent:'flex-start', marginTop:12 }}>
                <button className={styles.btn} onClick={saveReplyFromModal} disabled={!!saving[replyEditingId]}>
                  {saving[replyEditingId] ? 'שומר…' : 'שמור'}
                </button>
                <button className={styles.btn} onClick={closeReplyModal}>בטל</button>
              </div>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
}

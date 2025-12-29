// Customer profile: avatar, settings, plans summary, and orders/deliveries with grouped details
import React, { useState, useContext, useEffect } from 'react';
import { Settings as SettingsIcon, Pencil, Check, X, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../../../app/App';
import styles from './profile.module.css';
import headerStyles from '../../../layout/header/header.module.css';
import Settings from './Settings';
import { listPlansAPI, listOrdersAPI, getOrderAPI, ensureImageUrl } from '../../../../utils/functions';

const buildProfileImageUrl = (raw) =>
  raw?.startsWith('http') ? raw : `/${(raw || 'uploads/profile/default.png').replace(/^\/+/, '')}`;

export default function Profile() {
  const { currentUser } = useContext(AuthContext) || {};
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('התוכנית שלי');
  const [customerName, setCustomerName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [profileImage, setProfileImage] = useState(currentUser?.profile_image || '');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [custId, setCustId] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [plans, setPlans] = useState([]);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', text: string }
  // Orders state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersErr, setOrdersErr] = useState('');
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null); // { order, items }
  const [deliveryCtx, setDeliveryCtx] = useState(null); // { order_id, category }
  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2500);
  };

  // Helpers for items
  const itemCategory = (it) => (
    it.category_name || it.category || it.recipe_category || it.category_he || it.meal_type || it.type || it.group || 'קטגוריה'
  );
  const itemUnitPrice = (it) => {
    const candidates = [
      it.unit_price_gross, it.unit_price, it.unitPrice, it.price_gross, it.gross_price,
      it.price_with_tax, it.price, it.unit, it.unit_cost
    ];
    for (const v of candidates) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) return n;
    }
    // if an explicit line total exists and qty exists, derive unit
    const lt = Number(it.line_total ?? it.total_price ?? it.total);
    const q = Number(it.quantity ?? it.qty ?? 0);
    if (Number.isFinite(lt) && lt > 0 && Number.isFinite(q) && q > 0) return lt / q;
    return 0;
  };
  const itemQty = (it) => {
    const candidates = [it.quantity, it.qty, it.count, it.amount];
    for (const v of candidates) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return 1;
  };
  const itemTotal = (it) => {
    const candidates = [it.line_total, it.total_price, it.total, it.gross_total, it.price_total];
    for (const v of candidates) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) return n;
    }
    return itemUnitPrice(it) * itemQty(it);
  };
  const itemDeliveryTime = (it) => it.delivery_time || it.scheduled_time || it.expected_at || null;

  const fmtDT = (s) => {
    if (!s) return null;
    try { const d = new Date(s); return d.toLocaleString('he-IL'); } catch { return String(s); }
  };

  const username = currentUser?.username || 'User';
  const imgSrc = buildProfileImageUrl(profileImage);

  // Helpers: normalize backend order fields and map status to Hebrew
  const statusHe = (raw) => {
    const s = String(raw || '').toLowerCase();
    const map = {
      pending: 'ממתינה',
      draft: 'טיוטה',
      processing: 'בעיבוד',
      confirmed: 'אושרה',
      preparing: 'בהכנה',
      ready: 'מוכנה',
      assigned: 'שויך שליח',
      picked_up: 'נאספה',
      shipped: 'נשלחה',
      out_for_delivery: 'בדרכה אליך',
      delivered: 'נמסרה',
      cancelled: 'בוטלה',
      canceled: 'בוטלה',
      failed: 'נכשלה',
      refunded: 'הוחזר תשלום',
    };
    return map[s] || (raw ? String(raw) : '—');
  };

  const normalizeOrder = (o) => {
    if (!o) return {};
    const eta = o.expected_delivery_at || o.delivery_eta || o.eta || o.expected_at || null;
    const delivered = o.delivered_at || o.completed_at || o.delivered || null;
    const courier = o.courier_name || o.courier || o.courier_id || null;
    const total = (o.total_price != null ? o.total_price : (o.total != null ? o.total : null));
    return {
      id: o.order_id || o.id,
      status: statusHe(o.status),
      rawStatus: o.status,
      eta,
      delivered,
      courier,
      total,
    };
  };

  const getUserType = () => {
    const type = currentUser?.user_type || (typeof window !== 'undefined' ? localStorage.getItem('user_type') : null);
    return (type || '').toString();
  };
  const getHomePath = () => {
    const type = getUserType().toLowerCase();
    if (type === 'admin') return '/adminhome';
    if (type === 'courier') return '/courier/dashboard';
    if (type === 'customer') return '/customerhome';
    return '/customerhome';
  };

  // fetch customer name
  useEffect(() => {
    if (!currentUser?.user_id) return;
    fetch(`/api/customers/by-user/${currentUser.user_id}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setCustomerName(data.name || '');
        if (typeof data.cust_id !== 'undefined') setCustId(data.cust_id);
        // subscription removed
      })
      .catch(() => {});
  }, [currentUser?.user_id]);

  // fetch plans for this customer once custId is known
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        if (!custId) return;
        const rows = await listPlansAPI(custId);
        if (!ignore) setPlans(Array.isArray(rows) ? rows : []);
      } catch (_) {
        if (!ignore) setPlans([]);
      }
    })();
    return () => { ignore = true; };
  }, [custId]);

  // Load orders when switching to "ההזמנות שלי"
  useEffect(() => {
    let ignore = false;
    if (activeTab !== 'ההזמנות שלי') return () => {};
    (async () => {
      try {
        setOrdersLoading(true); setOrdersErr('');
        const rows = await listOrdersAPI();
        if (!ignore) setOrders(Array.isArray(rows) ? rows : []);
      } catch (e) {
        if (!ignore) setOrdersErr(e?.message || 'שגיאה בטעינת הזמנות');
      } finally {
        if (!ignore) setOrdersLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [activeTab]);

  const openOrderDetails = async (order_id, categoryFilter = null) => {
    try {
      setOrdersErr('');
      const data = await getOrderAPI(order_id);
      // If categoryFilter is provided, narrow items to that category
      if (data && Array.isArray(data.items) && categoryFilter) {
        data.items = data.items.filter(it => itemCategory(it) === categoryFilter);
      }
      setOrderDetails(data || null);
      setDeliveryCtx(categoryFilter ? { order_id, category: categoryFilter } : null);
      setOrderModalOpen(true);
    } catch (e) {
      setOrdersErr(e?.message || 'שגיאה בטעינת פרטי הזמנה');
    }
  };

  // Build deliveries array from orders by fetching items and grouping by category
  const [deliveries, setDeliveries] = useState([]); // [{ order_id, category, statusHe, eta, courier, count, subtotal }]
  useEffect(() => {
    let cancelled = false;
    if (activeTab !== 'ההזמנות שלי' || orders.length === 0) { setDeliveries([]); return; }
    (async () => {
      try {
        const results = await Promise.all(
          orders.map(async (o) => {
            try {
              const det = await getOrderAPI(o.order_id || o.id);
              const items = Array.isArray(det?.items) ? det.items : [];
              const groups = {};
              for (const it of items) {
                const key = itemCategory(it);
                if (!groups[key]) groups[key] = { count: 0, subtotal: 0, time: null };
                groups[key].count += itemQty(it);
                groups[key].subtotal += itemTotal(it);
                const t = itemDeliveryTime(it);
                if (!groups[key].time && t) groups[key].time = t;
              }
              return Object.entries(groups).map(([cat, g]) => ({
                order_id: det?.order?.order_id || det?.order?.id || o.order_id || o.id,
                category: cat,
                status: statusHe(det?.order?.status || o.status),
                eta: fmtDT(g.time),
                courier: det?.order?.courier_name || det?.order?.courier || o.courier_name || o.courier || null,
                count: g.count,
                subtotal: g.subtotal,
                delivered: det?.order?.delivered_at || det?.order?.completed_at || null,
              }));
            } catch { return []; }
          })
        );
        if (!cancelled) setDeliveries(results.flat());
      } catch (_) {
        if (!cancelled) setDeliveries([]);
      }
    })();
    return () => { cancelled = true; };
  }, [orders, activeTab]);

  const handleSaveName = async () => {
    if (!custId) {
      showToast('לא נמצא מזהה לקוח', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/customers/${custId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: customerName }),
      });
      if (!res.ok) {
        try { const j = await res.json(); throw new Error(j?.message || 'שמירה נכשלה'); } catch { throw new Error('שמירה נכשלה'); }
      }
      setIsEditingName(false);
      showToast('השם עודכן בהצלחה', 'success');
    } catch (e) {
      showToast(e?.message || 'שמירה נכשלה', 'error');
    }
  };


  const handleUpload = async () => {
    if (!currentUser?.user_id || !selectedFile) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('image', selectedFile);
      const res = await fetch(`/api/users/${currentUser.user_id}/profile-image`, {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'העלאת תמונה נכשלה');
      }
      if (data?.profile_image) setProfileImage(data.profile_image);
      showToast('התמונה עודכנה בהצלחה', 'success');
      setShowAvatarModal(false);
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    } catch (e) {
      console.error(e);
      showToast(e?.message || 'העלאת תמונה נכשלה', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.profileWrapper}>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 2000,
            padding: '8px 12px',
            borderRadius: 8,
            background: toast.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: toast.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${toast.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
        >
          {toast.text}
        </div>
      )}
      {/* Top bar with logo and back arrow, matching Header placement */}
      <div className={headerStyles.container} style={{ marginTop: 0 }}>
        <div className={headerStyles.row}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className={styles.iconCircleBtn}
              onClick={() => navigate(getHomePath())}
              aria-label="חזרה"
              title="חזרה"
            >
              <ArrowLeft size={18} />
            </button>
            <Link to={getHomePath()} className={headerStyles.logo}>
              <span className={headerStyles.brand}>Nutribite</span>
            </Link>
          </div>
          <div />
        </div>
      </div>
      <section className={`${styles.header} ${styles.headerRight}`}>
        <img
          className={styles.avatar}
          src={previewUrl || imgSrc}
          alt="Profile"
          onClick={() => setShowAvatarModal(true)}
        />
        <div className={styles.userMeta}>
          <div className={styles.topRow}>
            <div className={styles.username}>{username}</div>
            <button
              className={styles.iconCircleBtn}
              onClick={() => setShowSettingsModal(true)}
              aria-label="הגדרות"
              title="הגדרות"
            >
              <SettingsIcon size={18} />
            </button>
          </div>
          <div className={styles.name}>
            {isEditingName ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  style={{ padding: 6, border: '1px solid #e5e7eb', borderRadius: 6 }}
                />
                <button className={styles.iconCircleBtn} onClick={handleSaveName} aria-label="Save name"><Check size={16} /></button>
                <button className={styles.iconCircleBtn} onClick={() => setIsEditingName(false)} aria-label="Cancel edit"><X size={16} /></button>
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span>{customerName || username}</span>
                <button className={styles.iconCircleBtn} onClick={() => setIsEditingName(true)} aria-label="Edit name"><Pencil size={16} /></button>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Avatar Modal */}
      {showAvatarModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowAvatarModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <img
              src={previewUrl || imgSrc}
              alt="Preview"
              style={{ width: '100%', borderRadius: 12, objectFit: 'cover', aspectRatio: '1 / 1' }}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <label className={styles.fileLabel}>
                Choose photo
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                      setPreviewUrl(URL.createObjectURL(file));
                    }
                  }}
                />
              </label>
              <button disabled={!selectedFile || uploading} onClick={handleUpload}>
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
            <button className={styles.iconBtn} onClick={() => setShowAvatarModal(false)}>×</button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowSettingsModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.rtlText}>
              <h3 style={{ marginTop: 0 }}>הגדרות</h3>
            </div>
            <Settings />
            <div className={styles.modalActions}>
              <button className={styles.iconBtn} onClick={() => setShowSettingsModal(false)}>סגור</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs (Hebrew, RTL) */}
      <nav className={`${styles.tabs} ${styles.tabsRtl}`}>
        {['התוכנית שלי', 'ההזמנות שלי'].map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      <section className={styles.content}>
        {activeTab === 'התוכנית שלי' && (
          <div className={styles.rtlText}>
            <h3 style={{ marginTop: 0 }}>התוכניות שלי</h3>

            {/* Current active plan (latest by created desc from API) */}
            <div style={{ marginTop: 8, marginBottom: 6, fontWeight: 600 }}>תוכנית פעילה נוכחית</div>
            {plans && plans.length > 0 ? (
              <div
                role="button"
                onClick={() => navigate('/plan')}
                title="עבור לתוכנית"
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  padding: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>תוכנית נוכחית #{plans[0].plan_id}</div>
                  <div style={{ color: '#6b7280', fontSize: 13 }}>
                    יעד יומי: {plans[0].calories_per_day ?? '—'} קלוריות • דיאטה: {plans[0].diet_type_name || '—'}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/plan-maker'); }}
                  className={styles.primaryGradBtn}
                  title="צור חדשה"
                  aria-label="צור חדשה"
                >
                  צור חדשה
                </button>
              </div>
            ) : (
              <div
                style={{ border: '1px dashed #e5e7eb', borderRadius: 10, padding: 12, color: '#6b7280' }}
              >
                אין עדיין תוכנית פעילה. 
                <button
                  onClick={() => navigate('/plan-maker')}
                  className={styles.primaryGradBtn}
                  style={{ marginInlineStart: 8, padding: '8px 12px' }}
                >
                  צור חדשה
                </button>
              </div>
            )}

            {/* Previous plans */}
            <div style={{ marginTop: 16, marginBottom: 6, fontWeight: 600 }}>תוכניות קודמות</div>
            {plans && plans.length > 1 ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {plans.slice(1).map((p) => (
                  <div
                    key={p.plan_id}
                    style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, background: '#fff' }}
                  >
                    <div style={{ fontWeight: 600 }}>תוכנית #{p.plan_id}</div>
                    <div style={{ color: '#6b7280', fontSize: 13 }}>
                      יעד יומי: {p.calories_per_day ?? '—'} קלוריות • דיאטה: {p.diet_type_name || '—'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#6b7280' }}>אין תוכניות קודמות להצגה.</div>
            )}
          </div>
        )}

        {activeTab === 'ההזמנות שלי' && (
          <div className={styles.rtlText}>
            <h3 style={{ marginTop: 0 }}>ההזמנות שלי</h3>
            {ordersLoading && <div>טוען הזמנות…</div>}
            {ordersErr && <div style={{ color:'#b91c1c' }}>{ordersErr}</div>}
            {!ordersLoading && !ordersErr && (
              <>
                {/* Deliveries list (current and past mixed) */}
                <div style={{ marginTop: 8, marginBottom: 6, fontWeight: 600 }}>המשלוחים שלי</div>
                {deliveries.length > 0 ? (
                  <div style={{ display:'grid', gap:8 }}>
                    {deliveries.map(d => (
                      <div key={`${d.order_id}_${d.category}`}
                           style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:12, background:'#fff', cursor:'pointer' }}
                           onClick={()=> openOrderDetails(d.order_id, d.category)}
                      >
                        <div style={{ display:'flex', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
                          <div><strong>#{d.order_id}</strong> • {d.category}</div>
                          <div style={{ color:'#6b7280', fontSize:13 }}>מצב: {d.status}</div>
                          {d.eta && <div style={{ color:'#6b7280', fontSize:13 }}>זמן: {d.eta}</div>}
                          {d.courier && <div style={{ color:'#6b7280', fontSize:13 }}>שליח: {d.courier}</div>}
                          <div style={{ color:'#111827', fontWeight:600 }}>{(Number(d.subtotal)||0).toFixed(2)} ₪</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color:'#6b7280' }}>אין משלוחים להצגה.</div>
                )}
              </>
            )}
          </div>
        )}
      </section>

      {/* Order details modal */}
      {orderModalOpen && orderDetails && (
        <div className={styles.modalBackdrop} onClick={()=> setOrderModalOpen(false)}>
          <div className={styles.modal} onClick={(e)=> e.stopPropagation()}>
            <div className={styles.rtlText}>
              <h3 style={{ marginTop: 0 }}>הזמנה #{orderDetails?.order?.order_id || '—'}</h3>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom: 10 }}>
                <div>מצב: {statusHe(orderDetails?.order?.status)}</div>
                { (orderDetails?.order?.delivered_at || orderDetails?.order?.completed_at) && (
                  <div>נמסרה: {orderDetails?.order?.delivered_at || orderDetails?.order?.completed_at}</div>
                )}
                { (orderDetails?.order?.expected_delivery_at || orderDetails?.order?.delivery_eta) && (
                  <div>משוער: {orderDetails?.order?.expected_delivery_at || orderDetails?.order?.delivery_eta}</div>
                )}
                { (orderDetails?.order?.courier_name || orderDetails?.order?.courier) && (
                  <div>שליח: {orderDetails?.order?.courier_name || orderDetails?.order?.courier}</div>
                )}
              </div>
              {/* Deliveries grouped by category */}
              {Array.isArray(orderDetails?.items) && orderDetails.items.length > 0 && (()=>{
                const groups = {};
                for (const it of orderDetails.items) {
                  const key = itemCategory(it);
                  if (!groups[key]) groups[key] = { count: 0, total: 0, time: null };
                  groups[key].count += itemQty(it);
                  groups[key].total += itemTotal(it);
                  const t = itemDeliveryTime(it);
                  if (!groups[key].time && t) groups[key].time = t;
                }
                const rows = Object.entries(groups).map(([cat, g]) => ({ cat, count: g.count, total: g.total, time: fmtDT(g.time) }));
                if (rows.length === 0) return null;
                return (
                  <div style={{ marginTop: 6, marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>משלוחים</div>
                    <div style={{ border:'1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', background:'#f3f4f6', padding:'8px 10px', fontWeight:600 }}>
                        <div>קטגוריה</div>
                        <div>זמן משלוח</div>
                        <div>מס׳ פריטים</div>
                        <div>סה"כ</div>
                      </div>
                      {rows.map((r, i) => (
                        <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', padding:'8px 10px', borderTop:'1px solid #e5e7eb', background: (i%2? '#f8fafc':'#fff') }}>
                          <div>{r.cat}</div>
                          <div>{r.time || '—'}</div>
                          <div>{r.count}</div>
                          <div>{(Number(r.total)||0).toFixed(2)} ₪</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div style={{ fontWeight:600, marginTop:6, marginBottom:6 }}>מוצרים</div>
              <ul style={{ listStyle:'none', padding:0, margin:0, display:'grid', gap:10 }}>
                {(orderDetails?.items || []).map((it) => (
                  <li key={it.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', border:'1px solid #e5e7eb', borderRadius:10, padding:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <img src={ensureImageUrl(it.picture)} alt={it.recipe_name}
                           style={{ width:48, height:48, borderRadius:8, objectFit:'cover' }}
                           onError={(e)=>{ e.currentTarget.style.display='none'; }}
                      />
                      <div>
                        <div style={{ fontWeight:600 }}>{it.recipe_name}</div>
                        <div style={{ color:'#6b7280', fontSize:13 }}>כמות: {itemQty(it)} • מחיר יחידה: {(itemUnitPrice(it)).toFixed(2)} ₪</div>
                      </div>
                    </div>
                    <div style={{ fontWeight:600 }}>{(itemTotal(it)).toFixed(2)} ₪</div>
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 10, textAlign:'left' }}>
                <button className={styles.iconCircleBtn} onClick={()=> setOrderModalOpen(false)}>סגור</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

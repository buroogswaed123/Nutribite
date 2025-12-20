import React, { useEffect, useMemo, useState } from 'react';
import Loading from '../../../../common/Loading';
import styles from './users.module.css'
import { useAuth } from '../../../../../hooks/useAuth';
import { ArrowUpDown, X } from 'lucide-react';
import { getSessionUser, adminRestoreUserAPI } from '../../../../../utils/functions';

export default function UsersList() {
    const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
     const { fetchAllUsers, updateUserRole, updateUserBanStatus, deleteUser, updateUserBanDetails, createNotification, adminBanUser, adminUnbanUser } = useAuth();
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState('online'); // 'online' | 'type'
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [savingRole, setSavingRole] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [pendingRole, setPendingRole] = useState(null);
  const [pendingBan, setPendingBan] = useState(null); // true to ban, false to unban, null none
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isBanFormOpen, setIsBanFormOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [savingBan, setSavingBan] = useState(false);
  const [banDescription, setBanDescription] = useState('');
  const [adminId, setAdminId] = useState(null);
  // Table/pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  // Orders modal
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersErr, setOrdersErr] = useState('');
  const [ordersUser, setOrdersUser] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [orderItems, setOrderItems] = useState({}); // { [orderId]: items[] }
  const [orderItemsLoading, setOrderItemsLoading] = useState({}); // { [orderId]: bool }
  const [orderItemsError, setOrderItemsError] = useState({}); // { [orderId]: string }

  const fmtDT = (v) => {
    try { return v ? new Date(v).toLocaleString('he-IL') : '—'; } catch { return v || '—'; }
  };
  const StatusBadge = ({ value }) => {
    const v = String(value || '—');
    const palette = {
      draft: '#e5e7eb', confirmed: '#dbeafe', preparing: '#fef3c7', 'on route': '#e0f2fe', complete: '#dcfce7', cancelled: '#fee2e2', '—': '#e5e7eb'
    };
    const bg = palette[v] || '#e5e7eb';
    return (<span style={{ padding:'2px 8px', borderRadius: 8, background: bg }}>{v}</span>);
  };

  // Derive status flags for the currently selected user (for modal button logic)
  const selectedStatus = selectedUser
    ? String(selectedUser.status ?? (selectedUser.is_banned ? 'banned' : 'active')).toLowerCase()
    : null;
  const isSelectedDeleted = selectedStatus === 'deleted';
  const isSelectedBanned = selectedStatus === 'banned';

  const addToast = (type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter(t => t.id !== id));
    }, 3000);
  };
    useEffect(() => {
        let mounted = true;
        (async () => {
          try {
            const usersData = await fetchAllUsers();
            if (!mounted) return;
            const list = Array.isArray(usersData) ? usersData : (usersData?.items || []);
            setRecentUsers(list);
          } catch (err) {
            console.error('AdminHome data load error:', err);
            const status = err?.response?.status;
            if (status === 401 || status === 403) {
              setError('דרוש התחברות כמנהל על מנת לצפות ברשימת המשתמשים.');
            } else {
              setError('שגיאה בטעינת הנתונים.');
            }
          } finally {
            if (mounted) setLoading(false);
          }
        })();
        // load current admin id
        (async () => {
          try {
            const session = await getSessionUser();
            if (mounted) setAdminId(session?.user_id || session?.id || null);
          } catch (_) {}
        })();
        // Poll users every 30s for online status updates
        const interval = setInterval(async () => {
          try {
            const usersData = await fetchAllUsers();
            const list = Array.isArray(usersData) ? usersData : (usersData?.items || []);
            if (mounted) setRecentUsers(list);
          } catch (e) {
            const status = e?.response?.status;
            if (status === 401 || status === 403) {
              // stop updating if unauthorized
              setError('דרוש התחברות כמנהל על מנת לצפות ברשימת המשתמשים.');
              clearInterval(interval);
            }
          }
        }, 30000);
        return () => { mounted = false; clearInterval(interval); };
      }, [fetchAllUsers]);

  const filteredAndSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Exclude the currently logged-in admin (me)
    let list = recentUsers.filter(u => {
      if (adminId && Number(u.user_id) === Number(adminId)) return false;
      if (!q) return true;
      return (
        String(u.username || '').toLowerCase().includes(q) ||
        String(u.email || '').toLowerCase().includes(q)
      );
    });

    if (sortMode === 'type') {
      // Order user types: admin, courier, customer (can be adjusted)
      const order = { admin: 0, courier: 1, customer: 2 };
      list.sort((a, b) => (order[a.user_type] ?? 99) - (order[b.user_type] ?? 99));
    } else {
      // Default: online on top, then by created_at desc
      list.sort((a, b) => {
        if (a.is_online === b.is_online) {
          const ad = new Date(a.created_at).getTime() || 0;
          const bd = new Date(b.created_at).getTime() || 0;
          return bd - ad;
        }
        return a.is_online ? -1 : 1;
      });
    }
    return list;
  }, [recentUsers, query, adminId, sortMode]);

  const total = filteredAndSorted.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentRows = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredAndSorted.slice(start, start + perPage);
  }, [filteredAndSorted, page, perPage]);

  useEffect(() => { setPage(1); }, [query, sortMode, perPage]);

    return (
      <div className={styles.usersSection}>
        <h2 className={styles.sectionTitle}>משתמשים</h2>
        {error && (
          <div className={styles.errorBanner}>{error}</div>
        )}
        {loading && <Loading text="טוען נתונים..." />}

        {/* Controls */}
        <div className={styles.controls}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="חיפוש לפי שם או אימייל"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className={styles.sortBtn}
            onClick={() => setSortMode((m) => (m === 'online' ? 'type' : 'online'))}
            title={sortMode === 'online' ? 'מיין לפי סוג משתמש' : 'מיין לפי סטטוס התחברות'}
            aria-label={sortMode === 'online' ? 'מיין לפי סוג משתמש' : 'מיין לפי סטטוס התחברות'}
          >
            <ArrowUpDown size={16} />
          </button>
          <span className={styles.sortBadge}>
            {sortMode === 'online' ? 'מחוברים' : 'סוג'}
          </span>
        </div>

        {/* Table view */}
        {filteredAndSorted.length === 0 ? (
          <p className={styles.noData}>אין משתמשים להצגה</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>שם משתמש</th>
                  <th>אימייל</th>
                  <th>תפקיד</th>
                  <th>סטטוס</th>
                  <th>נוצר</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.map((u) => (
                  <tr key={u.user_id}>
                    <td>{u.user_id}</td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>{u.user_type}</td>
                    <td>{u.is_online ? 'מחובר' : (u.status || '—')}</td>
                    <td>{u.created_at ? new Date(u.created_at).toLocaleDateString('he-IL') : '—'}</td>
                    <td style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      <button className={styles.manageBtn}
                        onClick={() => { setSelectedUser(u); setIsModalOpen(true); }}
                      >ניהול</button>
                      <button className={styles.manageBtn}
                        onClick={async () => {
                          try {
                            setOrdersUser(u); setOrdersOpen(true); setOrdersLoading(true); setOrdersErr(''); setUserOrders([]);
                            const res = await fetch(`/api/admin/users/${u.user_id}/orders`, { credentials: 'include' });
                            if (!res.ok) throw new Error('שגיאה בטעינת הזמנות');
                            const data = await res.json();
                            setUserOrders(Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
                          } catch (e) {
                            setOrdersErr(e?.message || 'שגיאה בטעינת הזמנות');
                          } finally {
                            setOrdersLoading(false);
                          }
                        }}
                      >הצג הזמנות</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination */}
            <div className={styles.pagination}>
              <button className={styles.manageBtn} disabled={page <= 1} onClick={()=> setPage(p=>Math.max(1, p-1))}>{'<'}</button>
              <span style={{ color:'#6b7280' }}>עמוד {page} מתוך {totalPages}</span>
              <button className={styles.manageBtn} disabled={page >= totalPages} onClick={()=> setPage(p=>Math.min(totalPages, p+1))}>{'>'}</button>
              <select className={styles.select} value={perPage} onChange={(e)=> setPerPage(Number(e.target.value) || 20)}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        )}

        {/* Manage Modal */}
        {isModalOpen && selectedUser && (
          <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>ניהול משתמש</h3>
                <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)} aria-label="סגור">
                  <X size={18} />
                </button>
              </div>

              <div className={styles.modalBody}>
                {/* User info rows */}
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>שם משתמש:</span>
                  <span className={styles.infoValue}>{selectedUser.username}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>אימייל:</span>
                  <span className={styles.infoValue}>{selectedUser.email}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>תאריך הצטרפות:</span>
                  <span className={styles.infoValue}>{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('he-IL') : '—'}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>סטטוס חיבור:</span>
                  <span className={`${styles.statusLabel} ${selectedUser.is_online ? styles.active : styles.inactive}`}>
                    {selectedUser.is_online ? 'מחובר' : 'לא מחובר'}
                  </span>
                </div>

                {/* Role change (hidden if deleted) */}
                {!isSelectedDeleted && (
                  <div className={styles.fieldGroup}>
                    <label className={styles.infoLabel} htmlFor="roleSelect">תפקיד:</label>
                    <select
                      id="roleSelect"
                      className={styles.select}
                      value={pendingRole ?? selectedUser.user_type}
                      disabled={savingRole}
                      onChange={(e) => {
                        const newRole = e.target.value;
                        if (newRole === selectedUser.user_type) {
                          setPendingRole(null);
                          return;
                        }
                        setPendingRole(newRole);
                      }}
                    >
                      <option value="admin">מנהל</option>
                      <option value="customer">לקוח</option>
                      <option value="courier">שליח</option>
                    </select>
                  </div>
                )}

                {pendingRole && !isSelectedDeleted && (
                  <div className={styles.confirmBar}>
                    <span className={styles.confirmText}>לאשר שינוי תפקיד ל- {pendingRole}?</span>
                    <div className={styles.confirmActions}>
                      <button
                        className={styles.confirmBtn}
                        disabled={savingRole}
                        onClick={async () => {
                          try {
                            setSavingRole(true);
                            await updateUserRole(selectedUser.user_id, pendingRole);
                            setSelectedUser((prev) => ({ ...prev, user_type: pendingRole }));
                            setRecentUsers((list) => list.map(u => u.user_id === selectedUser.user_id ? { ...u, user_type: pendingRole } : u));
                            addToast('success', 'התפקיד עודכן בהצלחה');
                            setPendingRole(null);
                          } catch (err) {
                            console.error('Failed to update role', err);
                            addToast('error', 'עדכון התפקיד נכשל');
                          } finally {
                            setSavingRole(false);
                          }
                        }}
                      >
                        אשר
                      </button>
                      <button
                        className={styles.cancelBtn}
                        disabled={savingRole}
                        onClick={() => setPendingRole(null)}
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                )}

                {/* Action buttons row */}
                <div className={styles.buttonsRow}>
                  {/* Ban/Unban only if not deleted */}
                  {!isSelectedDeleted && (
                    <button
                      className={styles.primaryBtn}
                      onClick={() => {
                        // if currently banned, pendingBan=false triggers unban flow below
                        setPendingBan(!isSelectedBanned);
                      }}
                    >
                      {isSelectedBanned ? 'בטל חסימה' : 'חסום משתמש'}
                    </button>
                  )}
                  {/* Delete vs Restore */}
                  {isSelectedDeleted ? (
                    <button
                      className={styles.primaryBtn}
                      onClick={async () => {
                        try {
                          await adminRestoreUserAPI(selectedUser.user_id);
                          setSelectedUser(prev => ({ ...prev, status: 'active' }));
                          setRecentUsers(list => list.map(u => u.user_id === selectedUser.user_id ? { ...u, status: 'active' } : u));
                          addToast('success', 'המשתמש שוחזר');
                        } catch (e) {
                          addToast('error', 'שחזור המשתמש נכשל');
                        }
                      }}
                    >בטל מחיקה</button>
                  ) : (
                    <button
                      className={styles.dangerBtn}
                      onClick={() => setConfirmingDelete(true)}
                    >
                      מחק משתמש
                    </button>
                  )}
                </div>

                {pendingBan !== null && !isSelectedDeleted && (
                  <div className={styles.confirmBar}>
                    <span className={styles.confirmText}>
                      {pendingBan ? 'לחסום משתמש זה?' : 'לבטל חסימה למשתמש זה?'}
                    </span>
                    <div className={styles.confirmActions}>
                      <button
                        className={styles.confirmBtn}
                        onClick={async () => {
                          if (pendingBan === true) {
                            // Open ban scheduling form instead of immediate ban
                            setIsBanFormOpen(true);
                            return;
                          }
                          // Unban flow immediate
                          try {
                            await adminUnbanUser(selectedUser.user_id);
                            setSelectedUser((prev) => ({ ...prev, is_banned: false }));
                            setRecentUsers((list) => list.map(u => u.user_id === selectedUser.user_id ? { ...u, status: 'active' } : u));
                            addToast('success', 'החסימה בוטלה');
                          } catch (e) {
                            console.error('Unban failed', e);
                            addToast('error', 'פעולת החסימה נכשלה');
                          } finally {
                            setPendingBan(null);
                          }
                        }}
                      >
                        אשר
                      </button>
                      <button
                        className={styles.cancelBtn}
                        onClick={() => setPendingBan(null)}
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                )}

                {confirmingDelete && (
                  <div className={styles.confirmBar}>
                    <span className={styles.confirmText}>למחוק משתמש זה? פעולה זו אינה הפיכה</span>
                    <div className={styles.confirmActions}>
                      <button
                        className={styles.confirmBtn}
                        onClick={async () => {
                          try {
                            await deleteUser(selectedUser.user_id);
                            setRecentUsers((list) => list.filter(u => u.user_id !== selectedUser.user_id));
                            setIsModalOpen(false);
                            addToast('success', 'המשתמש נמחק');
                          } catch (e) {
                            console.error('Delete failed', e);
                            addToast('error', 'מחיקת המשתמש נכשלה');
                          } finally {
                            setConfirmingDelete(false);
                          }
                        }}
                      >
                        אשר
                      </button>
                      <button
                        className={styles.cancelBtn}
                        onClick={() => setConfirmingDelete(false)}
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                )}

              </div>
              <div className={styles.modalFooter}>
                <button className={styles.closeFooterBtn} onClick={() => setIsModalOpen(false)}>סגור</button>
              </div>
            </div>
          </div>
        )}

        {/* Toasts */}
        <div className={styles.toastContainer}>
          {toasts.map(t => (
            <div key={t.id} className={`${styles.toast} ${t.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
              {t.message}
            </div>
          ))}
        </div>

        {/* Orders Modal */}
        {ordersOpen && (
          <div className={styles.modalOverlay} onClick={()=> setOrdersOpen(false)}>
            <div className={styles.modal} onClick={(e)=> e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>הזמנות המשתמש {ordersUser?.username} (ID: {ordersUser?.user_id})</h3>
                <button className={styles.closeBtn} onClick={()=> setOrdersOpen(false)} aria-label="סגור"><X size={18} /></button>
              </div>
              <div className={styles.modalBody}>
                {ordersLoading && <Loading text="טוען הזמנות..." />}
                {ordersErr && <div className={styles.errorBanner}>{ordersErr}</div>}
                {!ordersLoading && !ordersErr && (
                  userOrders.length === 0 ? (
                    <div className={styles.noData}>אין הזמנות</div>
                  ) : (
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>סטטוס</th>
                            <th>סה"כ</th>
                            <th>נוצר</th>
                            <th>משלוח</th>
                            <th>פעולות</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userOrders.map(o => (
                            <React.Fragment key={o.order_id}>
                              <tr
                                onClick={async () => {
                                  const isOpen = expandedOrderId === o.order_id;
                                  if (isOpen) {
                                    setExpandedOrderId(null);
                                    return;
                                  }
                                  setExpandedOrderId(o.order_id);
                                  if (!orderItems[o.order_id]) {
                                    setOrderItemsLoading(s => ({ ...s, [o.order_id]: true }));
                                    setOrderItemsError(s => ({ ...s, [o.order_id]: '' }));
                                    try {
                                      const res = await fetch(`/api/admin/orders/${o.order_id}/items`, { credentials: 'include' });
                                      if (!res.ok) throw new Error('שגיאה בטעינת פריטי הזמנה');
                                      const data = await res.json();
                                      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
                                      setOrderItems(prev => ({ ...prev, [o.order_id]: items }));
                                    } catch (e) {
                                      setOrderItemsError(s => ({ ...s, [o.order_id]: e?.message || 'שגיאה בטעינת פריטי הזמנה' }));
                                    } finally {
                                      setOrderItemsLoading(s => ({ ...s, [o.order_id]: false }));
                                    }
                                  }
                                }}
                                style={{ cursor: 'pointer' }}
                              >
                                <td>{o.order_id}</td>
                                <td><StatusBadge value={o.status || o.order_status} /></td>
                                <td>{Number(o.total_price || 0).toFixed(2)} ₪</td>
                                <td>{fmtDT(o.order_date || o.created_at)}</td>
                                <td>{fmtDT(o.set_delivery_time || o.delivery_datetime)}</td>
                                <td style={{ display:'flex', gap:8, flexWrap:'wrap' }} onClick={(e)=> e.stopPropagation()}>
                                  {/* Change status inline */}
                                  <select
                                    className={styles.select}
                                    value={String(o.status || o.order_status || 'draft')}
                                    onChange={async (e) => {
                                      const newStatus = e.target.value;
                                      try {
                                        const res = await fetch(`/api/admin/orders/${o.order_id}/status`, {
                                          method: 'PATCH',
                                          headers: { 'Content-Type': 'application/json' },
                                          credentials: 'include',
                                          body: JSON.stringify({ status: newStatus })
                                        });
                                        if (!res.ok) throw new Error('עדכון סטטוס נכשל');
                                        setUserOrders((rows) => rows.map(r => r.order_id === o.order_id ? { ...r, status: newStatus } : r));
                                      } catch (e) {
                                        addToast('error', e.message || 'עדכון סטטוס נכשל');
                                      }
                                    }}
                                  >
                                    <option value="draft">draft</option>
                                    <option value="confirmed">confirmed</option>
                                    <option value="preparing">preparing</option>
                                    <option value="on route">on route</option>
                                    <option value="complete">complete</option>
                                    <option value="cancelled">cancelled</option>
                                  </select>
                                  {/* Download receipt (opens customer view) */}
                                  <button className={styles.manageBtn}
                                    onClick={() => window.open(`/orders/${o.order_id}?action=download-receipt`, '_blank')}
                                  >קבלה</button>
                                </td>
                              </tr>
                              {expandedOrderId === o.order_id && (
                                <tr>
                                  <td colSpan={6}>
                                    {orderItemsLoading[o.order_id] && <Loading text="טוען פריטים..." />}
                                    {orderItemsError[o.order_id] && <div className={styles.errorBanner}>{orderItemsError[o.order_id]}</div>}
                                    {!orderItemsLoading[o.order_id] && !orderItemsError[o.order_id] && (
                                      (orderItems[o.order_id]?.length || 0) === 0 ? (
                                        <div className={styles.noData}>אין פריטים להזמנה זו</div>
                                      ) : (
                                        <div className={styles.tableWrap}>
                                          <table className={styles.table}>
                                            <thead>
                                              <tr>
                                                <th>פריט</th>
                                                <th>כמות</th>
                                                <th>מחיר יחידה</th>
                                                <th>סה"כ שורה</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {orderItems[o.order_id].map((it, idx) => (
                                                <tr key={it.id || idx}>
                                                  <td>
                                                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                                      {it.picture && (
                                                        <img src={it.picture} alt={it.recipe_name || 'item'} width={40} height={28} style={{ objectFit:'cover', borderRadius:6 }} />
                                                      )}
                                                      <span>{it.recipe_name || `פריט ${idx+1}`}</span>
                                                    </div>
                                                  </td>
                                                  <td>{it.quantity}</td>
                                                  <td>{Number(it.unit_price || 0).toFixed(2)} ₪</td>
                                                  <td>{Number(it.line_total || (it.unit_price*it.quantity) || 0).toFixed(2)} ₪</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )
                                    )}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.closeFooterBtn} onClick={()=> setOrdersOpen(false)}>סגור</button>
              </div>
            </div>
          </div>
        )}

        {/* Ban scheduling modal */}
        {isBanFormOpen && selectedUser && (
          <div className={styles.modalOverlay} onClick={() => !savingBan && setIsBanFormOpen(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>קביעת חסימה</h3>
                <button className={styles.closeBtn} onClick={() => !savingBan && setIsBanFormOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className={styles.modalBody}>
                <p className={styles.infoRow}>המשתמש: <strong>{selectedUser.username}</strong> (ID: {selectedUser.user_id})</p>
                <p className={styles.infoRow}>החסימה תיכנס לתוקף מחר באופן אוטומטי.</p>
                <label className={styles.infoLabel} htmlFor="banReason">סיבת חסימה (תשמר בשדה המשתמש)</label>
                <textarea id="banReason" className={styles.textarea} rows={3}
                  placeholder="סיבת החסימה"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)} />
                <label className={styles.infoLabel} htmlFor="banDesc" style={{ marginTop: 8 }}>תיאור מפורט (להתראה)</label>
                <textarea id="banDesc" className={styles.textarea} rows={4}
                  placeholder="תיאור מפורט שיופיע בהתראה"
                  value={banDescription}
                  onChange={(e) => setBanDescription(e.target.value)} />
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.closeFooterBtn} disabled={savingBan} onClick={() => setIsBanFormOpen(false)}>ביטול</button>
                <button className={styles.primaryBtn} disabled={savingBan}
                  onClick={async () => {
                    try {
                      setSavingBan(true);
                      const next = new Date();
                      next.setDate(next.getDate() + 1);
                      const title = `החשבון שלך יחסם בתאריך ${next.toLocaleDateString('he-IL')}`;
                      // 1) Schedule ban on server (server stores ban_reason, banned_by, ban_effective_at)
                      await adminBanUser(selectedUser.user_id, { reason: banReason || '' });
                      // 2) Create notification for the user (related_id is the banned user's id)
                      await createNotification({
                        user_id: selectedUser.user_id,
                        type: 'ban',
                        related_id: selectedUser.user_id,
                        title,
                        description: banDescription || ''
                      });
                      addToast('success', 'החסימה נקבעה וההתראה נשלחה');
                      setIsBanFormOpen(false);
                      setPendingBan(null);
                      setBanReason('');
                      setBanDescription('');
                    } catch (e) {
                      console.error('Failed to schedule ban/notify', e);
                      addToast('error', 'קביעת החסימה נכשלה');
                    } finally {
                      setSavingBan(false);
                    }
                  }}
                >
                  אשר חסימה
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
}
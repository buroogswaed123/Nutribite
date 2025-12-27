import React, { useState, useEffect, useContext } from 'react';
import { Clock, MapPin, Phone, Package, CheckCircle } from 'lucide-react';
import { AuthContext } from '../../../app/App';
import ErrorModal from './ErrorModal';
import styles from './courierDashboard.module.css';

function OrderCard({ order, onOrderClick, onMarkDelivered }) {
  const formatILS = (n) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(n);
  const [isDelivering, setIsDelivering] = useState(false);
  
  const getBadgeClass = (status) => {
    switch (status) {
      case 'assigned': return `${styles.badge} ${styles.badgeYellow}`;
      case 'picked_up': return `${styles.badge} ${styles.badgeBlue}`;
      case 'out_for_delivery': return `${styles.badge} ${styles.badgePurple}`;
      case 'delivered': return `${styles.badge} ${styles.badgeGreen}`;
      default: return styles.badge;
    }
  };
  
  const handleMarkDelivered = async (e) => {
    e.stopPropagation();
    if (isDelivering) return;
    setIsDelivering(true);
    try {
      await onMarkDelivered(order);
    } finally {
      setIsDelivering(false);
    }
  };

  const getStatusText = (status) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'assigned': return 'מוכן לאיסוף';
      case 'on route': return 'בדרך';
      case 'picked_up': return 'נאסף';
      case 'out_for_delivery': return 'בדרך למסירה';
      case 'delivered': return 'נמסר';
      default: return status;
    }
  };

  return (
    <div className={styles.orderCard} onClick={() => onOrderClick && onOrderClick(order)}>
      <div className={styles.row}>
        <div className={styles.orderId}>
          <Package size={20} color="#059669" className={styles.mr8} />
          <span>#{order.id}</span>
        </div>
        <span className={getBadgeClass(order.status)}>{getStatusText(order.status)}</span>
      </div>

      <div className={styles.gridGap8}>
        <div className={styles.item}>
          <MapPin size={16} color="#16a34a" className={styles.itemIcon} />
          <span className={styles.fw600}>איסוף:</span>
          <span className={styles.ml4}>{order.pickupLocation?.name}</span>
        </div>
        <div className={styles.item}>
          <MapPin size={16} color="#ef4444" className={styles.itemIcon} />
          <span className={styles.fw600}>מסירה:</span>
          <span className={styles.ml4}>{String(order.dropoffLocation?.address || '').split(',')[0]}</span>
        </div>
        <div className={styles.item}>
          <Clock size={16} color="#f59e0b" className={styles.itemIcon} />
          <span className={styles.fw600}>זמן משלוח:</span>
          <span className={styles.ml4}>{order.estimatedDeliveryTime ? new Date(order.estimatedDeliveryTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
        </div>
      </div>

      <div className={styles.divider}>
        <span className={styles.customerName}>{order.customerName}</span>
        <div className={styles.link}>
          <Phone size={16} />
          <span>התקשר</span>
        </div>
      </div>
      
      <button 
        onClick={handleMarkDelivered}
        disabled={isDelivering}
        style={{
          width: '100%',
          marginTop: '12px',
          padding: '10px',
          background: isDelivering ? '#9ca3af' : '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: isDelivering ? 'not-allowed' : 'pointer',
          fontWeight: '600',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        <CheckCircle size={18} />
        {isDelivering ? 'מעדכן...' : 'סמן כנמסר'}
      </button>
    </div>
  );
}

export default function CourierDashboard({ onOrderClick = () => {} }) {
  const { currentUser } = useContext(AuthContext) || {};
  const [courierId, setCourierId] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [todayDeliveries, setTodayDeliveries] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  // Static shift time display per user request
  const shiftTimeDisplay = '06:26:43';

  // Fetch courier ID
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const uid = currentUser?.user_id || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('currentUser') || '{}')?.user_id : null);
        if (!uid) return;
        const res = await fetch(`/api/courier/by-user/${uid}`, { credentials: 'include' });
        if (!res.ok) return;
        const rows = await res.json();
        const row = Array.isArray(rows) ? rows[0] : rows;
        if (!row || cancelled) return;
        setCourierId(row.courier_id);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [currentUser]);

  // Fetch today's deliveries for this courier
  const fetchDeliveries = async () => {
    if (!courierId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/courier/couriers/${courierId}/deliveries`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch deliveries');
      const deliveries = await res.json();

      // Filter for today's deliveries
      const today = new Date().toISOString().split('T')[0];
      const todayDeliveries = Array.isArray(deliveries) ? deliveries.filter(d => {
        const deliveryDate = d.delivery_time ? new Date(d.delivery_time).toISOString().split('T')[0] : null;
        return deliveryDate === today;
      }) : [];

      // Separate active and completed
      const active = todayDeliveries.filter(d => {
        const status = String(d.delivery_status || '').toLowerCase();
        return status === 'assigned' || status === 'on route' || status === 'picked_up' || status === 'out_for_delivery';
      });
      const completed = todayDeliveries.filter(d => {
        const status = String(d.delivery_status || '').toLowerCase();
        return status === 'delivered';
      });

      setActiveOrders(active);
      setCompletedOrders(completed);
      setTodayDeliveries(completed.length);
    } catch (err) {
      console.error('Error fetching deliveries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, [courierId]);

  // Mark delivery as delivered
  const handleMarkDelivered = async (order) => {
    try {
      const res = await fetch(`/api/courier/deliveries/${order.delivery_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          status: 'delivered',
          courier_id: courierId 
        })
      });
      
      if (!res.ok) throw new Error('Failed to update delivery status');
      
      // Refresh the deliveries list
      await fetchDeliveries();
    } catch (err) {
      console.error('Error marking delivery as delivered:', err);
      setErrorMessage('שגיאה בעדכון סטטוס המשלוח. אנא נסה שוב.');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardIcon}><Package size={24} color="#059669" /></div>
          <div className={styles.cardText}>
            <div className={styles.cardTitle}>משלוחים פעילים</div>
            <div className={styles.cardValue}>{loading ? '...' : activeOrders.length}</div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={`${styles.cardIcon} ${styles.cardIconLight}`}><Clock size={24} color="#059669" /></div>
          <div className={styles.cardText}>
            <div className={styles.cardTitle}>שעות משמרת</div>
            <p className={`${styles.cardValue} ${styles.noMargin}`}>{shiftTimeDisplay}</p>
          </div>
        </div>

        <div className={styles.card}>
          <div className={`${styles.cardIcon} ${styles.cardIconGreen}`}><CheckCircle size={24} color="#059669" /></div>
          <div className={styles.cardText}>
            <div className={styles.cardTitle}>מסירות היום</div>
            <div className={styles.cardValue}>{todayDeliveries}</div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>משלוחים פעילים</div>
        <div className={styles.sectionBody}>
          {loading ? (
            <div className={styles.center}>טוען...</div>
          ) : activeOrders.length > 0 ? (
            <div className={styles.grid2}>
              {activeOrders.map(order => (
                <OrderCard 
                  key={order.delivery_id} 
                  order={{
                    delivery_id: order.delivery_id,
                    id: order.order_number,
                    status: order.delivery_status,
                    pickupLocation: { name: 'Nutribite Kitchen' },
                    dropoffLocation: { address: `${order.street || ''}, ${order.city || ''}`.trim() || 'לא צוין' },
                    estimatedDeliveryTime: order.delivery_time,
                    customerName: order.customer_name || 'לקוח'
                  }} 
                  onOrderClick={onOrderClick}
                  onMarkDelivered={handleMarkDelivered}
                />
              ))}
            </div>
          ) : (
            <div className={styles.center}>
              <Package size={48} className={styles.bigIconEmpty} />
              <div>אין משלוחים פעילים</div>
              <div className={styles.emptySubtext}>הזמנות חדשות יופיעו כאן</div>
            </div>
          )}
        </div>
      </div>


      <div className={styles.section}>
        <div className={styles.sectionHeader}>הושלמו לאחרונה</div>
        <div className={styles.sectionBody}>
          {loading ? (
            <div className={styles.center}>טוען...</div>
          ) : completedOrders.length > 0 ? (
            <div className={styles.gridGap12}>
              {completedOrders.slice(0, 3).map(order => (
                <div key={order.delivery_id} className={styles.completedRow}>
                  <div className={styles.flexCenter}>
                    <CheckCircle size={20} color="#16a34a" className={styles.mr12} />
                    <div>
                      <div className={styles.strongDark}>{order.order_number}</div>
                      <div className={styles.time}>{order.customer_name || 'לקוח'}</div>
                    </div>
                  </div>
                  <div className={styles.right}>
                    <div className={styles.time}>
                      {order.delivery_time ? new Date(order.delivery_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.center}>אין מסירות שהושלמו היום</div>
          )}
        </div>
      </div>
      
      <ErrorModal 
        message={errorMessage} 
        onClose={() => setErrorMessage(null)} 
      />
    </div>
  );
}

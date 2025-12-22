import React from 'react';
import { Clock, MapPin, Phone, Package, CheckCircle } from 'lucide-react';
import { mockActiveOrders, mockUpcomingOrders, mockCompletedOrders, mockEarnings } from './data/courierMockData.js';
import styles from './courierDashboard.module.css';

function OrderCard({ order, onOrderClick }) {
  const formatILS = (n) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(n);
  const getBadgeClass = (status) => {
    switch (status) {
      case 'assigned': return `${styles.badge} ${styles.badgeYellow}`;
      case 'picked_up': return `${styles.badge} ${styles.badgeBlue}`;
      case 'out_for_delivery': return `${styles.badge} ${styles.badgePurple}`;
      case 'delivered': return `${styles.badge} ${styles.badgeGreen}`;
      default: return styles.badge;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'assigned': return 'מוכן לאיסוף';
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
          <span className={styles.fw600}>ETA:</span>
          <span className={styles.ml4}>{order.estimatedDeliveryTime ? new Date(order.estimatedDeliveryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
        </div>
      </div>

      <div className={styles.divider}>
        <span className={styles.customerName}>{order.customerName}</span>
        <div className={styles.link}>
          <Phone size={16} />
          <span>התקשר</span>
        </div>
      </div>
    </div>
  );
}

export default function CourierDashboard({ onOrderClick = () => {} }) {
  const activeOrdersCount = mockActiveOrders.length;
  const todayDeliveries = mockEarnings.today.deliveries;
  // Static shift time display per user request
  const shiftTimeDisplay = '06:26:43';

  return (
    <div className={styles.page}>
      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardIcon}><Package size={24} color="#059669" /></div>
          <div className={styles.cardText}>
            <div className={styles.cardTitle}>משלוחים פעילים</div>
            <div className={styles.cardValue}>{activeOrdersCount}</div>
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
          {mockActiveOrders.length > 0 ? (
            <div className={styles.grid2}>
              {mockActiveOrders.map(order => (
                <OrderCard key={order.id} order={order} onOrderClick={onOrderClick} />
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

      {mockUpcomingOrders.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>משלוחים קרובים</div>
          <div className={styles.sectionBody}>
            <div className={styles.grid2}>
              {mockUpcomingOrders.map(order => (
                <OrderCard key={order.id} order={order} onOrderClick={onOrderClick} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>הושלמו לאחרונה</div>
        <div className={styles.sectionBody}>
          {mockCompletedOrders.length > 0 ? (
            <div className={styles.gridGap12}>
              {mockCompletedOrders.slice(0, 3).map(order => (
                <div key={order.id} className={styles.completedRow}>
                  <div className={styles.flexCenter}>
                    <CheckCircle size={20} color="#16a34a" className={styles.mr12} />
                    <div>
                      <div className={styles.strongDark}>#{order.id}</div>
                      <div className={styles.time}>{order.customerName}</div>
                    </div>
                  </div>
                  <div className={styles.right}>
                    <div className={styles.time}>
                      {order.deliveredAt && new Date(order.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
    </div>
  );
}

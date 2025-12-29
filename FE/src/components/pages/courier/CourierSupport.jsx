import React, { useState, useEffect, useContext } from 'react';
import { 
  Send, 
  Phone, 
  AlertTriangle, 
  MessageCircle, 
  CheckCircle
} from 'lucide-react';
import { AuthContext } from '../../../app/App';
import styles from './courierSupport.module.css';

export default function CourierSupport() {
  const { currentUser } = useContext(AuthContext) || {};
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [emergencyType, setEmergencyType] = useState('');
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [contactsMode, setContactsMode] = useState('chat'); // 'chat' | 'call'
  const [selectedContact, setSelectedContact] = useState({ id: 'admin-nawras', name: 'נורס (תמיכה)', role: 'admin', active: true });
  const [adminContacts, setAdminContacts] = useState([]);
  const [customerContacts, setCustomerContacts] = useState([]);
  const [courierId, setCourierId] = useState(null);
  const messagesEndRef = React.useRef(null);

  // Fetch courier ID and active orders
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const uid = currentUser?.user_id;
        if (!uid) return;
        
        // Get courier ID
        const courierRes = await fetch(`/api/courier/by-user/${uid}`, { credentials: 'include' });
        if (!courierRes.ok) return;
        const courierData = await courierRes.json();
        const courier = Array.isArray(courierData) ? courierData[0] : courierData;
        if (!courier || cancelled) return;
        setCourierId(courier.courier_id);
        
        // Get list of courier user IDs to exclude
        const courierCheckRes = await fetch('/api/courier/couriers', { credentials: 'include' });
        let courierUserIds = new Set();
        if (courierCheckRes.ok) {
          const couriers = await courierCheckRes.json();
          courierUserIds = new Set((Array.isArray(couriers) ? couriers : []).map(c => c.user_id));
        }
        
        // Get all users and filter by type
        const usersRes = await fetch('/api/users', { credentials: 'include' });
        if (usersRes.ok) {
          const allUsers = await usersRes.json();
          const users = Array.isArray(allUsers) ? allUsers : [];
          
          // Filter admins (exclude couriers)
          const adminList = users
            .filter(user => user.user_type === 'admin' && !courierUserIds.has(user.user_id))
            .map(admin => ({
              id: `admin-${admin.user_id}`,
              name: admin.username === 'nawras' ? 'נורס (תמיכה)' : `${admin.username} (תמיכה)`,
              role: 'admin',
              active: admin.username === 'nawras', // Nawras is always active
              phone: admin.phone || '+972-50-000-0000'
            }));
          setAdminContacts(adminList);
          
          // Set Nawras as default contact
          const nawras = adminList.find(a => a.name.includes('נורס'));
          if (nawras) {
            setSelectedContact(nawras);
          }
          
          // Get orders for this courier to find customers
          let customerOrderMap = new Map(); // customer_id -> { active: boolean, customer_id }
          try {
            const ordersRes = await fetch(`/api/courier/deliveries?courier_id=${courier.courier_id}`, { credentials: 'include' });
            if (ordersRes.ok) {
              const orders = await ordersRes.json();
              console.log('📦 Orders for courier:', courier.courier_id, orders);
              for (const order of (Array.isArray(orders) ? orders : [])) {
                if (order.customer_id) {
                  const isActive = order.status === 'assigned' || order.status === 'in_transit';
                  // If already exists, keep it active if any order is active
                  const existing = customerOrderMap.get(order.customer_id);
                  customerOrderMap.set(order.customer_id, {
                    customer_id: order.customer_id,
                    active: existing ? (existing.active || isActive) : isActive
                  });
                }
              }
              console.log('👥 Customer order map:', Array.from(customerOrderMap.entries()));
            }
          } catch (_) {}
          
          // Filter customers - only show those with orders from this courier
          console.log('🔍 All users:', users.length);
          console.log('🔍 Courier user IDs to exclude:', Array.from(courierUserIds));
          console.log('🔍 Customer IDs from orders:', Array.from(customerOrderMap.keys()));
          
          const customerList = users
            .filter(user => {
              const isCustomer = user.user_type === 'customer';
              const notCourier = !courierUserIds.has(user.user_id);
              const hasOrder = customerOrderMap.has(user.user_id);
              console.log(`User ${user.username} (ID: ${user.user_id}):`, { isCustomer, notCourier, hasOrder, user_type: user.user_type });
              return isCustomer && notCourier && hasOrder;
            })
            .map(customer => {
              const orderInfo = customerOrderMap.get(customer.user_id);
              return {
                id: `cust-${customer.user_id}`,
                name: customer.username || 'לקוח',
                role: 'customer',
                active: orderInfo?.active || false,
                phone: customer.phone || ''
              };
            });
          console.log('✅ Final customer list:', customerList);
          setCustomerContacts(customerList);
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [currentUser]);

  // Load messages when contact is selected
  useEffect(() => {
    if (!selectedContact || !currentUser) return;
    
    const loadMessages = async () => {
      try {
        const userId = parseInt(selectedContact.id.replace('admin-', '').replace('cust-', ''));
        if (isNaN(userId)) return;
        const res = await fetch(`/api/messages/conversation/${userId}`, { credentials: 'include' });
        if (res.ok) {
          const msgs = await res.json();
          const formattedMsgs = (Array.isArray(msgs) ? msgs : []).map(m => ({
            id: m.message_id,
            type: m.sender_id === currentUser.user_id ? 'courier' : (selectedContact.role === 'admin' ? 'admin' : 'customer'),
            message: m.message,
            timestamp: m.created_at,
            isRead: m.is_read
          }));
          setMessages(formattedMsgs);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };
    
    loadMessages();
    // Poll for new messages every 0.5 seconds for faster updates
    const interval = setInterval(loadMessages, 500);
    return () => clearInterval(interval);
  }, [selectedContact, currentUser]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [messages]);

  const openContacts = (mode = 'chat') => { setContactsMode(mode); setShowContacts(true); };
  const closeContacts = () => setShowContacts(false);
  const selectContact = (contact) => {
    if (contactsMode === 'call') {
      // In browser this will be a tel: link
      console.log(`Pretend calling ${contact.name}...`);
      closeContacts();
      return;
    }
    setSelectedContact(contact);
    setMessages([]); // Messages will be loaded by useEffect
    closeContacts();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;

    const messageText = newMessage;
    setNewMessage(''); // Clear input immediately

    try {
      const userId = parseInt(selectedContact.id.replace('admin-', '').replace('cust-', ''));
      
      // Optimistically add message to UI immediately
      const tempMsg = {
        id: 'temp-' + Date.now(),
        type: 'courier',
        message: messageText,
        timestamp: new Date().toISOString(),
        isRead: true
      };
      setMessages(prev => [...prev, tempMsg]);

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          receiver_id: userId,
          message: messageText
        })
      });

      if (res.ok) {
        const savedMsg = await res.json();
        // Replace temp message with real one
        setMessages(prev => prev.map(m => 
          m.id === tempMsg.id ? {
            id: savedMsg.message_id,
            type: 'courier',
            message: savedMsg.message,
            timestamp: savedMsg.created_at,
            isRead: savedMsg.is_read
          } : m
        ));
      } else {
        // Remove temp message on error
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        setNewMessage(messageText); // Restore message
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== 'temp-' + Date.now()));
      setNewMessage(messageText); // Restore message
    }
  };

  const typeLabelHe = (type) => {
    switch (type) {
      case 'accident': return 'תאונת דרכים';
      case 'medical': return 'אירוע רפואי';
      case 'vehicle_breakdown': return 'תקלה ברכב';
      case 'theft': return 'גניבה או בעיית אבטחה';
      case 'harassment': return 'הטרדה';
      case 'other': return 'אחר';
      default: return '';
    }
  };

  const reportEmergency = () => {
    console.log('Emergency reported:', emergencyType);
    setShowEmergencyModal(false);
    const label = typeLabelHe(emergencyType);
    setEmergencyType('');

    const emergencyMessage = {
      id: Date.now().toString(),
      type: 'courier',
      message: `🚨 חירום: ${label || 'לא צוין'}`,
      timestamp: new Date().toISOString(),
      isRead: true
    };

    setMessages([...messages, emergencyMessage]);
  };

  const callSupport = () => {
    window.open('tel:+1-800-SUPPORT', '_self');
  };

  return (
    <div className={styles.container}>
      <div className={styles.quickGrid}>
        <button onClick={() => openContacts('call')} className={styles.iconOnlyBtn} title="התקשר" aria-label="התקשר">
          <Phone size={22} />
        </button>

        <button onClick={() => setShowEmergencyModal(true)} className={`${styles.iconOnlyBtn} ${styles.danger}`} title="דווח על מקרה חירום" aria-label="דווח על מקרה חירום">
          <AlertTriangle size={22} />
        </button>

        <button onClick={() => openContacts('chat')} title="צ'אט חי" className={styles.iconOnlyBtn} aria-label="פתח רשימת צ'אט">
          <MessageCircle size={22} />
        </button>
      </div>

      <div className={styles.chat}>
        <div className={styles.chatHeader}>
          <div className={styles.chatTitle}>
            {contactsMode === 'call' ? <Phone size={18} /> : <MessageCircle size={18} />}
            <span>{selectedContact.name}</span>
          </div>
          <div className={styles.chatSubtitle}>
            {selectedContact.role === 'admin' ? (contactsMode === 'call' ? 'שיחת טלפון עם תמיכה' : 'צ׳אט עם תמיכה') : (contactsMode === 'call' ? 'שיחת טלפון עם לקוח' : 'צ׳אט עם לקוח')}
          </div>
        </div>

        <div className={styles.messages}>
          {messages.map(message => (
            <div
              key={message.id}
              className={`${styles.messageRow} ${message.type === 'courier' ? styles.right : styles.left}`}
            >
              <div className={message.type === 'courier' ? styles.bubbleCourier : styles.bubbleAdmin}>
                <div className={styles.msgTextSmall}>{message.message}</div>
                <div className={styles.bubbleMeta}>
                  <div>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {message.type === 'courier' && <CheckCircle size={12} />}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.inputBar}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="הקלד הודעה..."
            className={styles.textInput}
          />
          <button onClick={sendMessage} disabled={!newMessage.trim()} className={styles.sendBtn} aria-label="שלח">
            <Send size={16} />
          </button>
        </div>
      </div>

      {showEmergencyModal && (
        <div className={styles.modalWrap}>
          <div className={styles.backdrop} onClick={() => setShowEmergencyModal(false)} />
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="emergency-title">
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle} id="emergency-title">
                <AlertTriangle size={18} className={styles.mr8} />
                דיווח על מקרה חירום
              </div>
              <button onClick={() => setShowEmergencyModal(false)} className={styles.close} aria-label="סגור">×</button>
            </div>
            <div className={styles.modalBody}>
              <div>
                <label className={styles.fieldLabel}>סוג אירוע</label>
                <select value={emergencyType} onChange={(e) => setEmergencyType(e.target.value)} className={styles.select}>
                  <option value="">בחר סוג אירוע</option>
                  <option value="accident">תאונת דרכים</option>
                  <option value="medical">אירוע רפואי</option>
                  <option value="vehicle_breakdown">תקלה ברכב</option>
                  <option value="theft">גניבה או בעיית אבטחה</option>
                  <option value="harassment">הטרדה</option>
                  <option value="other">אחר</option>
                </select>
              </div>
              <div className={styles.pill}>
                <strong>למצבי חירום מיידיים:</strong> התקשרו ל-100 תחילה, ואז דווחו כאן.
              </div>
              <div className={styles.row}>
                <button onClick={reportEmergency} className={styles.primary} disabled={!emergencyType}>
                  דווח על מקרה חירום
                </button>
                <button onClick={() => setShowEmergencyModal(false)} className={styles.secondary}>
                  בטל
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showContacts && (
        <div className={styles.modalWrap}>
          <div className={styles.backdrop} onClick={closeContacts} />
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="contacts-title">
            <div className={styles.modalHeader}>
              <div className={styles.contactsTitle} id="contacts-title">
                {contactsMode === 'call' ? <Phone size={16} className={styles.mis8} /> : <MessageCircle size={16} className={styles.mis8} />}
                בחר איש קשר
              </div>
              <button onClick={closeContacts} className={styles.close} aria-label="סגור">×</button>
            </div>
            <div className={styles.modalBody}>
              <div>
                <div className={styles.contactsTitle}>נציגי תמיכה</div>
                <div className={styles.list}>
                  {adminContacts.map(c => (
                    <div key={c.id} className={styles.contactItem} onClick={() => selectContact(c)}>
                      <div className={styles.contactLeft}>
                        <div className={`${styles.dot} ${c.active ? styles.dotActive : styles.dotInactive}`} />
                        <span>{c.name}</span>
                      </div>
                      <span className={styles.badgeRole}>תמיכה</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className={styles.contactsTitle}>לקוחות</div>
                <div className={styles.list}>
                  {customerContacts.map(c => (
                    <div key={c.id} className={styles.contactItem} onClick={() => selectContact(c)}>
                      <div className={styles.contactLeft}>
                        <div className={`${styles.dot} ${c.active ? styles.dotActive : styles.dotInactive}`} />
                        <span>{c.name}</span>
                      </div>
                      <span className={styles.badgeRole}>לקוח</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

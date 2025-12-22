import React, { useState } from 'react';
import { 
  Send, 
  Phone, 
  AlertTriangle, 
  MessageCircle, 
  CheckCircle
} from 'lucide-react';
import { mockSupportMessages } from './data/courierMockData.js';
import styles from './courierSupport.module.css';

export default function CourierSupport() {
  const [messages, setMessages] = useState(mockSupportMessages);
  const [newMessage, setNewMessage] = useState('');
  const [emergencyType, setEmergencyType] = useState('');
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [contactsMode, setContactsMode] = useState('chat'); // 'chat' | 'call'
  const [selectedContact, setSelectedContact] = useState({ id: 'admin-1', name: 'דנה (תמיכה)', role: 'admin', active: true });

  const adminContacts = [
    { id: 'admin-1', name: 'דנה (תמיכה)', role: 'admin', active: true },
    { id: 'admin-2', name: 'עומר (תמיכה)', role: 'admin', active: false },
  ];

  const customerContacts = [
    { id: 'cust-101', name: 'יואב לוי', role: 'customer', active: true },
    { id: 'cust-102', name: 'מאיה כהן', role: 'customer', active: false },
  ];

  const conversations = {
    'admin-1': [
      { id: 'a1', type: 'admin', message: 'היי אלקס, איך אפשר לעזור?', timestamp: new Date().toISOString(), isRead: true },
      { id: 'a2', type: 'courier', message: 'היי! יש עיכוב בפקק בדרכי לכתובת הבאה.', timestamp: new Date().toISOString(), isRead: true },
    ],
    'admin-2': [
      { id: 'b1', type: 'admin', message: 'אני זמין עד 18:00, מה הצורך?', timestamp: new Date().toISOString(), isRead: true },
    ],
    'cust-101': [
      { id: 'c1', type: 'courier', message: 'שלום יואב, אני בדרך אליך. הגעה משוערת בעוד 10 דק׳.', timestamp: new Date().toISOString(), isRead: true },
      { id: 'c2', type: 'admin', message: 'עדכן אם יש שינוי.', timestamp: new Date().toISOString(), isRead: true },
    ],
    'cust-102': [
      { id: 'd1', type: 'courier', message: 'היי מאיה, הגעתי לבניין. לעלות לקומה 3?', timestamp: new Date().toISOString(), isRead: true },
    ],
  };

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
    const conv = conversations[contact.id] || [];
    setMessages(conv);
    closeContacts();
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now().toString(),
      type: 'courier',
      message: newMessage,
      timestamp: new Date().toISOString(),
      isRead: true
    };

    setMessages([...messages, message]);
    setNewMessage('');
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

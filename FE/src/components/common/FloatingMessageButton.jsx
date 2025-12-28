import React, { useState, useEffect, useContext } from 'react';
import { MessageCircle, X, Send, ArrowRight } from 'lucide-react';
import { AuthContext } from '../../app/App';

export default function FloatingMessageButton() {
  const { currentUser } = useContext(AuthContext) || {};
  const [isOpen, setIsOpen] = useState(false);
  const [showContactList, setShowContactList] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const messagesEndRef = React.useRef(null);

  // Fetch available contacts (couriers, admins, and people who messaged)
  useEffect(() => {
    if (!isOpen || !currentUser) return;
    
    const fetchContacts = async () => {
      try {
        const contactMap = new Map(); // user_id -> contact object
        
        // Get all users
        const usersRes = await fetch('/api/users', { credentials: 'include' });
        if (!usersRes.ok) return;
        
        const users = await usersRes.json();
        const userList = Array.isArray(users) ? users : [];
        const userById = new Map(userList.map(u => [u.user_id, u]));
        
        // Get courier user IDs and status
        const couriersRes = await fetch('/api/courier/couriers', { credentials: 'include' });
        let courierUserIds = new Set();
        let courierStatusMap = new Map();
        if (couriersRes.ok) {
          const couriers = await couriersRes.json();
          (Array.isArray(couriers) ? couriers : []).forEach(c => {
            courierUserIds.add(c.user_id);
            courierStatusMap.set(c.user_id, c.status);
          });
        }
        
        // Add active couriers
        userList
          .filter(u => courierUserIds.has(u.user_id) && courierStatusMap.get(u.user_id) === 'active')
          .forEach(u => {
            contactMap.set(u.user_id, {
              id: u.user_id,
              name: u.username || 'שליח',
              role: 'courier',
              active: true
            });
          });
        
        // Add other admins (if current user is admin)
        if (currentUser.user_type === 'admin') {
          userList
            .filter(u => u.user_type === 'admin' && u.user_id !== currentUser.user_id)
            .forEach(u => {
              contactMap.set(u.user_id, {
                id: u.user_id,
                name: u.username || 'מנהל',
                role: 'admin',
                active: false
              });
            });
        }
        
        // Fetch all messages to find people who have messaged this user
        try {
          // Get a list of all unique user IDs who have conversations with current user
          const messagesRes = await fetch('/api/messages/all-conversations', { credentials: 'include' });
          if (messagesRes.ok) {
            const conversations = await messagesRes.json();
            (Array.isArray(conversations) ? conversations : []).forEach(userId => {
              if (userId !== currentUser.user_id && !contactMap.has(userId)) {
                const user = userById.get(userId);
                if (user) {
                  const isCourier = courierUserIds.has(userId);
                  contactMap.set(userId, {
                    id: userId,
                    name: user.username || (isCourier ? 'שליח' : 'משתמש'),
                    role: isCourier ? 'courier' : (user.user_type === 'admin' ? 'admin' : 'customer'),
                    active: isCourier && courierStatusMap.get(userId) === 'active'
                  });
                }
              }
            });
          }
        } catch (err) {
          console.error('Failed to fetch conversations:', err);
        }
        
        setContacts(Array.from(contactMap.values()));
      } catch (err) {
        console.error('Failed to fetch contacts:', err);
      }
    };
    
    fetchContacts();
    // Refresh contact list every 1 second to catch new conversations instantly
    const interval = setInterval(fetchContacts, 1000);
    return () => clearInterval(interval);
  }, [isOpen, currentUser]);

  // Load messages for selected contact
  useEffect(() => {
    if (!selectedContact || !currentUser) return;
    
    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/messages/conversation/${selectedContact.id}`, { credentials: 'include' });
        if (res.ok) {
          const msgs = await res.json();
          console.log('Loaded messages:', msgs);
          const formattedMsgs = (Array.isArray(msgs) ? msgs : []).map(m => ({
            id: m.message_id,
            isMine: m.sender_id === currentUser.user_id,
            message: m.message,
            timestamp: m.created_at
          }));
          setMessages(formattedMsgs);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };
    
    loadMessages();
    const interval = setInterval(loadMessages, 500); // Check every 0.5 seconds for faster updates
    return () => clearInterval(interval);
  }, [selectedContact, currentUser]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;

    const messageText = newMessage;
    const tempId = 'temp-' + Date.now();
    
    // Clear input and add message immediately
    setNewMessage('');
    setMessages(prev => [...prev, {
      id: tempId,
      isMine: true,
      message: messageText,
      timestamp: new Date().toISOString()
    }]);

    try {

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          receiver_id: selectedContact.id,
          message: messageText
        })
      });

      if (res.ok) {
        const savedMsg = await res.json();
        // Replace temp message with real one
        setMessages(prev => prev.map(m => 
          m.id === tempId ? {
            id: savedMsg.message_id,
            isMine: true,
            message: savedMsg.message,
            timestamp: savedMsg.created_at
          } : m
        ));
      } else {
        // Remove temp message on error
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setNewMessage(messageText);
      }
    } catch (err) {
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(messageText);
    }
  };

  const selectContact = (contact) => {
    setSelectedContact(contact);
    setShowContactList(false);
    setMessages([]);
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!currentUser) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: '#059669',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <MessageCircle size={28} />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            width: '350px',
            height: '500px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '16px',
            background: '#059669',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {!showContactList && selectedContact && (
                <button
                  onClick={() => setShowContactList(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <ArrowRight size={20} />
                </button>
              )}
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                  {showContactList ? 'הודעות' : 'צ\'אט'}
                </div>
                {!showContactList && selectedContact && (
                  <div style={{ fontSize: '13px', opacity: 0.9 }}>{selectedContact.name}</div>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Content - Contact List or Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            background: '#f9fafb'
          }}>
            {showContactList ? (
              /* Contact List */
              <div style={{ padding: '8px' }}>
                {contacts.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                    אין אנשי קשר זמינים
                  </div>
                ) : (
                  contacts.map(contact => (
                    <div
                      key={contact.id}
                      onClick={() => selectContact(contact)}
                      style={{
                        padding: '12px',
                        background: 'white',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: contact.active ? '#10b981' : '#d1d5db'
                        }} />
                        <span style={{ fontWeight: '500', fontSize: '14px' }}>{contact.name}</span>
                      </div>
                      <span style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        padding: '2px 8px',
                        background: '#f3f4f6',
                        borderRadius: '12px'
                      }}>
                        {contact.role === 'courier' ? 'שליח' : 'מנהל'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Messages */
              <div style={{
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                minHeight: '100%'
              }}>
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: msg.isMine ? 'flex-end' : 'flex-start',
                      maxWidth: '70%'
                    }}
                  >
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: msg.isMine ? '#059669' : 'white',
                      color: msg.isMine ? 'white' : '#111827',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      fontSize: '14px',
                      direction: 'rtl',
                      textAlign: 'right'
                    }}>
                      {msg.message}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: '#6b7280',
                      marginTop: '4px',
                      textAlign: msg.isMine ? 'right' : 'left'
                    }}>
                      {new Date(msg.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input - Only show when in chat view */}
          {!showContactList && selectedContact && (
            <div style={{
              padding: '12px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '8px'
            }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="הקלד הודעה..."
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                direction: 'rtl'
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              style={{
                padding: '10px 16px',
                background: newMessage.trim() ? '#059669' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Send size={18} />
            </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

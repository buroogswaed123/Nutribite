import React, { useEffect, useState } from 'react';
import styles from '../../home/home.module.css'
import { useAuth } from '../../../../../hooks/useAuth';
import { ArrowUpDown } from 'lucide-react';

export default function UsersList() {
    const [recentUsers, setRecentUsers] = useState([]);
    const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
     const { fetchDashboardStats, fetchAllUsers } = useAuth();
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState('online'); // 'online' | 'type'
    useEffect(() => {
        let mounted = true;
        (async () => {
          try {
            const [statsData, usersData] = await Promise.all([
              fetchDashboardStats(),
              fetchAllUsers()
            ]);
            if (!mounted) return;
            setStats(statsData || {});
            setRecentUsers(Array.isArray(usersData) ? usersData : []);
          } catch (err) {
            console.error('AdminHome data load error:', err);
          } finally {
            if (mounted) setLoading(false);
          }
        })();
        // Poll users every 30s for online status updates
        const interval = setInterval(async () => {
          try {
            const usersData = await fetchAllUsers();
            if (mounted) setRecentUsers(Array.isArray(usersData) ? usersData : []);
          } catch (e) {
            // ignore
          }
        }, 30000);
        return () => { mounted = false; clearInterval(interval); };
      }, []);

  const filteredAndSorted = () => {
    const q = query.trim().toLowerCase();
    let list = recentUsers.filter(u => {
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
  };

    return (
        <div className={styles.recentSection}>
        <h2 className={styles.sectionTitle}>משתמשים</h2>
        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <input
            type="text"
            placeholder="חיפוש לפי שם או אימייל"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: 9999,
              background: '#fff',
              outline: 'none'
            }}
          />
          <button
            onClick={() => setSortMode((m) => (m === 'online' ? 'type' : 'online'))}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              background: '#0ea5e9',
              color: '#fff',
              cursor: 'pointer'
            }}
            title={sortMode === 'online' ? 'מיין לפי סוג משתמש' : 'מיין לפי סטטוס התחברות'}
            aria-label={sortMode === 'online' ? 'מיין לפי סוג משתמש' : 'מיין לפי סטטוס התחברות'}
          >
            <ArrowUpDown size={16} />
          </button>
          <span
            style={{
              padding: '4px 8px',
              borderRadius: 9999,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              fontSize: 12,
              color: '#334155'
            }}
          >
            {sortMode === 'online' ? 'מחוברים' : 'סוג'}
          </span>
        </div>
        <div className={styles.usersList}>
          {filteredAndSorted().length === 0 ? (
            <p className={styles.noData}>אין משתמשים להצגה</p>
          ) : (
            filteredAndSorted().map((user) => (
              <div key={user.user_id} className={styles.userItem}>
                <div className={styles.userInfo}>
                  <h4>{user.username}</h4>
                  <p>{user.email}</p>
                  <span className={`${styles.userType} ${styles[user.user_type]}`}>
                    {user.user_type === 'customer' && 'לקוח'}
                    {user.user_type === 'admin' && 'מנהל'}
                    {user.user_type === 'courier' && 'שליח'}
                  </span>
                </div>
                <div className={styles.userStatus}>
                  <span className={user.is_online ? styles.active : styles.inactive}>
                    {user.is_online ? 'מחובר' : 'לא מחובר'}
                  </span>
                  <p className={styles.userDate}>
                    {new Date(user.created_at).toLocaleDateString('he-IL')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
}
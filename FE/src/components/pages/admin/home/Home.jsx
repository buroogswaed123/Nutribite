import React, { useState, useEffect, useContext } from 'react';
import { Users, Package, TrendingUp, Calendar, Gift } from 'lucide-react';
import { AuthContext } from '../../../../app/App';
import { useAuth } from '../../../../hooks/useAuth';

import styles from './home.module.css';
import Activity from '../profile/management/Activity';
import UsersList from '../profile/management/UsersList';

export default function AdminHome() {
  const { currentUser } = useContext(AuthContext) || {};
  const { fetchDashboardStats } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchDashboardStats();
        if (!mounted) return;
        setStats(data || {});
      } catch (e) {
        console.error('AdminHome stats load error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [fetchDashboardStats]);
  const username = currentUser?.username || 'Admin';

  if (loading) {
    return (
      <div className={styles.adminHome}>
        <div className={styles.loading}>טוען נתונים...</div>
      </div>
    );
  }

  return (
    <div className={styles.adminHome}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>ברוך הבא, {username}!</h1>
        <p className={styles.subtitle}>פאנל ניהול Nutribite</p>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Users size={24} />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statNumber}>{stats?.total_users || 0}</h3>
            <p className={styles.statLabel}>משתמשים כוללים</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Users size={24} />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statNumber}>{stats?.active_users || 0}</h3>
            <p className={styles.statLabel}>משתמשים פעילים</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Package size={24} />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statNumber}>{stats?.users_by_type?.customer || 0}</h3>
            <p className={styles.statLabel}>לקוחות</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <TrendingUp size={24} />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statNumber}>{stats?.users_by_type?.admin || 0}</h3>
            <p className={styles.statLabel}>מנהלים</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Calendar size={24} />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statNumber}>{stats?.users_by_type?.courier || 0}</h3>
            <p className={styles.statLabel}>שליחים</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Gift size={24} />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statNumber}>0</h3>
            <p className={styles.statLabel}>הזמנות היום</p>
          </div>
        </div>
      </div>

      {/* Recent Users */}
      <UsersList />

      {/* Quick Actions */}
      <Activity />
    </div>
  );
}

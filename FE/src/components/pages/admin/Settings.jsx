import React, { useState, useEffect } from 'react';
import styles from './settings.module.css';

const Settings = () => {
  const [settings, setSettings] = useState({
    siteName: '',
    siteDescription: '',
    contactEmail: '',
    supportPhone: '',
    maintenanceMode: false,
    allowRegistration: true,
    emailNotifications: true,
    maxFileSize: 10,
    defaultLanguage: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
    itemsPerPage: 20,
    cacheEnabled: true,
    debugMode: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration
      const mockData = {
        siteName: 'Nutribite',
        siteDescription: 'פלטפורמת התזונה הבריאה והטעימה ביותר',
        contactEmail: 'support@nutribite.com',
        supportPhone: '+972-50-123-4567',
        maintenanceMode: false,
        allowRegistration: true,
        emailNotifications: true,
        maxFileSize: 10,
        defaultLanguage: 'he',
        timezone: 'Asia/Jerusalem',
        dateFormat: 'DD/MM/YYYY',
        currency: 'ILS',
        itemsPerPage: 20,
        cacheEnabled: true,
        debugMode: false,
      };

      // Load data immediately
      setSettings(mockData);
      setLoading(false);

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      // TODO: Replace with actual API call
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset all settings to default?')) return;

    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/admin/settings/reset', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to reset settings');

      await fetchSettings();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className={styles.loading}>Loading settings...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>System Settings</h1>
        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={handleReset}
            className={styles.resetBtn}
          >
            Reset to Default
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          Error: {error}
        </div>
      )}

      {success && (
        <div className={styles.success}>
          Settings saved successfully!
        </div>
      )}

      <form onSubmit={handleSave} className={styles.settingsForm}>
        {/* General Settings */}
        <div className={styles.section}>
          <h2>General Settings</h2>

          <div className={styles.formGroup}>
            <label htmlFor="siteName">Site Name:</label>
            <input
              type="text"
              id="siteName"
              name="siteName"
              value={settings.siteName}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="siteDescription">Site Description:</label>
            <textarea
              id="siteDescription"
              name="siteDescription"
              value={settings.siteDescription}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="contactEmail">Contact Email:</label>
            <input
              type="email"
              id="contactEmail"
              name="contactEmail"
              value={settings.contactEmail}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="supportPhone">Support Phone:</label>
            <input
              type="tel"
              id="supportPhone"
              name="supportPhone"
              value={settings.supportPhone}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* System Settings */}
        <div className={styles.section}>
          <h2>System Settings</h2>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="maintenanceMode"
                checked={settings.maintenanceMode}
                onChange={handleChange}
              />
              Maintenance Mode
            </label>
          </div>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="allowRegistration"
                checked={settings.allowRegistration}
                onChange={handleChange}
              />
              Allow User Registration
            </label>
          </div>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="emailNotifications"
                checked={settings.emailNotifications}
                onChange={handleChange}
              />
              Email Notifications
            </label>
          </div>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="cacheEnabled"
                checked={settings.cacheEnabled}
                onChange={handleChange}
              />
              Enable Caching
            </label>
          </div>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="debugMode"
                checked={settings.debugMode}
                onChange={handleChange}
              />
              Debug Mode
            </label>
          </div>
        </div>

        {/* File Upload Settings */}
        <div className={styles.section}>
          <h2>File Upload Settings</h2>

          <div className={styles.formGroup}>
            <label htmlFor="maxFileSize">Maximum File Size (MB):</label>
            <input
              type="number"
              id="maxFileSize"
              name="maxFileSize"
              value={settings.maxFileSize}
              onChange={handleChange}
              min="1"
              max="100"
              required
            />
          </div>
        </div>

        {/* Localization Settings */}
        <div className={styles.section}>
          <h2>Localization Settings</h2>

          <div className={styles.formGroup}>
            <label htmlFor="defaultLanguage">Default Language:</label>
            <select
              id="defaultLanguage"
              name="defaultLanguage"
              value={settings.defaultLanguage}
              onChange={handleChange}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="timezone">Timezone:</label>
            <select
              id="timezone"
              name="timezone"
              value={settings.timezone}
              onChange={handleChange}
            >
              <option value="UTC">UTC</option>
              <option value="EST">Eastern Time</option>
              <option value="PST">Pacific Time</option>
              <option value="GMT">Greenwich Mean Time</option>
              <option value="CET">Central European Time</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="dateFormat">Date Format:</label>
            <select
              id="dateFormat"
              name="dateFormat"
              value={settings.dateFormat}
              onChange={handleChange}
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="currency">Currency:</label>
            <select
              id="currency"
              name="currency"
              value={settings.currency}
              onChange={handleChange}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
          </div>
        </div>

        {/* Pagination Settings */}
        <div className={styles.section}>
          <h2>Pagination Settings</h2>

          <div className={styles.formGroup}>
            <label htmlFor="itemsPerPage">Items Per Page:</label>
            <input
              type="number"
              id="itemsPerPage"
              name="itemsPerPage"
              value={settings.itemsPerPage}
              onChange={handleChange}
              min="5"
              max="100"
              required
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className={styles.formActions}>
          <button
            type="submit"
            className={styles.saveBtn}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => window.history.back()}
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;

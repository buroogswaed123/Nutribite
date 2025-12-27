import React, { createContext, useContext, useState, useEffect } from "react";

const CourierUIContext = createContext(null);

export function CourierUIProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Listen to global toggle event from Header
  useEffect(() => {
    const handler = () => setSidebarOpen(prev => !prev);
    window.addEventListener('courier:toggleSidebar', handler);
    return () => window.removeEventListener('courier:toggleSidebar', handler);
  }, []);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [sidebarOpen]);

  return (
    <CourierUIContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      {children}
    </CourierUIContext.Provider>
  );
}

export function useCourierUI() {
  const ctx = useContext(CourierUIContext);
  if (!ctx) {
    throw new Error("useCourierUI must be used inside CourierUIProvider");
  }
  return ctx;
}

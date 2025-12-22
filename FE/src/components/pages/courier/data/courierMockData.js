// Simple mock data for courier dashboard
export const mockActiveOrders = [
  {
    id: 1012,
    status: 'assigned',
    pickupLocation: { name: 'Nutribite Kitchen A' },
    dropoffLocation: { address: 'Herzl 10, Tel Aviv' },
    estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    customerName: 'דוד כהן'
  },
  {
    id: 1013,
    status: 'out_for_delivery',
    pickupLocation: { name: 'Nutribite Kitchen B' },
    dropoffLocation: { address: 'Ben Gurion 5, Ramat Gan' },
    estimatedDeliveryTime: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    customerName: 'נועה לוי'
  }
];

export const mockUpcomingOrders = [
  {
    id: 1015,
    status: 'assigned',
    pickupLocation: { name: 'Nutribite Kitchen C' },
    dropoffLocation: { address: 'Dizengoff 100, Tel Aviv' },
    estimatedDeliveryTime: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
    customerName: 'אייל ישראל'
  }
];

export const mockCompletedOrders = [
  {
    id: 1008,
    status: 'delivered',
    pickupLocation: { name: 'Nutribite Kitchen A' },
    dropoffLocation: { address: 'Jabotinsky 20, Petah Tikva' },
    deliveredAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    customerName: 'רות קפלן'
  }
];

export const mockEarnings = {
  today: { earnings: 180, tips: 42, deliveries: Math.max(1, mockCompletedOrders.length) },
  week: { earnings: 1340, tips: 260, deliveries: 62 },
  month: { earnings: 5240, tips: 1120, deliveries: 243 },
};

export const mockCourierProfile = {
  name: 'אלכס',
  phone: '050-123-4567',
  email: 'alex@example.com',
  city: 'חיפה',
  isOnline: true,
  rating: 4.7,
  totalDeliveries: 1287,
  joinDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365).toISOString(),
};

export const mockSupportMessages = [
  { id: 'm1', type: 'admin', message: 'שלום, כאן תמיכה. איך אפשר לסייע?', timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), isRead: true },
  { id: 'm2', type: 'courier', message: 'שלום! יש עיכוב קל בדרך למשלוח.', timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(), isRead: true },
];

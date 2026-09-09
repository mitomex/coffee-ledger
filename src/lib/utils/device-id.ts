const DEVICE_ID_KEY = 'deviceId';

function generateDeviceId(): string {
  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server';
  }

  try {
    const storage = window.localStorage;
    const existing = storage.getItem(DEVICE_ID_KEY);
    if (existing) {
      return existing;
    }

    const newId = generateDeviceId();
    storage.setItem(DEVICE_ID_KEY, newId);
    return newId;
  } catch (error) {
    console.warn('Unable to access localStorage for deviceId:', error);
    return generateDeviceId();
  }
}

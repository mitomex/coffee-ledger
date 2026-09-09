import type { Bag } from '@/lib/types';
import { getOrCreateDeviceId } from '@/lib/utils/device-id';

const DEFAULT_VERSION = 1;

export function withNewBagMetadata(bag: Bag): Bag {
  const now = new Date().toISOString();
  return {
    ...bag,
    version: bag.version ?? DEFAULT_VERSION,
    updatedAt: bag.updatedAt ?? now,
    deviceId: bag.deviceId ?? getOrCreateDeviceId(),
  };
}

export function withUpdatedBagMetadata(bag: Bag): Bag {
  const now = new Date().toISOString();
  return {
    ...bag,
    version: (bag.version ?? DEFAULT_VERSION) + 1,
    updatedAt: now,
    deviceId: bag.deviceId ?? getOrCreateDeviceId(),
  };
}

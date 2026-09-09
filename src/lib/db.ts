import Dexie, { Table } from 'dexie';
import type { Bag, ImageData } from './types';
import { getOrCreateDeviceId } from '@/lib/utils/device-id';

class CoffeeDB extends Dexie {
  bags!: Table<Bag, string>;
  images!: Table<ImageData, string>;

  constructor() {
    super('coffee-ledger');
    this.version(1).stores({
      bags: 'id, purchaseDate, roastDate, roaster, process',
    });

    this.version(2).stores({
      bags: 'id, purchaseDate, roastDate, roaster, process',
      images: 'id, createdAt',
    });

    this.version(3)
      .stores({
        bags: 'id, updatedAt, purchaseDate, roastDate, roaster, process',
        images: 'id, createdAt',
      })
      .upgrade(async (tx) => {
        const table = tx.table('bags');
        const deviceId = getOrCreateDeviceId();
        await table.toCollection().modify((record) => {
          const bag = record as Bag;
          if (bag.version == null) {
            bag.version = 1;
          }
          if (!bag.updatedAt) {
            bag.updatedAt = new Date().toISOString();
          }
          if (!bag.deviceId) {
            bag.deviceId = deviceId;
          }
        });
      });

    // サブスクリプション機能追加
    this.version(4).stores({
      bags: 'id, updatedAt, purchaseDate, roastDate, roaster, process, isSubscriptionTemplate',
      images: 'id, createdAt',
    });
  }
}
export const db = new CoffeeDB();

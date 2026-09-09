import { storeImageData, getImageData, deleteImageData, convertFileToBase64, convertUrlToBase64 } from '../image-storage';
import { db } from '@/lib/db';

// Dexie uses IndexedDB; provide a simple in-memory mock for tests
beforeAll(() => {
  global.indexedDB = global.indexedDB || {
    open: () => ({ result: {}, onupgradeneeded: null, onsuccess: null, onerror: null })
  }
})

// モックした画像データ
const mockImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

describe('Image Storage', () => {
  beforeEach(async () => {
    // テスト前にDBをクリア
    await db.images.clear();
  });

  // Mock global fetch to avoid real network in convertUrlToBase64
  beforeAll(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      blob: async () => new Blob([], { type: 'application/octet-stream' })
    } as unknown as Response)
  })

  describe('storeImageData', () => {
    it('should store image data with generated ID and return the ID', async () => {
      const imageId = await storeImageData(mockImageData);

      expect(imageId).toBeDefined();
      expect(typeof imageId).toBe('string');
      expect(imageId.length).toBeGreaterThan(0);

      // 実際にDBに保存されているかを確認
      const stored = await db.images.get(imageId);
      expect(stored).toBeDefined();
      expect(stored!.data).toBe(mockImageData);
      expect(stored!.createdAt).toBeDefined();
    });

    it('should store image data with provided ID', async () => {
      const customId = 'custom-image-id';
      const imageId = await storeImageData(mockImageData, customId);

      expect(imageId).toBe(customId);

      const stored = await db.images.get(customId);
      expect(stored).toBeDefined();
      expect(stored!.data).toBe(mockImageData);
    });

    it('should handle empty image data', async () => {
      await expect(storeImageData('')).rejects.toThrow('Image data cannot be empty');
    });

    it('should handle invalid base64 data', async () => {
      await expect(storeImageData('invalid-data')).rejects.toThrow('Invalid image data format');
    });
  });

  describe('getImageData', () => {
    it('should retrieve stored image data', async () => {
      const imageId = await storeImageData(mockImageData);
      const retrieved = await getImageData(imageId);

      expect(retrieved).toBe(mockImageData);
    });

    it('should return null for non-existent image', async () => {
      const retrieved = await getImageData('non-existent-id');
      expect(retrieved).toBeNull();
    });

    it('should handle empty ID', async () => {
      const retrieved = await getImageData('');
      expect(retrieved).toBeNull();
    });
  });

  describe('deleteImageData', () => {
    it('should delete stored image data', async () => {
      const imageId = await storeImageData(mockImageData);

      // 削除前に存在することを確認
      const beforeDelete = await getImageData(imageId);
      expect(beforeDelete).toBe(mockImageData);

      // 削除実行
      await deleteImageData(imageId);

      // 削除後に存在しないことを確認
      const afterDelete = await getImageData(imageId);
      expect(afterDelete).toBeNull();
    });

    it('should handle deletion of non-existent image', async () => {
      // エラーをスローしないことを確認
      await expect(deleteImageData('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('convertFileToBase64', () => {
    it('should convert File to base64 string', async () => {
      // Create a mock File object
      const fileContent = 'test image content';
      const mockFile = new File([fileContent], 'test.jpg', { type: 'image/jpeg' });

      const base64 = await convertFileToBase64(mockFile, { useHighDPI: false });

      expect(base64).toMatch(/^data:image\/jpeg;base64,/);
      expect(base64.length).toBeGreaterThan('data:image/jpeg;base64,'.length);
    });

    it('should handle different image types', async () => {
      const fileContent = 'test png content';
      const mockFile = new File([fileContent], 'test.png', { type: 'image/png' });

      const base64 = await convertFileToBase64(mockFile, { useHighDPI: false });

      expect(base64).toMatch(/^data:image\/png;base64,/);
    });

    it('should reject non-image files', async () => {
      const fileContent = 'test text content';
      const mockFile = new File([fileContent], 'test.txt', { type: 'text/plain' });

      await expect(convertFileToBase64(mockFile)).rejects.toThrow('Unsupported file type');
    });
  });

  describe('convertUrlToBase64', () => {
    it('should handle invalid URLs', async () => {
      await expect(convertUrlToBase64('invalid-url')).rejects.toThrow();
    });

    it('should handle empty URL', async () => {
      await expect(convertUrlToBase64('')).rejects.toThrow();
    });

    it('fetches the original image URL without a third-party proxy', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      await expect(convertUrlToBase64('https://example.com/bean.jpg')).rejects.toThrow();

      const requestedUrls = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(requestedUrls).toEqual(['https://example.com/bean.jpg']);
      expect(requestedUrls.some((url) => url.includes('allorigins'))).toBe(false);
      expect(requestedUrls.some((url) => url.includes('cors-anywhere'))).toBe(false);
      expect(requestedUrls.some((url) => url.includes('thingproxy'))).toBe(false);
    });
  });
});

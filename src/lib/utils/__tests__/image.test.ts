import {
  getValidImageUrl,
  getValidImageUrlLegacy,
  getDefaultImageUrl,
  DEFAULT_COFFEE_IMAGE,
  PLACEHOLDER_IMAGE
} from '../image'
import { storeImageData } from '../image-storage'
import { db } from '@/lib/db'

// Dexie uses IndexedDB; provide a simple in-memory mock for tests
beforeAll(() => {
  global.indexedDB = global.indexedDB || {
    open: () => ({ result: {}, onupgradeneeded: null, onsuccess: null, onerror: null })
  }
})

describe('Image Utils', () => {
  beforeEach(async () => {
    // テスト前にDBをクリア
    await db.images.clear();
  });

  describe('getValidImageUrl (new async version)', () => {
    it('should return default image when imageId is undefined', async () => {
      const result = await getValidImageUrl(undefined)
      expect(result).toBe(DEFAULT_COFFEE_IMAGE)
    })

    it('should return default image when imageId is empty string', async () => {
      const result = await getValidImageUrl('')
      expect(result).toBe(DEFAULT_COFFEE_IMAGE)
    })

    it('should return stored image data when imageId exists', async () => {
      const mockImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD//gA7Q1JFQVRPUJO/9k='
      const imageId = await storeImageData(mockImageData)

      const result = await getValidImageUrl(imageId)
      expect(result).toBe(mockImageData)
    })

    it('should return default image when imageId does not exist in storage', async () => {
      const result = await getValidImageUrl('non-existent-id')
      expect(result).toBe(DEFAULT_COFFEE_IMAGE)
    })
  })

  describe('getValidImageUrlLegacy (legacy synchronous version)', () => {
    it('should return default image when imageUrl is undefined', () => {
      const result = getValidImageUrlLegacy(undefined)
      expect(result).toBe(DEFAULT_COFFEE_IMAGE)
    })

    it('should return default image when imageUrl is empty string', () => {
      const result = getValidImageUrlLegacy('')
      expect(result).toBe(DEFAULT_COFFEE_IMAGE)
    })

    it('should return default image when imageUrl is the placeholder URL', () => {
      const result = getValidImageUrlLegacy(PLACEHOLDER_IMAGE)
      expect(result).toBe(DEFAULT_COFFEE_IMAGE)
    })

    it('should return default image for any placehold.co URL', () => {
      const placeholderUrls = [
        'https://placehold.co/320x180/8B4513/FFFFFF?text=Coffee',
        'https://placehold.co/240x160/F7F3EE/8B7355?text=Coffee+Beans',
        'http://placehold.co/100x100',
        'https://placehold.co/500x500/000000/FFFFFF'
      ]

      placeholderUrls.forEach(url => {
        const result = getValidImageUrlLegacy(url)
        expect(result).toBe(DEFAULT_COFFEE_IMAGE)
      })
    })

    it('should return the original URL for valid image URLs', () => {
      const validUrls = [
        'https://example.com/coffee.jpg',
        'https://storage.googleapis.com/coffee-images/123.png',
        '/uploads/coffee-beans.webp',
        'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
        'https://definitive.com/images/product.jpg'
      ]

      validUrls.forEach(url => {
        const result = getValidImageUrlLegacy(url)
        expect(result).toBe(url)
      })
    })

    it('should handle relative URLs correctly', () => {
      const relativeUrls = [
        '/images/coffee.jpg',
        './assets/beans.png',
        '../uploads/product.webp'
      ]

      relativeUrls.forEach(url => {
        const result = getValidImageUrlLegacy(url)
        expect(result).toBe(url)
      })
    })

    it('should handle blob URLs correctly', () => {
      const blobUrl = 'blob:https://example.com/123-456-789'
      const result = getValidImageUrlLegacy(blobUrl)
      expect(result).toBe(blobUrl)
    })

    it('should handle object URLs correctly', () => {
      const objectUrl = 'blob:null/123-456-789'
      const result = getValidImageUrlLegacy(objectUrl)
      expect(result).toBe(objectUrl)
    })

    it('should handle case variations in placehold.co URLs', () => {
      // Current implementation uses includes() which is case sensitive
      // Testing actual behavior
      const lowerCaseUrl = 'https://placehold.co/240x160'
      expect(getValidImageUrlLegacy(lowerCaseUrl)).toBe(DEFAULT_COFFEE_IMAGE)

      // Mixed case URLs are treated as valid (not placeholder)
      const upperCaseUrl = 'https://PLACEHOLD.CO/240x160'
      expect(getValidImageUrlLegacy(upperCaseUrl)).toBe(upperCaseUrl)

      const mixedCaseUrl = 'https://PlaceHold.Co/240x160'
      expect(getValidImageUrlLegacy(mixedCaseUrl)).toBe(mixedCaseUrl)
    })

    it('should handle URLs with query parameters', () => {
      const url = 'https://example.com/coffee.jpg?width=500&height=300'
      const result = getValidImageUrlLegacy(url)
      expect(result).toBe(url)
    })

    it('should handle URLs with hash fragments', () => {
      const url = 'https://example.com/coffee.jpg#thumbnail'
      const result = getValidImageUrlLegacy(url)
      expect(result).toBe(url)
    })

    it('should handle protocol-relative URLs', () => {
      const url = '//cdn.example.com/images/coffee.jpg'
      const result = getValidImageUrlLegacy(url)
      expect(result).toBe(url)
    })

    it('should detect placehold.co in the middle of URL', () => {
      const url = 'https://cdn.example.com/placehold.co/image.jpg'
      const result = getValidImageUrlLegacy(url)
      expect(result).toBe(DEFAULT_COFFEE_IMAGE)
    })
  })

  describe('getDefaultImageUrl', () => {
    it('should return the default coffee image path', () => {
      const result = getDefaultImageUrl()
      expect(result).toBe(DEFAULT_COFFEE_IMAGE)
    })

    it('should always return the same value', () => {
      const result1 = getDefaultImageUrl()
      const result2 = getDefaultImageUrl()
      const result3 = getDefaultImageUrl()
      
      expect(result1).toBe(result2)
      expect(result2).toBe(result3)
      expect(result1).toBe(DEFAULT_COFFEE_IMAGE)
    })

    it('should return a string', () => {
      const result = getDefaultImageUrl()
      expect(typeof result).toBe('string')
    })

    it('should return a non-empty string', () => {
      const result = getDefaultImageUrl()
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('Constants', () => {
    it('should have correct DEFAULT_COFFEE_IMAGE path', () => {
      expect(DEFAULT_COFFEE_IMAGE).toBe('/default-coffee-bean.svg')
    })

    it('should have correct PLACEHOLDER_IMAGE URL', () => {
      expect(PLACEHOLDER_IMAGE).toBe('https://placehold.co/240x160/F7F3EE/8B7355?text=Coffee+Beans')
    })

    it('should have PLACEHOLDER_IMAGE containing placehold.co', () => {
      expect(PLACEHOLDER_IMAGE).toContain('placehold.co')
    })
  })
})
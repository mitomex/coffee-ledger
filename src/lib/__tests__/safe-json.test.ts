/**
 * @jest-environment node
 */

import { safeJSONParse, isString, isPlainObject, validateMicrolinkData } from '../safe-json';

describe('safe-json', () => {
  describe('safeJSONParse', () => {
    it('should parse valid JSON', () => {
      const json = '{"name": "test", "value": 123}';
      const result = safeJSONParse(json);

      expect(result).toEqual({ name: 'test', value: 123 });
    });

    it('should return null for invalid JSON', () => {
      const invalidJson = '{ invalid json }';
      const result = safeJSONParse(invalidJson);

      expect(result).toBeNull();
    });

    it('should remove __proto__ property (prototype pollution protection)', () => {
      const maliciousJson = '{"__proto__": {"polluted": true}, "data": "safe"}';
      const result = safeJSONParse<Record<string, unknown>>(maliciousJson);

      expect(result).toBeTruthy();
      expect(result?.data).toBe('safe');
      // __proto__ は組み込みプロパティなので完全削除は不可能
      // 重要なのは、hasOwnProperty で __proto__ が false であること
      expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(false);
      expect((result as Record<string, unknown>)?.polluted).toBeUndefined();
    });

    it('should remove constructor property from JSON', () => {
      const maliciousJson = '{"constructor": {"prototype": {"polluted": true}}, "data": "safe"}';
      const result = safeJSONParse<Record<string, unknown>>(maliciousJson);

      expect(result).toBeTruthy();
      expect(result?.data).toBe('safe');
      // constructor は組み込みプロパティなので完全削除は不可能
      // 重要なのは、hasOwnProperty で constructor が false であること
      expect(Object.prototype.hasOwnProperty.call(result, 'constructor')).toBe(false);
    });

    it('should remove prototype property', () => {
      const maliciousJson = '{"prototype": {"polluted": true}, "data": "safe"}';
      const result = safeJSONParse<Record<string, unknown>>(maliciousJson);

      expect(result).toBeTruthy();
      expect(result?.data).toBe('safe');
      expect((result as Record<string, unknown>)?.prototype).toBeUndefined();
    });

    it('should handle nested objects', () => {
      const json = '{"outer": {"inner": {"value": 42}}}';
      const result = safeJSONParse(json);

      expect(result).toEqual({ outer: { inner: { value: 42 } } });
    });

    it('should sanitize nested dangerous keys', () => {
      const maliciousJson = '{"outer": {"__proto__": {"polluted": true}, "safe": "value"}}';
      const result = safeJSONParse<Record<string, Record<string, unknown>>>(maliciousJson);

      expect(result).toBeTruthy();
      expect(result?.outer).toBeTruthy();
      expect(result?.outer?.safe).toBe('value');
      // __proto__ は組み込みプロパティなので完全削除は不可能
      // 重要なのは、hasOwnProperty で __proto__ が false であること
      expect(Object.prototype.hasOwnProperty.call(result?.outer, '__proto__')).toBe(false);
      expect((result?.outer as Record<string, unknown>)?.polluted).toBeUndefined();
    });

    it('should handle arrays', () => {
      const json = '[1, 2, {"value": 3}]';
      const result = safeJSONParse(json);

      expect(result).toEqual([1, 2, { value: 3 }]);
    });

    it('should sanitize objects within arrays', () => {
      const maliciousJson = '[{"__proto__": {"polluted": true}, "data": "safe"}]';
      const result = safeJSONParse<Array<Record<string, unknown>>>(maliciousJson);

      expect(Array.isArray(result)).toBe(true);
      expect(result?.[0]?.data).toBe('safe');
      // __proto__ は組み込みプロパティなので完全削除は不可能
      // 重要なのは、悪意のあるプロパティが設定されていないこと
      expect(Object.prototype.hasOwnProperty.call(result?.[0], '__proto__')).toBe(false);
      expect((result?.[0] as Record<string, unknown>)?.polluted).toBeUndefined();
    });

    it('should handle primitives', () => {
      expect(safeJSONParse('"string"')).toBe('string');
      expect(safeJSONParse('123')).toBe(123);
      expect(safeJSONParse('true')).toBe(true);
      expect(safeJSONParse('null')).toBeNull();
    });

    it('should handle empty objects', () => {
      const json = '{}';
      const result = safeJSONParse(json);

      expect(result).toEqual({});
    });
  });

  describe('isString', () => {
    it('should return true for strings', () => {
      expect(isString('hello')).toBe(true);
      expect(isString('')).toBe(true);
      expect(isString('123')).toBe(true);
    });

    it('should return false for non-strings', () => {
      expect(isString(123)).toBe(false);
      expect(isString(true)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString({})).toBe(false);
      expect(isString([])).toBe(false);
    });
  });

  describe('isPlainObject', () => {
    it('should return true for plain objects', () => {
      expect(isPlainObject({})).toBe(true);
      expect(isPlainObject({ key: 'value' })).toBe(true);
      expect(isPlainObject({ nested: { object: true } })).toBe(true);
    });

    it('should return false for arrays', () => {
      expect(isPlainObject([])).toBe(false);
      expect(isPlainObject([1, 2, 3])).toBe(false);
    });

    it('should return false for null', () => {
      expect(isPlainObject(null)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isPlainObject('string')).toBe(false);
      expect(isPlainObject(123)).toBe(false);
      expect(isPlainObject(true)).toBe(false);
      expect(isPlainObject(undefined)).toBe(false);
    });

    it('should return false for functions', () => {
      expect(isPlainObject(() => {})).toBe(false);
    });

    it('should return false for Date objects', () => {
      expect(isPlainObject(new Date())).toBe(false);
    });
  });

  describe('validateMicrolinkData', () => {
    it('should validate correct Microlink data', () => {
      const data = {
        title: 'Test Title',
        description: 'Test Description',
        text: 'Test Text',
        image: {
          url: 'https://example.com/image.jpg'
        }
      };

      expect(validateMicrolinkData(data)).toBe(true);
    });

    it('should accept data with missing optional fields', () => {
      expect(validateMicrolinkData({})).toBe(true);
      expect(validateMicrolinkData({ title: 'Only Title' })).toBe(true);
      expect(validateMicrolinkData({ description: 'Only Description' })).toBe(true);
    });

    it('should reject data with wrong types', () => {
      expect(validateMicrolinkData({ title: 123 })).toBe(false);
      expect(validateMicrolinkData({ description: true })).toBe(false);
      expect(validateMicrolinkData({ text: [] })).toBe(false);
      expect(validateMicrolinkData({ image: 'not-an-object' })).toBe(false);
    });

    it('should reject non-object data', () => {
      expect(validateMicrolinkData(null)).toBe(false);
      expect(validateMicrolinkData('string')).toBe(false);
      expect(validateMicrolinkData(123)).toBe(false);
      expect(validateMicrolinkData([])).toBe(false);
    });

    it('should validate image object structure', () => {
      const dataWithImage = {
        image: {
          url: 'https://example.com/image.jpg'
        }
      };
      expect(validateMicrolinkData(dataWithImage)).toBe(true);

      const dataWithInvalidImage = {
        image: {
          url: 123 // wrong type
        }
      };
      expect(validateMicrolinkData(dataWithInvalidImage)).toBe(false);
    });

    it('should handle nested structures safely', () => {
      const data = {
        title: 'Test',
        image: {
          url: 'https://example.com/image.jpg',
          __proto__: 'malicious' // should not cause issues
        }
      };

      // Should still validate based on known properties
      expect(validateMicrolinkData(data)).toBe(true);
    });
  });
});

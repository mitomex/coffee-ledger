import { validateForm, createBagFromForm } from '../form-validation'
import type { NewBagForm } from '../form-validation'

describe('Form Validation Utils', () => {
  const mockForm: NewBagForm = {
    name: 'Ethiopia Yirgacheffe',
    roaster: 'Test Roaster',
    priceJPY: '2500',
    bagWeight_g: '200',
    roastDate: '2025-09-05',
    purchaseDate: '2025-09-06',
    process: 'Washed',
    variety: 'Heirloom',
    farm: 'Konga',
    country: 'Ethiopia',
    notes: 'Floral, citrus',
    bagDose_g: '14'
  }

  describe('validateForm', () => {
    it('should return empty array when all required fields are present', () => {
      const result = validateForm(mockForm)
      expect(result).toEqual([])
    })

    it('should return missing purchaseDate when not provided', () => {
      const form = { ...mockForm, purchaseDate: '' }
      const result = validateForm(form)
      expect(result).toContain('購入日')
    })

    it('should return missing bagWeight_g when not provided', () => {
      const form = { ...mockForm, bagWeight_g: '' }
      const result = validateForm(form)
      expect(result).toContain('袋重量')
    })

    it('should return both missing fields when neither is provided', () => {
      const form = { ...mockForm, purchaseDate: '', bagWeight_g: '' }
      const result = validateForm(form)
      expect(result).toEqual(['購入日', '袋重量'])
    })
  })

  describe('createBagFromForm', () => {
    it('should create a bag with correct data from form', () => {
      const result = createBagFromForm(mockForm)

      expect(result.name).toBe('Ethiopia Yirgacheffe')
      expect(result.roaster).toBe('Test Roaster')
      expect(result.process).toBe('Washed')
      expect(result.variety).toBe('Heirloom')
      expect(result.farm).toBe('Konga')
      expect(result.country).toBe('Ethiopia')
      expect(result.bagWeight_g).toBe(200)
      expect(result.remaining_g).toBe(200)
      expect(result.priceJPY).toBe(2500)
      expect(result.bagDose_g).toBe(14)
      expect(result.consumeLogs).toEqual([])
    })

    it('should handle empty form fields with defaults', () => {
      const emptyForm: NewBagForm = {
        name: '',
        roaster: '',
        priceJPY: '',
        bagWeight_g: '100',
        roastDate: '',
        purchaseDate: '2025-09-08',
        process: '',
        variety: '',
        farm: '',
        country: '',
        notes: '',
        bagDose_g: ''
      }

      const result = createBagFromForm(emptyForm)

      expect(result.name).toBe('未設定')
      expect(result.roaster).toBe('未設定')
      expect(result.process).toBe('')
      expect(result.variety).toBeUndefined()
      expect(result.farm).toBeUndefined()
      expect(result.country).toBeUndefined()
      expect(result.roastDate).toBeUndefined()
      expect(result.priceJPY).toBeUndefined()
      expect(result.bagDose_g).toBeUndefined()
      expect(result.notes).toBeUndefined()
    })

    it('should generate unique IDs for bags', () => {
      const bag1 = createBagFromForm(mockForm)
      const bag2 = createBagFromForm(mockForm)
      
      expect(bag1.id).not.toBe(bag2.id)
      expect(bag1.id).toMatch(/^bag-\d+-[a-z0-9]+$/)
      expect(bag2.id).toMatch(/^bag-\d+-[a-z0-9]+$/)
    })

  })

  describe('Set Product Support', () => {
    describe('validateForm with set products', () => {
      it('should validate set bag fields when isSet is true', () => {
        const form: NewBagForm = {
          name: 'Test Set',
          roaster: 'Test Roaster',
          priceJPY: '',
          bagWeight_g: '',
          roastDate: '',
          purchaseDate: '2025-09-01',
          process: '',
          variety: '',
          notes: '',
          bagDose_g: '',
          isSet: true,
          setTotalPriceJPY: '',
          setPurchaseDate: '',
          setTotalWeight_g: '',
        }

        const missing = validateForm(form)
        expect(missing).toContain('セット価格')
      })

      it('should not require bagWeight_g when isSet is true', () => {
        const form: NewBagForm = {
          name: 'Test Set',
          roaster: 'Test Roaster',
          priceJPY: '',
          bagWeight_g: '',
          roastDate: '',
          purchaseDate: '2025-09-01',
          process: '',
          variety: '',
          notes: '',
          bagDose_g: '',
          isSet: true,
          setTotalPriceJPY: '6000',
          setPurchaseDate: '2025-09-01',
          setTotalWeight_g: '',
        }

        const missing = validateForm(form)
        expect(missing).not.toContain('袋重量')
      })
    })

    describe('createBagFromForm with set products', () => {
      it('should create parent bag when isSet is true', () => {
        const form: NewBagForm = {
          name: 'Test Set',
          roaster: 'Test Roaster',
          priceJPY: '',
          bagWeight_g: '',
          roastDate: '',
          purchaseDate: '2025-09-01',
          process: 'Washed',
          variety: '',
          notes: '',
          bagDose_g: '',
          isSet: true,
          setTotalPriceJPY: '6000',
          setPurchaseDate: '2025-09-01',
          setTotalWeight_g: '600',
        }

        const bag = createBagFromForm(form)

        expect(bag.isSet).toBe(true)
        expect(bag.childBagIds).toEqual([])
        expect(bag.remaining_g).toBe(0)
        expect(bag.priceJPY).toBeUndefined()
        expect(bag.setInfo).toEqual({
          totalPriceJPY: 6000,
          purchaseDate: '2025-09-01',
          totalWeight_g: 600,
        })
      })

      it('should create normal bag when isSet is false', () => {
        const form: NewBagForm = {
          name: 'Test Bag',
          roaster: 'Test Roaster',
          priceJPY: '2000',
          bagWeight_g: '200',
          roastDate: '',
          purchaseDate: '2025-09-01',
          process: 'Washed',
          variety: '',
          notes: '',
          bagDose_g: '',
          isSet: false,
          setTotalPriceJPY: '',
          setPurchaseDate: '',
          setTotalWeight_g: '',
        }

        const bag = createBagFromForm(form)

        expect(bag.isSet).toBeUndefined()
        expect(bag.remaining_g).toBe(200)
        expect(bag.priceJPY).toBe(2000)
        expect(bag.setInfo).toBeUndefined()
      })

      it('should use setPurchaseDate for setInfo when provided', () => {
        const form: NewBagForm = {
          name: 'Test Set',
          roaster: 'Test Roaster',
          priceJPY: '',
          bagWeight_g: '',
          roastDate: '',
          purchaseDate: '2025-09-10',
          process: '',
          variety: '',
          notes: '',
          bagDose_g: '',
          isSet: true,
          setTotalPriceJPY: '6000',
          setPurchaseDate: '2025-09-01',
          setTotalWeight_g: '',
        }

        const bag = createBagFromForm(form)

        expect(bag.setInfo?.purchaseDate).toBe('2025-09-01')
        expect(bag.purchaseDate).toBe('2025-09-10')
      })
    })
  })
})

// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock IntersectionObserver
// @ts-expect-error - test mock
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver  
// @ts-expect-error - test mock
global.ResizeObserver = class ResizeObserver {
  constructor(cb) {
    this.cb = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock next/navigation with overridable jest.fn functions
jest.mock('next/navigation', () => {
  const routerMock = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }
  return {
    useRouter: jest.fn(() => routerMock),
    useSearchParams: jest.fn(() => new URLSearchParams()),
    usePathname: jest.fn(() => '/'),
  }
})

// Mock next/image to behave like a standard img in tests
import React from 'react'
jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line react/display-name
  default: React.forwardRef((props, ref) => {
    const rest = { ...props };
    delete rest.fill;
    return React.createElement('img', { ...rest, ref });
  }),
}))

// Mock window.matchMedia (guard for non-browser environments)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // Deprecated
      removeListener: jest.fn(), // Deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Polyfill URL.createObjectURL used by image utilities
if (!global.URL.createObjectURL) {
  // @ts-expect-error - test polyfill
  global.URL.createObjectURL = () => 'blob:mock-url'
}

// Global in-memory DB mock to avoid IndexedDB in Node
jest.mock('@/lib/db', () => {
  const bags = new Map()
  const images = new Map()
  return {
    db: {
      bags: {
        toArray: async () => Array.from(bags.values()),
        get: async (id) => bags.get(id) || undefined,
        put: async (bag) => { bags.set(bag.id, bag); return bag.id },
        add: async (bag) => { bags.set(bag.id, bag); return bag.id },
        delete: async (id) => { bags.delete(id) }
      },
      images: {
        clear: async () => { images.clear() },
        get: async (id) => images.get(id) || undefined,
        put: async (record) => { images.set(record.id, record) },
        delete: async (id) => { images.delete(id) }
      }
    }
  }
})

// Minimal fetch/FileReader polyfills for tests
// @ts-expect-error - test polyfill
if (typeof global.fetch === 'undefined') {
  // @ts-expect-error - test polyfill
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({}), blob: async () => new Blob() }))
}

try {
  // @ts-expect-error - runtime check
  const exists = typeof global.FileReader !== 'undefined'
  if (!exists) {
    function TestFileReader() {
      this.result = null
      this.onload = null
      this.onerror = null
    }
    TestFileReader.prototype.readAsDataURL = function (file) {
      file.arrayBuffer().then(function (ab) {
        var base64 = Buffer.from(new Uint8Array(ab)).toString('base64')
        var type = file && file.type ? file.type : 'application/octet-stream'
        this.result = 'data:' + type + ';base64,' + base64
        if (typeof this.onload === 'function') this.onload()
      }.bind(this)).catch(function () { if (typeof this.onerror === 'function') this.onerror() }.bind(this))
    }
    // @ts-expect-error - assign to global in tests
    global.FileReader = TestFileReader
  }
} catch {}

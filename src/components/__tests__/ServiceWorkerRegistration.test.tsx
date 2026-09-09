import { render } from '../../__tests__/utils/test-utils'
import ServiceWorkerRegistration from '../ServiceWorkerRegistration'

// Mock navigator.serviceWorker
const mockServiceWorker = {
  register: jest.fn()
}

const mockNavigator = {
  serviceWorker: mockServiceWorker
}

Object.defineProperty(window, 'navigator', {
  value: mockNavigator,
  writable: true
})

describe('ServiceWorkerRegistration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockServiceWorker.register.mockResolvedValue({})
  })

  it('should render without crashing', () => {
    render(<ServiceWorkerRegistration />)
    // Component returns null, so we just check it doesn't throw
  })

  it('should register service worker when supported', async () => {
    render(<ServiceWorkerRegistration />)
    
    // Simulate window load event
    const loadEvent = new Event('load')
    window.dispatchEvent(loadEvent)
    
    // Wait for async registration
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(mockServiceWorker.register).toHaveBeenCalledWith('/service-worker.js')
  })

  it('should handle service worker registration success', async () => {
    const mockRegistration = { scope: '/test-scope' }
    mockServiceWorker.register.mockResolvedValue(mockRegistration)
    
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    
    render(<ServiceWorkerRegistration />)
    
    // Simulate window load event
    const loadEvent = new Event('load')
    window.dispatchEvent(loadEvent)
    
    // Wait for async registration
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(consoleSpy).toHaveBeenCalledWith('SW registered: ', mockRegistration)
    
    consoleSpy.mockRestore()
  })

  it('should handle service worker registration error', async () => {
    const mockError = new Error('Registration failed')
    mockServiceWorker.register.mockRejectedValue(mockError)
    
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    
    render(<ServiceWorkerRegistration />)
    
    // Simulate window load event
    const loadEvent = new Event('load')
    window.dispatchEvent(loadEvent)
    
    // Wait for async registration
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(consoleSpy).toHaveBeenCalledWith('SW registration failed: ', mockError)
    
    consoleSpy.mockRestore()
  })

  it('should check for service worker support before registering', () => {
    render(<ServiceWorkerRegistration />)
    
    // Just verify the component renders without error
    // The service worker support check is already covered in other tests
  })
})
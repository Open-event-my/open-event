/**
 * Connectivity Monitor Service
 *
 * Tracks online/offline status and manages action queuing for offline operations.
 * Provides ARIA live region announcements for accessibility.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { calculateBackoffDelay, DEFAULT_RETRY_CONFIG, type RetryConfig } from './recoveryActions'

/**
 * Queued action for offline operations
 * Requirements: 3.2
 */
export interface QueuedAction {
  /** Unique action ID */
  id: string
  /** Action to execute */
  execute: () => Promise<unknown>
  /** Description for user feedback */
  description: string
  /** Timestamp when queued */
  queuedAt: number
  /** Number of retry attempts */
  retryCount: number
}

/**
 * Result of processing a queued action
 */
export interface QueueProcessingResult {
  /** Action ID */
  id: string
  /** Whether the action succeeded */
  success: boolean
  /** Error message if failed */
  error?: string
}

/**
 * Connectivity change callback type
 */
export type ConnectivityChangeCallback = (isOnline: boolean) => void

/**
 * Queue change callback type
 */
export type QueueChangeCallback = (queue: QueuedAction[]) => void

/**
 * Local storage key for persisting queued actions
 */
const QUEUE_STORAGE_KEY = 'connectivity_monitor_queue'

/**
 * Generate a unique ID for queued actions
 */
function generateActionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 11)
  return `action-${timestamp}-${randomPart}`
}

/**
 * Connectivity Monitor class
 * Manages online/offline status, action queuing, and ARIA announcements
 *
 * Requirements: 3.1, 3.2, 3.3, 3.5
 */
export class ConnectivityMonitor {
  private _isOnline: boolean
  private _queue: QueuedAction[] = []
  private _connectivityCallbacks: Set<ConnectivityChangeCallback> = new Set()
  private _queueCallbacks: Set<QueueChangeCallback> = new Set()
  private _ariaLiveRegion: HTMLElement | null = null
  private _isProcessingQueue: boolean = false
  private _retryConfig: RetryConfig

  constructor(retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this._isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
    this._retryConfig = retryConfig

    // Set up browser event listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this._handleOnline)
      window.addEventListener('offline', this._handleOffline)
    }

    // Load persisted queue from localStorage
    this._loadQueueFromStorage()
  }

  /**
   * Current online status
   */
  get isOnline(): boolean {
    return this._isOnline
  }

  /**
   * Handle online event
   * Requirements: 3.3, 3.5
   */
  private _handleOnline = (): void => {
    this._isOnline = true
    this._notifyConnectivityChange(true)
    this.announceConnectivity(true)

    // Process queued actions when connectivity is restored
    this._processQueue()
  }

  /**
   * Handle offline event
   * Requirements: 3.1, 3.5
   */
  private _handleOffline = (): void => {
    this._isOnline = false
    this._notifyConnectivityChange(false)
    this.announceConnectivity(false)
  }

  /**
   * Notify all connectivity change subscribers
   */
  private _notifyConnectivityChange(isOnline: boolean): void {
    this._connectivityCallbacks.forEach((callback) => {
      try {
        callback(isOnline)
      } catch (error) {
        console.error('Error in connectivity change callback:', error)
      }
    })
  }

  /**
   * Notify all queue change subscribers
   */
  private _notifyQueueChange(): void {
    this._queueCallbacks.forEach((callback) => {
      try {
        callback([...this._queue])
      } catch (error) {
        console.error('Error in queue change callback:', error)
      }
    })
  }

  /**
   * Queue an action for when online
   * Requirements: 3.2
   *
   * @param action - Action to queue (without id, queuedAt, retryCount)
   * @returns The unique ID of the queued action
   */
  queueAction(action: Omit<QueuedAction, 'id' | 'queuedAt' | 'retryCount'>): string {
    const id = generateActionId()
    const queuedAction: QueuedAction = {
      ...action,
      id,
      queuedAt: Date.now(),
      retryCount: 0,
    }

    this._queue.push(queuedAction)
    this._saveQueueToStorage()
    this._notifyQueueChange()

    return id
  }

  /**
   * Get all queued actions
   * Requirements: 3.2
   */
  getQueuedActions(): QueuedAction[] {
    return [...this._queue]
  }

  /**
   * Get the number of queued actions
   */
  getQueueLength(): number {
    return this._queue.length
  }

  /**
   * Clear the queue
   * Requirements: 3.2
   */
  clearQueue(): void {
    this._queue = []
    this._saveQueueToStorage()
    this._notifyQueueChange()
  }

  /**
   * Remove a specific action from the queue
   */
  removeAction(id: string): boolean {
    const initialLength = this._queue.length
    this._queue = this._queue.filter((action) => action.id !== id)

    if (this._queue.length !== initialLength) {
      this._saveQueueToStorage()
      this._notifyQueueChange()
      return true
    }
    return false
  }

  /**
   * Subscribe to connectivity changes
   * Requirements: 3.5
   *
   * @param callback - Function to call when connectivity changes
   * @returns Unsubscribe function
   */
  onConnectivityChange(callback: ConnectivityChangeCallback): () => void {
    this._connectivityCallbacks.add(callback)
    return () => {
      this._connectivityCallbacks.delete(callback)
    }
  }

  /**
   * Subscribe to queue changes
   *
   * @param callback - Function to call when queue changes
   * @returns Unsubscribe function
   */
  onQueueChange(callback: QueueChangeCallback): () => void {
    this._queueCallbacks.add(callback)
    return () => {
      this._queueCallbacks.delete(callback)
    }
  }

  /**
   * Announce connectivity change to screen readers
   * Requirements: 3.5
   *
   * @param isOnline - Current connectivity status
   */
  announceConnectivity(isOnline: boolean): void {
    if (typeof document === 'undefined') return

    // Create or get the ARIA live region
    if (!this._ariaLiveRegion) {
      this._ariaLiveRegion = this._createAriaLiveRegion()
    }

    // Set the announcement message
    const message = isOnline
      ? 'You are back online. Pending actions will be processed.'
      : 'You are offline. Actions will be queued and processed when you reconnect.'

    // Update the live region content
    this._ariaLiveRegion.textContent = message

    // Clear the announcement after a delay
    setTimeout(() => {
      if (this._ariaLiveRegion) {
        this._ariaLiveRegion.textContent = ''
      }
    }, 5000)
  }

  /**
   * Create an ARIA live region for announcements
   */
  private _createAriaLiveRegion(): HTMLElement {
    // Check if one already exists
    const existing = document.getElementById('connectivity-announcer')
    if (existing) return existing

    const region = document.createElement('div')
    region.id = 'connectivity-announcer'
    region.setAttribute('role', 'status')
    region.setAttribute('aria-live', 'polite')
    region.setAttribute('aria-atomic', 'true')

    // Visually hidden but accessible to screen readers
    region.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `

    document.body.appendChild(region)
    return region
  }

  /**
   * Process queued actions when connectivity is restored
   * Requirements: 3.3
   */
  private async _processQueue(): Promise<QueueProcessingResult[]> {
    if (this._isProcessingQueue || !this._isOnline || this._queue.length === 0) {
      return []
    }

    this._isProcessingQueue = true
    const results: QueueProcessingResult[] = []

    // Process actions in order
    const actionsToProcess = [...this._queue]

    for (const action of actionsToProcess) {
      if (!this._isOnline) {
        // Stop processing if we go offline again
        break
      }

      const result = await this._processAction(action)
      results.push(result)

      if (result.success) {
        // Remove successful action from queue
        this.removeAction(action.id)
      }
    }

    this._isProcessingQueue = false
    return results
  }

  /**
   * Process a single queued action with retry logic
   * Requirements: 3.3
   */
  private async _processAction(action: QueuedAction): Promise<QueueProcessingResult> {
    try {
      await action.execute()
      return { id: action.id, success: true }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))

      // Update retry count
      action.retryCount++

      if (action.retryCount >= this._retryConfig.maxAttempts) {
        // Max retries reached, remove from queue
        this.removeAction(action.id)
        return {
          id: action.id,
          success: false,
          error: `Failed after ${action.retryCount} attempts: ${err.message}`,
        }
      }

      // Calculate backoff delay and schedule retry
      const delay = calculateBackoffDelay(action.retryCount, this._retryConfig)

      // Wait and retry if still online
      await this._sleep(delay)

      if (this._isOnline) {
        return this._processAction(action)
      }

      return {
        id: action.id,
        success: false,
        error: 'Went offline during retry',
      }
    }
  }

  /**
   * Sleep for a specified duration
   */
  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Save queue to localStorage for persistence
   * Requirements: 3.2
   */
  private _saveQueueToStorage(): void {
    if (typeof localStorage === 'undefined') return

    try {
      // We can only save serializable data, so we save descriptions
      const serializableQueue = this._queue.map((action) => ({
        id: action.id,
        description: action.description,
        queuedAt: action.queuedAt,
        retryCount: action.retryCount,
      }))
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(serializableQueue))
    } catch (error) {
      console.error('Failed to save queue to localStorage:', error)
    }
  }

  /**
   * Load queue from localStorage
   * Note: Only loads metadata, execute functions must be re-registered
   */
  private _loadQueueFromStorage(): void {
    if (typeof localStorage === 'undefined') return

    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY)
      if (stored) {
        // We can only restore metadata, not the execute functions
        // This is intentional - actions need to be re-queued with their handlers
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          // Clear stored queue since we can't restore execute functions
          localStorage.removeItem(QUEUE_STORAGE_KEY)
        }
      }
    } catch (error) {
      console.error('Failed to load queue from localStorage:', error)
    }
  }

  /**
   * Manually trigger queue processing
   * Useful for testing or manual retry
   */
  async processQueueManually(): Promise<QueueProcessingResult[]> {
    return this._processQueue()
  }

  /**
   * Clean up event listeners and resources
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this._handleOnline)
      window.removeEventListener('offline', this._handleOffline)
    }

    if (this._ariaLiveRegion && this._ariaLiveRegion.parentNode) {
      this._ariaLiveRegion.parentNode.removeChild(this._ariaLiveRegion)
    }

    this._connectivityCallbacks.clear()
    this._queueCallbacks.clear()
  }
}

// Singleton instance for global use
let globalMonitor: ConnectivityMonitor | null = null

/**
 * Get the global connectivity monitor instance
 */
export function getConnectivityMonitor(): ConnectivityMonitor {
  if (!globalMonitor) {
    globalMonitor = new ConnectivityMonitor()
  }
  return globalMonitor
}

/**
 * Reset the global connectivity monitor (useful for testing)
 */
export function resetConnectivityMonitor(): void {
  if (globalMonitor) {
    globalMonitor.destroy()
    globalMonitor = null
  }
}

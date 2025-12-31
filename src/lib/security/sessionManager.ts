/**
 * Session Manager
 * Tracks user activity and enforces session timeout (15 minutes idle)
 * 
 * Requirements: 1.7 - Session timeout enforcement
 */

export interface SessionConfig {
  timeoutMs: number; // Session timeout in milliseconds
  warningMs: number; // Show warning before timeout
  checkIntervalMs: number; // How often to check for timeout
}

export interface SessionState {
  lastActivityTime: number;
  isActive: boolean;
  isWarningShown: boolean;
}

export type SessionEventType = 'timeout' | 'warning' | 'activity';

export type SessionEventHandler = (event: SessionEventType) => void;

const DEFAULT_CONFIG: SessionConfig = {
  timeoutMs: 15 * 60 * 1000, // 15 minutes
  warningMs: 2 * 60 * 1000, // 2 minutes before timeout
  checkIntervalMs: 10 * 1000, // Check every 10 seconds
};

// Activity events to track
const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
] as const;

/**
 * Session Manager Class
 * Manages user session timeout based on activity
 */
export class SessionManager {
  private config: SessionConfig;
  private state: SessionState;
  private checkInterval: number | null = null;
  private eventHandlers: Set<SessionEventHandler> = new Set();
  private activityThrottleTimeout: number | null = null;
  private isInitialized = false;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      lastActivityTime: Date.now(),
      isActive: true,
      isWarningShown: false,
    };
  }

  /**
   * Initialize session manager and start tracking
   */
  public start(): void {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;
    this.state.lastActivityTime = Date.now();
    this.state.isActive = true;
    this.state.isWarningShown = false;

    // Register activity listeners
    this.registerActivityListeners();

    // Start timeout check interval
    this.startTimeoutCheck();
  }

  /**
   * Stop session manager and cleanup
   */
  public stop(): void {
    if (!this.isInitialized) {
      return;
    }

    this.isInitialized = false;

    // Remove activity listeners
    this.unregisterActivityListeners();

    // Clear timeout check interval
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Clear throttle timeout
    if (this.activityThrottleTimeout !== null) {
      clearTimeout(this.activityThrottleTimeout);
      this.activityThrottleTimeout = null;
    }
  }

  /**
   * Register an event handler
   */
  public on(handler: SessionEventHandler): () => void {
    this.eventHandlers.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.eventHandlers.delete(handler);
    };
  }

  /**
   * Manually reset the session timer (e.g., after user action)
   */
  public resetTimer(): void {
    this.state.lastActivityTime = Date.now();
    this.state.isWarningShown = false;
    this.emit('activity');
  }

  /**
   * Get current session state
   */
  public getState(): Readonly<SessionState> {
    return { ...this.state };
  }

  /**
   * Get time remaining until timeout (in milliseconds)
   */
  public getTimeRemaining(): number {
    const elapsed = Date.now() - this.state.lastActivityTime;
    const remaining = this.config.timeoutMs - elapsed;
    return Math.max(0, remaining);
  }

  /**
   * Check if session is about to timeout (within warning window)
   */
  public isNearTimeout(): boolean {
    const remaining = this.getTimeRemaining();
    return remaining > 0 && remaining <= this.config.warningMs;
  }

  /**
   * Check if session has timed out
   */
  public isTimedOut(): boolean {
    return this.getTimeRemaining() === 0;
  }

  /**
   * Register activity event listeners
   */
  private registerActivityListeners(): void {
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, this.handleActivity, { passive: true });
    });
  }

  /**
   * Unregister activity event listeners
   */
  private unregisterActivityListeners(): void {
    ACTIVITY_EVENTS.forEach((event) => {
      window.removeEventListener(event, this.handleActivity);
    });
  }

  /**
   * Handle user activity (throttled)
   */
  private handleActivity = (): void => {
    // Throttle activity updates to avoid excessive state updates
    if (this.activityThrottleTimeout !== null) {
      return;
    }

    this.activityThrottleTimeout = window.setTimeout(() => {
      this.activityThrottleTimeout = null;
    }, 1000); // Throttle to once per second

    this.resetTimer();
  };

  /**
   * Start the timeout check interval
   */
  private startTimeoutCheck(): void {
    this.checkInterval = window.setInterval(() => {
      this.checkTimeout();
    }, this.config.checkIntervalMs);
  }

  /**
   * Check for session timeout
   */
  private checkTimeout(): void {
    const remaining = this.getTimeRemaining();

    // Session has timed out
    if (remaining === 0 && this.state.isActive) {
      this.state.isActive = false;
      this.emit('timeout');
      return;
    }

    // Show warning if approaching timeout
    if (this.isNearTimeout() && !this.state.isWarningShown) {
      this.state.isWarningShown = true;
      this.emit('warning');
    }
  }

  /**
   * Emit event to all registered handlers
   */
  private emit(event: SessionEventType): void {
    this.eventHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error('Session event handler error:', error);
      }
    });
  }
}

/**
 * Create a singleton session manager instance
 */
let sessionManagerInstance: SessionManager | null = null;

export function getSessionManager(config?: Partial<SessionConfig>): SessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager(config);
  }
  return sessionManagerInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetSessionManager(): void {
  if (sessionManagerInstance) {
    sessionManagerInstance.stop();
    sessionManagerInstance = null;
  }
}

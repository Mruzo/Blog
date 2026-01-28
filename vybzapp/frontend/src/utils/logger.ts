/**
 * Production-safe logging utility
 * Only logs in development mode to avoid performance issues and information leakage
 */

type LogLevel = 'log' | 'warn' | 'error' | 'debug';

const isDevelopment = process.env.NODE_ENV === 'development';

class Logger {
  private shouldLog(level: LogLevel): boolean {
    // Always log errors, even in production (but can be filtered)
    if (level === 'error') {
      return true;
    }
    // Only log other levels in development
    return isDevelopment;
  }

  log(...args: any[]): void {
    if (this.shouldLog('log')) {
      console.log(...args);
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(...args);
    }
  }

  error(...args: any[]): void {
    // Always log errors, but can be filtered in production if needed
    console.error(...args);
  }

  debug(...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(...args);
    }
  }

  // Special method for verbose debugging (only in development)
  verbose(...args: any[]): void {
    if (isDevelopment) {
      console.log('[VERBOSE]', ...args);
    }
  }

  // Method for camera/debug logs that are very frequent
  camera(...args: any[]): void {
    // Only log camera changes in development, and only if explicitly enabled
    if (isDevelopment && localStorage.getItem('debug:camera') === 'true') {
      console.log('[CAMERA]', ...args);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export default for convenience
export default logger;

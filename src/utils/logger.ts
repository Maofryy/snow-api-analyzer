// Comprehensive logging and monitoring utility
import { ApiError, ValidationError } from '../types';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
  error?: ApiError | Error;
  userId?: string;
  sessionId?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  context?: string;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogSize = 1000;
  private performanceMetrics: PerformanceMetric[] = [];
  private sessionId: string;
  private readonly logLevel: LogLevel;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.logLevel = this.getLogLevel();
    this.setupErrorHandlers();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getLogLevel(): LogLevel {
    const level = process.env.NODE_ENV === 'development' ? 'DEBUG' : 'INFO';
    return LogLevel[level as keyof typeof LogLevel] || LogLevel.INFO;
  }

  private setupErrorHandlers(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.error('Global error caught', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });

    // Promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled promise rejection', {
        reason: event.reason,
        promise: event.promise
      });
    });
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private addLog(level: LogLevel, message: string, context?: string, data?: unknown, error?: ApiError | Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      data,
      error,
      sessionId: this.sessionId
    };

    this.logs.push(entry);

    // Trim logs if exceeding max size
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(-this.maxLogSize);
    }

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      const logMethod = this.getConsoleMethod(level);
      logMethod(`[${LogLevel[level]}] ${message}`, data || '');
    }
  }

  private getConsoleMethod(level: LogLevel): (...args: unknown[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        return console.error;
      default:
        return console.log;
    }
  }

  public debug(message: string, context?: string, data?: unknown): void {
    this.addLog(LogLevel.DEBUG, message, context, data);
  }

  public info(message: string, context?: string, data?: unknown): void {
    this.addLog(LogLevel.INFO, message, context, data);
  }

  public warn(message: string, context?: string, data?: unknown): void {
    this.addLog(LogLevel.WARN, message, context, data);
  }

  public error(message: string, context?: string, data?: unknown, error?: ApiError | Error): void {
    this.addLog(LogLevel.ERROR, message, context, data, error);
  }

  public fatal(message: string, context?: string, data?: unknown, error?: ApiError | Error): void {
    this.addLog(LogLevel.FATAL, message, context, data, error);
  }

  public logValidationErrors(errors: ValidationError[], context?: string): void {
    if (errors.length === 0) return;

    this.warn(`Validation errors: ${errors.length}`, context, {
      errors: errors.map(e => ({
        field: e.field,
        message: e.message,
        value: e.value
      }))
    });
  }

  public logApiCall(
    method: string,
    url: string,
    responseTime: number,
    success: boolean,
    context?: string,
    error?: ApiError
  ): void {
    const message = `API ${method} ${success ? 'succeeded' : 'failed'}`;
    const data = {
      method,
      url: url.replace(/([?&])(username|password|token)=[^&]*/g, '$1$2=***'),
      responseTime,
      success
    };

    if (success) {
      this.info(message, context, data);
    } else {
      this.error(message, context, data, error);
    }
  }

  public logPerformanceMetric(name: string, value: number, unit: string, context?: string): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      context
    };

    this.performanceMetrics.push(metric);

    // Trim metrics if exceeding max size
    if (this.performanceMetrics.length > this.maxLogSize) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.maxLogSize);
    }

    this.debug(`Performance metric: ${name} = ${value} ${unit}`, context);
  }

  public measurePerformance<T>(
    name: string,
    fn: () => T | Promise<T>,
    context?: string
  ): T | Promise<T> {
    const start = performance.now();
    
    try {
      const result = fn();
      
      if (result instanceof Promise) {
        return result
          .then(value => {
            const duration = performance.now() - start;
            this.logPerformanceMetric(name, duration, 'ms', context);
            return value;
          })
          .catch(error => {
            const duration = performance.now() - start;
            this.logPerformanceMetric(name, duration, 'ms', context);
            this.error(`Performance measurement failed: ${name}`, context, undefined, error);
            throw error;
          });
      } else {
        const duration = performance.now() - start;
        this.logPerformanceMetric(name, duration, 'ms', context);
        return result;
      }
    } catch (error) {
      const duration = performance.now() - start;
      this.logPerformanceMetric(name, duration, 'ms', context);
      this.error(`Performance measurement failed: ${name}`, context, undefined, error as Error);
      throw error;
    }
  }

  public getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level);
    }
    return [...this.logs];
  }

  public getPerformanceMetrics(): PerformanceMetric[] {
    return [...this.performanceMetrics];
  }

  public exportLogs(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      exportTime: new Date().toISOString(),
      logs: this.logs,
      performanceMetrics: this.performanceMetrics
    }, null, 2);
  }

  public clearLogs(): void {
    this.logs = [];
    this.performanceMetrics = [];
  }

  public getSystemInfo(): Record<string, unknown> {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screenResolution: `${screen.width}x${screen.height}`,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      sessionId: this.sessionId
    };
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Performance monitoring helper
export function withPerformanceLogging<T extends (...args: unknown[]) => unknown>(
  fn: T,
  name: string,
  context?: string
): T {
  return ((...args: Parameters<T>) => {
    return logger.measurePerformance(
      name,
      () => fn(...args),
      context
    );
  }) as T;
}
import { PERFORMANCE_REPORT_INTERVAL } from '../constants/gameConstants.js';

let lastPerformanceReport = Date.now();

export function reportPerformance(operation, startTime) {
  const now = Date.now();
  if (now - lastPerformanceReport > PERFORMANCE_REPORT_INTERVAL) {
    const operationTime = now - startTime;
    self.postMessage({
      type: 'performanceReport',
      data: {
        operation,
        time: operationTime,
        timestamp: now
      }
    });
    lastPerformanceReport = now;
  }
} 
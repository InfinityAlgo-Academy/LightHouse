declare module 'marky' {
  export function mark(id: string): void;
  export function stop(id: string): void;
  export function getEntries(): PerformanceEntry[];
  export function clear(): void;
}

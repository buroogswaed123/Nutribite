// Lightweight performance logger for instrumentation during development
// Usage:
//   const t = perfStart('recipes:mount');
//   perfPoint('recipes:after-fetch');
//   perfEnd(t, 'recipes:rendered');

export function perfStart(label = 'perf') {
  const start = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  try {
    // Keep a stack on window for quick diffing if needed
    if (typeof window !== 'undefined') {
      window.__perfMarks = window.__perfMarks || [];
      window.__perfMarks.push({ label, start });
    }
  } catch {}
  console.log(`[PERF] ${label} start @ ${start.toFixed ? start.toFixed(1) : start}ms`);
  return { label, start };
}

export function perfPoint(label = 'perf:point') {
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  console.log(`[PERF] ${label} point @ ${now.toFixed ? now.toFixed(1) : now}ms`);
  return now;
}

export function perfEnd(handle, label = 'perf:end') {
  const end = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const start = handle?.start ?? end;
  const dur = end - start;
  console.log(`[PERF] ${label} end @ ${end.toFixed ? end.toFixed(1) : end}ms (+${dur.toFixed ? dur.toFixed(1) : dur}ms)`);
  return dur;
}

// Helper to measure async functions
export async function perfWrap(label, fn) {
  const t = perfStart(`${label}:start`);
  try {
    const res = await fn();
    perfEnd(t, `${label}:done`);
    return res;
  } catch (e) {
    perfEnd(t, `${label}:error`);
    throw e;
  }
}

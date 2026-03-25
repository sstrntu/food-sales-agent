// src/data/reps.js
// Re-exports loadReps from dataService for backward-compatible imports.
// App.jsx calls loadReps() on mount; REPS is no longer a static object.

export { loadReps } from './dataService';

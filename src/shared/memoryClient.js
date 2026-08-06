// Bridge-authoritative categorized memory (identity, preferences, projects, relationships,
// notes) via dev_server.py's /memory route. Falls back to a flat localStorage object when
// no bridge is reachable (e.g. hosted/chat-only mode), so remember/recall always "succeed"
// from the model's point of view — bridge-authoritative when reachable, per-browser-local
// otherwise.
import { postJSON } from './bridgeClient.js';

const FALLBACK_KEY = 'aegis_memory_fallback';

function readFallback() {
  try {
    return JSON.parse(localStorage.getItem(FALLBACK_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function writeFallback(store) {
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(store));
}

export async function remember(category, key, value) {
  try {
    const data = await postJSON('/memory', { action: 'remember', category, key, value });
    if (data.success) return data;
  } catch (e) {
    /* no bridge reachable — fall through to local */
  }
  const store = readFallback();
  const cat = category || 'notes';
  store[cat] = store[cat] || {};
  store[cat][key] = value;
  writeFallback(store);
  return { success: true, message: `Remembered ${cat}:${key} (locally — no bridge connected)` };
}

export async function recall(category, query) {
  try {
    const data = await postJSON('/memory', { action: 'recall', category, query });
    if (data.success) return data;
  } catch (e) {
    /* no bridge reachable — fall through to local */
  }
  const store = readFallback();
  const facts = [];
  const cats = category ? [category] : Object.keys(store);
  for (const cat of cats) {
    const entries = store[cat] || {};
    for (const [key, value] of Object.entries(entries)) {
      if (query && !key.includes(query) && !String(value).includes(query)) continue;
      facts.push({ category: cat, key, value });
    }
  }
  return { success: true, facts };
}

export async function forget(category, key) {
  try {
    const data = await postJSON('/memory', { action: 'forget', category, key });
    if (data.success) return data;
  } catch (e) {
    /* no bridge reachable — fall through to local */
  }
  const store = readFallback();
  if (store[category]) delete store[category][key];
  writeFallback(store);
  return { success: true, message: `Forgot ${category}:${key} (locally)` };
}

export async function summary(limit = 15) {
  try {
    const data = await postJSON('/memory', { action: 'summary' });
    if (data.success) return data.summary || '';
  } catch (e) {
    /* no bridge reachable — fall through to local */
  }
  const store = readFallback();
  const parts = [];
  for (const [cat, entries] of Object.entries(store)) {
    for (const [key, value] of Object.entries(entries)) {
      parts.push(`[${cat}] ${key}: ${value}`);
    }
  }
  return parts.slice(0, limit).join('; ');
}

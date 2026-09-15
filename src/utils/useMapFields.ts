'use client';
import { useEffect, useRef, useState } from 'react';
import { readMapMemory, writeMapMemory } from './mapMemory';

export function useMapFields(key: string, values: Record<string, any>, setters: Record<string, (value: any) => void>, enabled = true) {
  const [ready, setReady] = useState(false);
  const latest = useRef(values);
  latest.current = values;
  useEffect(() => {
    if (!enabled) return;
    const params = new URLSearchParams(window.location.search);
    const explicit = ['id', 'mng', 'lat', 'lng', 'tab', 'section1', 'section2', 'keyword', 'author_name'].some(k => params.has(k));
    const saved = explicit ? null : readMapMemory(key);
    if (saved && typeof saved === 'object') for (const name of Object.keys(values)) {
      const value = saved[name], fallback = values[name];
      if (value === undefined) continue;
      const compatible = fallback === null ? value === null || typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value)) : Array.isArray(fallback) ? Array.isArray(value) && value.every(v => typeof v === 'string') : typeof value === typeof fallback;
      if (compatible) setters[name]?.(value);
    }
    setReady(true);
  }, [key, enabled]);
  const serialized = JSON.stringify(values);
  useEffect(() => {
    if (!ready || !enabled) return;
    const timer = setTimeout(() => writeMapMemory(key, latest.current), 250);
    return () => clearTimeout(timer);
  }, [key, ready, enabled, serialized]);
  useEffect(() => {
    if (!ready || !enabled) return;
    const flush = () => writeMapMemory(key, latest.current);
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); flush(); };
  }, [key, ready, enabled]);
}

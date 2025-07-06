'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from './store';

export function useIdleTimeout(timeoutInMs: number | null) {
  const logout = useAuthStore((state) => state.logout);
  // ** FIX: Initialize useRef with a default value of null **
  const timer = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    // Only set the timer if a valid, non-zero timeout is provided
    if (timeoutInMs && timeoutInMs > 0) {
        timer.current = setTimeout(logout, timeoutInMs);
    }
  }, [logout, timeoutInMs]);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    
    resetTimer();

    events.forEach(event => window.addEventListener(event, resetTimer));

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [resetTimer]);
}

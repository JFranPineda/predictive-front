import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import { clickEvent, EventQueue } from '../domain/tracking';
import { useReportActivityMutation } from '../infrastructure/endpoints';

const FLUSH_EVERY_MS = 4000;

/**
 * Mounted by the shell while the activity module is installed (Q20): every
 * click on something pressable and every page opened becomes a row of the
 * log. What is written into fields never leaves the browser.
 */
export default function ActivityTracker() {
  const [report] = useReportActivityMutation();
  const location = useLocation();
  const queue = useRef<EventQueue | null>(null);
  queue.current ??= new EventQueue((events) => report(events).unwrap());
  const path = useRef(location.pathname);
  path.current = location.pathname;

  useEffect(() => {
    const current = queue.current!;
    function onClick(event: MouseEvent) {
      const found = clickEvent(event.target, path.current);
      if (found) current.push(found);
    }
    function onHide() {
      if (document.visibilityState === 'hidden') void current.flush();
    }
    document.addEventListener('click', onClick, true);
    document.addEventListener('visibilitychange', onHide);
    const timer = window.setInterval(() => void current.flush(), FLUSH_EVERY_MS);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('visibilitychange', onHide);
      window.clearInterval(timer);
      void current.flush();
    };
  }, []);

  useEffect(() => {
    // The page's own title, once it has rendered.
    const timer = window.setTimeout(() => {
      const title = document.querySelector('main h1, h1')?.textContent ?? '';
      queue.current?.push({ kind: 'navigation', label: title.trim(), path: location.pathname });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  return null;
}

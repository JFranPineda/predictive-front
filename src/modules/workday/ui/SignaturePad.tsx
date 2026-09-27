import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@shared/ui/Button';

/**
 * A signature drawn with the finger, the stylus or the mouse (Q19). The
 * field tablet is the pen: nothing is printed, signed and scanned back.
 */
export function SignaturePad({ onChange }: { onChange: (signature: Blob | null) => void }) {
  const { t } = useTranslation('workday');
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    // Drawn at the screen's real density, or the line comes out blurred.
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = element.getBoundingClientRect();
    element.width = Math.max(1, Math.round(width * ratio));
    element.height = Math.max(1, Math.round(height * ratio));
    const context = element.getContext('2d');
    if (!context) return;
    context.scale(ratio, ratio);
    context.lineWidth = 2.2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#0f172a';
  }, []);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const context = event.currentTarget.getContext('2d');
    if (!context) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const { x, y } = point(event);
    context.beginPath();
    context.moveTo(x, y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const context = event.currentTarget.getContext('2d');
    if (!context) return;
    const { x, y } = point(event);
    context.lineTo(x, y);
    context.stroke();
    setEmpty(false);
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    canvas.current?.toBlob((blob) => onChange(blob), 'image/png');
  }

  function clear() {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) return;
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, element.width, element.height);
    context.restore();
    setEmpty(true);
    onChange(null);
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <canvas
          ref={canvas}
          aria-label={t('job.signHere')}
          className="h-40 w-full touch-none rounded-lg border-2 border-dashed border-slate-300 bg-white dark:border-slate-600"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
        {empty && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            {t('job.signHere')}
          </span>
        )}
        <span className="pointer-events-none absolute bottom-8 left-6 right-6 border-b border-slate-300" />
      </div>
      <Button variant="ghost" onClick={clear} disabled={empty}>
        {t('job.clearSignature')}
      </Button>
    </div>
  );
}

'use client';

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type SignaturePadHandle = {
  /** PNG do desenho (fundo transparente) ou null se estiver em branco. */
  toBlob: () => Promise<Blob | null>;
  clear: () => void;
  isEmpty: () => boolean;
};

type Point = { x: number; y: number };

type SignaturePadProps = {
  ref?: Ref<SignaturePadHandle>;
  disabled?: boolean;
};

export function SignaturePad({ ref, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const prevMidRef = useRef<Point | null>(null);
  const hasDrawnRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // (Re)dimensiona o bitmap conforme o tamanho CSS e o devicePixelRatio,
    // preservando o desenho atual — cobre resize da janela e troca de monitor.
    const setup = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.round(rect.width * dpr));
      const nextHeight = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width === nextWidth && canvas.height === nextHeight) return;

      const snapshot = hasDrawnRef.current ? canvas.toDataURL() : null;
      canvas.width = nextWidth;
      canvas.height = nextHeight;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1e3a8a';
      ctx.fillStyle = '#1e3a8a';

      if (snapshot) {
        const image = new Image();
        image.onload = () => ctx.drawImage(image, 0, 0, rect.width, rect.height);
        image.src = snapshot;
      }
    };

    setup();
    const observer = new ResizeObserver(setup);
    observer.observe(canvas);
    window.addEventListener('resize', setup);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', setup);
    };
  }, []);

  const markDrawn = () => {
    hasDrawnRef.current = true;
    setHasDrawn(true);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    drawingRef.current = false;
    lastPointRef.current = null;
    prevMidRef.current = null;
    hasDrawnRef.current = false;
    setHasDrawn(false);
  };

  useImperativeHandle(
    ref,
    () => ({
      toBlob: () =>
        new Promise<Blob | null>((resolve) => {
          const canvas = canvasRef.current;
          if (!canvas || !hasDrawnRef.current) {
            resolve(null);
            return;
          }
          canvas.toBlob((blob) => resolve(blob), 'image/png');
        }),
      clear,
      isEmpty: () => !hasDrawnRef.current,
    }),
    [],
  );

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    // Ignora cliques que não sejam o botão principal e um segundo toque
    // enquanto um traço está em andamento (multi-touch corromperia o traço).
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (drawingRef.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const point = getPoint(event);
    drawingRef.current = true;
    lastPointRef.current = point;
    prevMidRef.current = point;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return;
    const ctx = canvasRef.current?.getContext('2d');
    const last = lastPointRef.current;
    const prevMid = prevMidRef.current;
    if (!ctx || !last || !prevMid) return;

    const point = getPoint(event);
    const mid = { x: (last.x + point.x) / 2, y: (last.y + point.y) / 2 };

    // Curvas quadráticas entre pontos médios deixam o traço suave.
    ctx.beginPath();
    ctx.moveTo(prevMid.x, prevMid.y);
    ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y);
    ctx.stroke();

    lastPointRef.current = point;
    prevMidRef.current = mid;
    // Só conta como assinatura após um traço real (um toque parado não vale).
    markDrawn();
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
    prevMidRef.current = null;
  };

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-md border border-input bg-white">
        <canvas
          ref={canvasRef}
          className="h-40 w-full touch-none cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        {!hasDrawn ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
            Desenhe a assinatura aqui
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={clear}
        disabled={disabled || !hasDrawn}
      >
        <Eraser className="h-4 w-4" /> Limpar
      </Button>
    </div>
  );
}

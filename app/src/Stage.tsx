import { useLayoutEffect, useState, type ReactNode } from 'react';

const W = 1280;
const H = 800;

/** Renders the fixed 1280×800 design canvas, scaled to fit any landscape screen. */
export function Stage({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / W, window.innerHeight / H));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  return (
    <div className="viewport">
      <div className="stage" style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}

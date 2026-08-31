import type { ReactNode } from 'react';
import { SAFFRON } from '../data/seed';

/**
 * Recipe "photography": two overlapping translucent circles in a sunk well,
 * `mix-blend-mode: multiply`. A deliberate placeholder — swap the inner spans
 * for illustrated ingredient art when it exists, keeping the warm feel and
 * the same well geometry.
 */

type Variant = 'tile54' | 'tile46' | 'tile40';

const VARIANTS: Record<
  Variant,
  { box: number; radius: number; c: number; a: [number, number]; b: [number, number]; opacity: [number, number] }
> = {
  // Today's meals
  tile54: { box: 54, radius: 14, c: 24, a: [8, 12], b: [22, 20], opacity: [0.75, 0.75] },
  // Shelby sequence cards
  tile46: { box: 46, radius: 12, c: 21, a: [7, 10], b: [19, 17], opacity: [0.8, 0.6] },
  // Recipe picker sheet
  tile40: { box: 40, radius: 11, c: 18, a: [6, 9], b: [16, 14], opacity: [0.8, 0.8] },
};

export function CircleMark({
  variant,
  hueA,
  hueB = SAFFRON,
}: {
  variant: Variant;
  hueA: string;
  hueB?: string;
}) {
  const v = VARIANTS[variant];
  return (
    <span
      className="mark"
      style={{ width: v.box, height: v.box, borderRadius: v.radius }}
      aria-hidden="true"
    >
      <span
        style={{
          left: v.a[0],
          top: v.a[1],
          width: v.c,
          height: v.c,
          background: hueA,
          opacity: v.opacity[0],
        }}
      />
      <span
        style={{
          left: v.b[0],
          top: v.b[1],
          width: v.c,
          height: v.c,
          background: hueB,
          opacity: v.opacity[1],
        }}
      />
    </span>
  );
}

/** The 94px well at the top of a cookbook grid card. */
export function CardWell({
  hueA,
  hueB,
  children,
}: {
  hueA: string;
  hueB: string;
  children?: ReactNode;
}) {
  return (
    <span className="mark" style={{ height: 94, width: '100%', borderRadius: 0 }}>
      <span aria-hidden="true" style={{ left: 24, top: 22, width: 50, height: 50, background: hueA, opacity: 0.8 }} />
      <span aria-hidden="true" style={{ left: 52, top: 34, width: 50, height: 50, background: hueB, opacity: 0.8 }} />
      {children}
    </span>
  );
}

/** The 178px header well on recipe detail. */
export function DetailWell({
  hueA,
  hueB,
  children,
}: {
  hueA: string;
  hueB: string;
  children?: ReactNode;
}) {
  return (
    <div style={{ height: 178, background: '#F0E6D7', position: 'relative', overflow: 'hidden' }}>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 74,
          top: 26,
          width: 130,
          height: 130,
          borderRadius: '50%',
          background: hueA,
          mixBlendMode: 'multiply',
          opacity: 0.78,
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 150,
          top: 56,
          width: 130,
          height: 130,
          borderRadius: '50%',
          background: hueB,
          mixBlendMode: 'multiply',
          opacity: 0.78,
        }}
      />
      {children}
    </div>
  );
}

/** The three overlapping circles used as a wordmark and on sequence cards. */
export function TripleCircles({ size = 30, overlap = -12 }: { size?: number; overlap?: number }) {
  const hues = ['var(--terracotta)', 'var(--olive)', 'var(--saffron)'];
  return (
    <div style={{ display: 'flex', gap: 6 }} aria-hidden="true">
      {hues.map((h, i) => (
        <span
          key={h}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: h,
            opacity: 0.8,
            mixBlendMode: 'multiply',
            marginLeft: i === 0 ? 0 : overlap,
          }}
        />
      ))}
    </div>
  );
}

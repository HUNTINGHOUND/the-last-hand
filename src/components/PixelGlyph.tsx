import type { Move } from '../game';

export function PixelGlyph({ move = 0 }: { move?: Move }) {
  return <span className="move-glyph" style={{ backgroundPosition: `${move * 50}% 50%` }} aria-hidden="true" />;
}

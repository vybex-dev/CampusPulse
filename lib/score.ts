/**
 * Shared pure calculation of CampusPulse score from shares.
 * Usable on both server (Node.js) and browser (React). Zero dependencies.
 *
 * aE: avoidable electricity fraction (0..1)
 * aW: avoidable water fraction (0..1)
 * A: campus segregation accuracy percentage (0..100)
 */
export function scoreFromShares(
  aE: number,
  aW: number,
  A: number,
  ceilingE = 0.10,
  ceilingW = 0.20,
): {
  total: number;
  electricity: number;
  water: number;
  waste: number;
} {
  const clampAE = Math.max(0, aE);
  const clampAW = Math.max(0, aW);
  const clampA = Math.min(100, Math.max(0, A));

  const sE = 100 * (1 - Math.min(1, clampAE / ceilingE));
  const sW = 100 * (1 - Math.min(1, clampAW / ceilingW));
  const sWaste = clampA;

  const total = (sE + sW + sWaste) / 3;

  return {
    electricity: Number(sE.toFixed(1)),
    water: Number(sW.toFixed(1)),
    waste: Number(sWaste.toFixed(1)),
    total: Number(total.toFixed(1)),
  };
}

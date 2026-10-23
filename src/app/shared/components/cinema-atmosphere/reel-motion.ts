/** Keep the carousel phase continuous when the numbered selection wraps. */
export function nearestReelPhase(index: number, current: number, count: number): number {
  if (count < 2) return index;
  return index + Math.round((current - index) / count) * count;
}

export function reelPose(index: number, phase: number, count: number) {
  const angle = count > 1 ? (index - phase) * Math.PI * 2 / count : 0;
  return { x: Math.sin(angle) * 3.35, z: (Math.cos(angle) - 1) * 2.2, turn: -Math.sin(angle) * .62 };
}

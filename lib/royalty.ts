export function royaltyAtYear(y: number, launch: number, loe: number, min: number, max: number, ramp = 3): number {
  if (y < launch || y >= loe) return 0;
  if (y - launch >= ramp) return max;
  return min + ((max - min) * (y - launch)) / ramp;
}

export function averageRoyalty(launch: number, loe: number, min: number, max: number, ramp = 3): number {
  let sum = 0, n = 0;
  for (let y = launch; y < loe; y++) { sum += royaltyAtYear(y, launch, loe, min, max, ramp); n++; }
  return n ? sum / n : 0;
}

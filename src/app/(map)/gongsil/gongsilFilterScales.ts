export const MAEMAE_SCALE = [
  0, 10000000, 30000000, 50000000, 100000000, 200000000,
  300000000, 500000000, 700000000, 1000000000, 1500000000,
  2000000000, 3000000000, 4000000000, 5000000000,
];

export const DEPOSIT_SCALE = [
  0, 5000000, 10000000, 20000000, 30000000, 50000000,
  100000000, 150000000, 200000000, 300000000, 500000000,
  700000000, 1000000000, 1500000000, 2000000000,
];

export const RENT_SCALE = [
  0, 100000, 200000, 300000, 400000, 500000, 600000, 800000,
  1000000, 1200000, 1500000, 2000000, 3000000, 4000000, 5000000,
];

export const AREA_SCALE = [0, 10, 20, 30, 40, 50, 60, 70, 80, 100, 120, 150, 200, 300, 500, 1000];
export const YEAR_SCALE = [1960, 1970, 1980, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2022, 2024, 2026];
export const UNIT_SCALE = [0, 50, 100, 200, 300, 500, 700, 1000, 1500, 2000, 2500, 3000, 4000, 5000];

export function getScaleIndex(value: number | null, scale: number[], isMax: boolean): number {
  if (value === null) return isMax ? scale.length - 1 : 0;

  let closestIndex = 0;
  let minimumDifference = Infinity;
  for (let index = 0; index < scale.length; index += 1) {
    const difference = Math.abs(scale[index] - value);
    if (difference < minimumDifference) {
      minimumDifference = difference;
      closestIndex = index;
    }
  }
  return closestIndex;
}

export const COHORT_01_NUMBER = 1;
export const SEAT_CAP = 10;
// Sep 10 2026 23:59:59 WAT (UTC+1)
export const EARLY_BIRD_DEADLINE = new Date("2026-09-10T22:59:59.000Z");
export const EARLY_BIRD_AMOUNT_KOBO = 5_000_000; // ₦50,000
export const REGULAR_AMOUNT_KOBO = 7_000_000;    // ₦70,000

export function currentAmountKobo(): number {
  return Date.now() < EARLY_BIRD_DEADLINE.getTime()
    ? EARLY_BIRD_AMOUNT_KOBO
    : REGULAR_AMOUNT_KOBO;
}

export function isEarlyBirdActive(): boolean {
  return Date.now() < EARLY_BIRD_DEADLINE.getTime();
}

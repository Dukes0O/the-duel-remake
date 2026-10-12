// Approved GP position pay; the existing career owns banking and duplicate keys.
export const GRAND_PRIX_SHARES = Object.freeze([1, .75, .55, .40, .30, .20, .15, .10]);
export function validGrandPrixPosition(result) {
  const size = result.fieldSize ?? 8;
  return Number.isSafeInteger(size) && size >= 2 && size <= 8 &&
    Number.isSafeInteger(result.position) && result.position >= 1 && result.position <= size &&
    result.won === (result.position === 1);
}
export function grandPrixPositionPay(result, difficultyBase) {
  return validGrandPrixPosition(result)
    ? Math.round(difficultyBase * GRAND_PRIX_SHARES[result.position - 1]) : 0;
}
export function grandPrixSnowmanPay(result) {
  return Number.isSafeInteger(result.snowmen) && result.snowmen >= 0
    ? Math.min(10, result.snowmen) * 25 : 0;
}

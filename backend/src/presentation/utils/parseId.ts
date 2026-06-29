/**
 * Parse a value that must represent a strictly-positive integer (route param or body field).
 * Returns the number, or `null` when the value is not a valid positive integer.
 *
 * Rejects the cases that `parseInt` would silently accept:
 *  - partial-numeric strings: "12abc" -> null (parseInt would return 12)
 *  - non-integers: 1.5 / "1.5" -> null
 *  - zero and negatives: 0, -3 -> null
 */
// Number.MAX_SAFE_INTEGER as a literal (the es5 type lib does not expose it).
// Above this, distinct integers can round to the same `number`, so two different
// ids could collide and hit the wrong record.
const MAX_SAFE = 9007199254740991;

const isSafePositiveInt = (n: number): boolean =>
    isFinite(n) && n > 0 && n <= MAX_SAFE && n % 1 === 0;

export const parsePositiveInt = (value: unknown): number | null => {
    if (typeof value === 'number') {
        return isSafePositiveInt(value) ? value : null;
    }
    if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
        const parsed = Number(value);
        return isSafePositiveInt(parsed) ? parsed : null;
    }
    return null;
};

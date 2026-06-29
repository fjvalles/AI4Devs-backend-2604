/**
 * Parse a value that must represent a strictly-positive integer (route param or body field).
 * Returns the number, or `null` when the value is not a valid positive integer.
 *
 * Rejects the cases that `parseInt` would silently accept:
 *  - partial-numeric strings: "12abc" -> null (parseInt would return 12)
 *  - non-integers: 1.5 / "1.5" -> null
 *  - zero and negatives: 0, -3 -> null
 */
export const parsePositiveInt = (value: unknown): number | null => {
    if (typeof value === 'number') {
        return isFinite(value) && value > 0 && value % 1 === 0 ? value : null;
    }
    if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
        const parsed = Number(value);
        return parsed > 0 ? parsed : null;
    }
    return null;
};

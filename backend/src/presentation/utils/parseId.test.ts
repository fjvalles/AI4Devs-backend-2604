import { parsePositiveInt } from './parseId';

describe('parsePositiveInt', () => {
    it.each([
        ['5', 5],
        ['  12  ', 12],
        ['007', 7],
        [42, 42],
    ])('acepta %p como %p', (input, expected) => {
        expect(parsePositiveInt(input)).toBe(expected);
    });

    it.each([
        ['12abc'],
        ['abc'],
        ['0'],
        ['-3'],
        ['1.5'],
        [''],
        [0],
        [-1],
        [1.5],
        [NaN],
        [null],
        [undefined],
        [{}],
    ])('rechaza %p devolviendo null', (input) => {
        expect(parsePositiveInt(input as unknown)).toBeNull();
    });
});

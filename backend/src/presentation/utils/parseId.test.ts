import { parsePositiveInt } from './parseId';

describe('parsePositiveInt', () => {
    it.each([
        ['5', 5],
        ['  12  ', 12],
        ['007', 7],
        [42, 42],
        [9007199254740991, 9007199254740991], // Number.MAX_SAFE_INTEGER (límite aceptado)
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
        [9007199254740992], // MAX_SAFE_INTEGER + 1 (entero inseguro)
        ['9999999999999999999'], // string fuera del rango seguro
        [null],
        [undefined],
        [{}],
    ])('rechaza %p devolviendo null', (input) => {
        expect(parsePositiveInt(input as unknown)).toBeNull();
    });
});

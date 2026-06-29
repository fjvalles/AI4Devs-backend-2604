const mockPositionFindUnique = jest.fn();
const mockApplicationFindMany = jest.fn();

jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
        position: { findUnique: mockPositionFindUnique },
        application: { findMany: mockApplicationFindMany },
    })),
}));

import { getCandidatesByPosition } from './positionService';

describe('getCandidatesByPosition', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('mapea cada candidato con nombre completo, fase actual y media de score (ignorando nulls)', async () => {
        mockPositionFindUnique.mockResolvedValue({ id: 1 });
        mockApplicationFindMany.mockResolvedValue([
            {
                id: 10,
                candidate: { id: 5, firstName: 'John', lastName: 'Doe' },
                interviewStep: { id: 2, name: 'Technical Interview' },
                interviews: [{ score: 4 }, { score: 5 }, { score: null }],
            },
        ]);

        const result = await getCandidatesByPosition(1);

        expect(result).toEqual([
            {
                applicationId: 10,
                candidateId: 5,
                fullName: 'John Doe',
                currentInterviewStep: { id: 2, name: 'Technical Interview' },
                averageScore: 4.5,
            },
        ]);
    });

    it('devuelve averageScore null cuando no hay entrevistas con score', async () => {
        mockPositionFindUnique.mockResolvedValue({ id: 1 });
        mockApplicationFindMany.mockResolvedValue([
            {
                id: 11,
                candidate: { id: 6, firstName: 'Jane', lastName: 'Roe' },
                interviewStep: { id: 1, name: 'Phone Screen' },
                interviews: [],
            },
        ]);

        const result = await getCandidatesByPosition(1);

        expect(result[0].averageScore).toBeNull();
    });

    it('devuelve un array vacío si la posición no tiene candidatos', async () => {
        mockPositionFindUnique.mockResolvedValue({ id: 1 });
        mockApplicationFindMany.mockResolvedValue([]);

        const result = await getCandidatesByPosition(1);

        expect(result).toEqual([]);
    });

    it('lanza un error con status 404 si la posición no existe', async () => {
        mockPositionFindUnique.mockResolvedValue(null);

        await expect(getCandidatesByPosition(999)).rejects.toMatchObject({ status: 404 });
        expect(mockApplicationFindMany).not.toHaveBeenCalled();
    });
});

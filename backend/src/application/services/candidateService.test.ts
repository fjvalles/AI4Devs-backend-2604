const mockApplicationFindUnique = jest.fn();
const mockInterviewStepFindUnique = jest.fn();
const mockApplicationUpdateMany = jest.fn();
const mockApplicationFindUniqueOrThrow = jest.fn();

jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
        application: {
            findUnique: mockApplicationFindUnique,
            updateMany: mockApplicationUpdateMany,
            findUniqueOrThrow: mockApplicationFindUniqueOrThrow,
        },
        interviewStep: { findUnique: mockInterviewStepFindUnique },
    })),
    Prisma: {
        PrismaClientInitializationError: class PrismaClientInitializationError extends Error {},
    },
}));

import { updateCandidateStage } from './candidateService';

describe('updateCandidateStage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('actualiza la fase con un write atómico cuando la application es del candidato y el step pertenece al flujo', async () => {
        mockApplicationFindUnique.mockResolvedValue({ id: 10, candidateId: 5, position: { interviewFlowId: 1 } });
        mockInterviewStepFindUnique.mockResolvedValue({ id: 3, interviewFlowId: 1 });
        mockApplicationUpdateMany.mockResolvedValue({ count: 1 });
        mockApplicationFindUniqueOrThrow.mockResolvedValue({
            id: 10,
            currentInterviewStep: 3,
            interviewStep: { id: 3, name: 'Final Interview' },
        });

        const result = await updateCandidateStage(5, 10, 3);

        // ownership constraint must be part of the WHERE of the write
        expect(mockApplicationUpdateMany).toHaveBeenCalledWith({
            where: { id: 10, candidateId: 5 },
            data: { currentInterviewStep: 3 },
        });
        expect(result.currentInterviewStep).toBe(3);
    });

    it('lanza 404 si el write afecta 0 filas (carrera: la app cambió de dueño)', async () => {
        mockApplicationFindUnique.mockResolvedValue({ id: 10, candidateId: 5, position: { interviewFlowId: 1 } });
        mockInterviewStepFindUnique.mockResolvedValue({ id: 3, interviewFlowId: 1 });
        mockApplicationUpdateMany.mockResolvedValue({ count: 0 });

        await expect(updateCandidateStage(5, 10, 3)).rejects.toMatchObject({ status: 404 });
        expect(mockApplicationFindUniqueOrThrow).not.toHaveBeenCalled();
    });

    it('lanza 404 si la application no existe', async () => {
        mockApplicationFindUnique.mockResolvedValue(null);

        await expect(updateCandidateStage(5, 999, 3)).rejects.toMatchObject({ status: 404 });
        expect(mockApplicationUpdateMany).not.toHaveBeenCalled();
    });

    it('lanza 404 si la application pertenece a otro candidato', async () => {
        mockApplicationFindUnique.mockResolvedValue({ id: 10, candidateId: 99, position: { interviewFlowId: 1 } });

        await expect(updateCandidateStage(5, 10, 3)).rejects.toMatchObject({ status: 404 });
        expect(mockApplicationUpdateMany).not.toHaveBeenCalled();
    });

    it('lanza 404 si el interview step no existe', async () => {
        mockApplicationFindUnique.mockResolvedValue({ id: 10, candidateId: 5, position: { interviewFlowId: 1 } });
        mockInterviewStepFindUnique.mockResolvedValue(null);

        await expect(updateCandidateStage(5, 10, 404)).rejects.toMatchObject({ status: 404 });
        expect(mockApplicationUpdateMany).not.toHaveBeenCalled();
    });

    it('lanza 400 si el step pertenece a otro interview flow', async () => {
        mockApplicationFindUnique.mockResolvedValue({ id: 10, candidateId: 5, position: { interviewFlowId: 1 } });
        mockInterviewStepFindUnique.mockResolvedValue({ id: 7, interviewFlowId: 2 });

        await expect(updateCandidateStage(5, 10, 7)).rejects.toMatchObject({ status: 400 });
        expect(mockApplicationUpdateMany).not.toHaveBeenCalled();
    });
});

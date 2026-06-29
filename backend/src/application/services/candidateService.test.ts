const mockApplicationFindUnique = jest.fn();
const mockInterviewStepFindUnique = jest.fn();
const mockApplicationUpdate = jest.fn();

jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
        application: {
            findUnique: mockApplicationFindUnique,
            update: mockApplicationUpdate,
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

    it('actualiza la fase cuando la application pertenece al candidato y el step pertenece al flujo', async () => {
        mockApplicationFindUnique.mockResolvedValue({ id: 10, candidateId: 5, position: { interviewFlowId: 1 } });
        mockInterviewStepFindUnique.mockResolvedValue({ id: 3, interviewFlowId: 1 });
        mockApplicationUpdate.mockResolvedValue({
            id: 10,
            currentInterviewStep: 3,
            interviewStep: { id: 3, name: 'Final Interview' },
        });

        const result = await updateCandidateStage(5, 10, 3);

        expect(mockApplicationUpdate).toHaveBeenCalledWith({
            where: { id: 10 },
            data: { currentInterviewStep: 3 },
            include: { interviewStep: { select: { id: true, name: true } } },
        });
        expect(result.currentInterviewStep).toBe(3);
    });

    it('lanza 404 si la application no existe', async () => {
        mockApplicationFindUnique.mockResolvedValue(null);

        await expect(updateCandidateStage(5, 999, 3)).rejects.toMatchObject({ status: 404 });
        expect(mockApplicationUpdate).not.toHaveBeenCalled();
    });

    it('lanza 404 si la application pertenece a otro candidato', async () => {
        mockApplicationFindUnique.mockResolvedValue({ id: 10, candidateId: 99, position: { interviewFlowId: 1 } });

        await expect(updateCandidateStage(5, 10, 3)).rejects.toMatchObject({ status: 404 });
        expect(mockApplicationUpdate).not.toHaveBeenCalled();
    });

    it('lanza 404 si el interview step no existe', async () => {
        mockApplicationFindUnique.mockResolvedValue({ id: 10, candidateId: 5, position: { interviewFlowId: 1 } });
        mockInterviewStepFindUnique.mockResolvedValue(null);

        await expect(updateCandidateStage(5, 10, 404)).rejects.toMatchObject({ status: 404 });
        expect(mockApplicationUpdate).not.toHaveBeenCalled();
    });

    it('lanza 400 si el step pertenece a otro interview flow', async () => {
        mockApplicationFindUnique.mockResolvedValue({ id: 10, candidateId: 5, position: { interviewFlowId: 1 } });
        mockInterviewStepFindUnique.mockResolvedValue({ id: 7, interviewFlowId: 2 });

        await expect(updateCandidateStage(5, 10, 7)).rejects.toMatchObject({ status: 400 });
        expect(mockApplicationUpdate).not.toHaveBeenCalled();
    });
});

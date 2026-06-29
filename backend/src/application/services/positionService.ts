import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CandidateInProcess {
    applicationId: number;
    candidateId: number;
    fullName: string;
    currentInterviewStep: { id: number; name: string };
    averageScore: number | null;
}

/**
 * Devuelve todos los candidatos (aplicaciones) en proceso para una posición.
 * Por cada candidato: nombre completo, fase actual del proceso y puntuación media.
 *
 * @throws Error con `status = 404` si la posición no existe.
 */
export const getCandidatesByPosition = async (
    positionId: number
): Promise<CandidateInProcess[]> => {
    const position = await prisma.position.findUnique({ where: { id: positionId } });
    if (!position) {
        const error: any = new Error('Position not found');
        error.status = 404;
        throw error;
    }

    const applications = await prisma.application.findMany({
        where: { positionId },
        include: {
            candidate: { select: { id: true, firstName: true, lastName: true } },
            interviewStep: { select: { id: true, name: true } },
            interviews: { select: { score: true } },
        },
    });

    return applications.map((application): CandidateInProcess => {
        // `score` es nullable: ignoramos las entrevistas sin puntuación.
        const scores = application.interviews
            .map((interview) => interview.score)
            .filter((score): score is number => score !== null && score !== undefined);

        const averageScore =
            scores.length > 0
                ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
                : null;

        return {
            applicationId: application.id,
            candidateId: application.candidate.id,
            fullName: `${application.candidate.firstName} ${application.candidate.lastName}`,
            currentInterviewStep: {
                id: application.interviewStep.id,
                name: application.interviewStep.name,
            },
            averageScore,
        };
    });
};

import { PrismaClient } from '@prisma/client';
import { Candidate } from '../../domain/models/Candidate';
import { validateCandidateData } from '../validator';
import { Education } from '../../domain/models/Education';
import { WorkExperience } from '../../domain/models/WorkExperience';
import { Resume } from '../../domain/models/Resume';

const prisma = new PrismaClient();

export const addCandidate = async (candidateData: any) => {
    try {
        validateCandidateData(candidateData); // Validar los datos del candidato
    } catch (error: any) {
        throw new Error(error);
    }

    const candidate = new Candidate(candidateData); // Crear una instancia del modelo Candidate
    try {
        const savedCandidate = await candidate.save(); // Guardar el candidato en la base de datos
        const candidateId = savedCandidate.id; // Obtener el ID del candidato guardado

        // Guardar la educación del candidato
        if (candidateData.educations) {
            for (const education of candidateData.educations) {
                const educationModel = new Education(education);
                educationModel.candidateId = candidateId;
                await educationModel.save();
                candidate.education.push(educationModel);
            }
        }

        // Guardar la experiencia laboral del candidato
        if (candidateData.workExperiences) {
            for (const experience of candidateData.workExperiences) {
                const experienceModel = new WorkExperience(experience);
                experienceModel.candidateId = candidateId;
                await experienceModel.save();
                candidate.workExperience.push(experienceModel);
            }
        }

        // Guardar los archivos de CV
        if (candidateData.cv && Object.keys(candidateData.cv).length > 0) {
            const resumeModel = new Resume(candidateData.cv);
            resumeModel.candidateId = candidateId;
            await resumeModel.save();
            candidate.resumes.push(resumeModel);
        }
        return savedCandidate;
    } catch (error: any) {
        if (error.code === 'P2002') {
            // Unique constraint failed on the fields: (`email`)
            throw new Error('The email already exists in the database');
        } else {
            throw error;
        }
    }
};

export const findCandidateById = async (id: number): Promise<Candidate | null> => {
    try {
        const candidate = await Candidate.findOne(id); // Cambio aquí: pasar directamente el id
        return candidate;
    } catch (error) {
        console.error('Error al buscar el candidato:', error);
        throw new Error('Error al recuperar el candidato');
    }
};

/**
 * Actualiza la fase actual (`currentInterviewStep`) de la aplicación de un candidato.
 * Decisión de diseño: `:id` de la ruta es el candidateId; el body aporta `applicationId`
 * para desambiguar (un candidato puede tener varias aplicaciones, una por posición).
 *
 * @throws Error con `status = 404` si la aplicación no pertenece al candidato o el step no existe.
 */
export const updateCandidateStage = async (
    candidateId: number,
    applicationId: number,
    newInterviewStepId: number
) => {
    const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: { position: { select: { interviewFlowId: true } } },
    });
    if (!application || application.candidateId !== candidateId) {
        const error: any = new Error('Application not found for the given candidate');
        error.status = 404;
        throw error;
    }

    const interviewStep = await prisma.interviewStep.findUnique({
        where: { id: newInterviewStepId },
        select: { id: true, interviewFlowId: true },
    });
    if (!interviewStep) {
        const error: any = new Error('Interview step not found');
        error.status = 404;
        throw error;
    }

    // The target step must belong to the same interview flow as the position,
    // otherwise the candidate would be moved to a stage outside its process.
    if (interviewStep.interviewFlowId !== application.position.interviewFlowId) {
        const error: any = new Error("Interview step does not belong to the position's interview flow");
        error.status = 400;
        throw error;
    }

    return prisma.application.update({
        where: { id: applicationId },
        data: { currentInterviewStep: newInterviewStepId },
        include: { interviewStep: { select: { id: true, name: true } } },
    });
};

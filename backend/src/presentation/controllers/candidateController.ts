import { Request, Response } from 'express';
import {
    addCandidate,
    findCandidateById,
    updateCandidateStage as updateCandidateStageService,
} from '../../application/services/candidateService';
import { parsePositiveInt } from '../utils/parseId';

export const addCandidateController = async (req: Request, res: Response) => {
    try {
        const candidateData = req.body;
        const candidate = await addCandidate(candidateData);
        res.status(201).json({ message: 'Candidate added successfully', data: candidate });
    } catch (error: unknown) {
        if (error instanceof Error) {
            res.status(400).json({ message: 'Error adding candidate', error: error.message });
        } else {
            res.status(400).json({ message: 'Error adding candidate', error: 'Unknown error' });
        }
    }
};

export const getCandidateById = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }
        const candidate = await findCandidateById(id);
        if (!candidate) {
            return res.status(404).json({ error: 'Candidate not found' });
        }
        res.json(candidate);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * PUT /candidates/:id/stage
 * Actualiza la fase del proceso de entrevista de un candidato (mover tarjeta en el kanban).
 * Body: { applicationId: number, currentInterviewStep: number }
 */
export const updateCandidateStage = async (req: Request, res: Response) => {
    try {
        const candidateId = parsePositiveInt(req.params.id);
        if (candidateId === null) {
            return res.status(400).json({ error: 'Invalid candidate ID format' });
        }

        const applicationId = parsePositiveInt(req.body?.applicationId);
        const currentInterviewStep = parsePositiveInt(req.body?.currentInterviewStep);
        if (applicationId === null || currentInterviewStep === null) {
            return res.status(400).json({
                error: 'applicationId and currentInterviewStep are required and must be positive integers',
            });
        }

        const updated = await updateCandidateStageService(
            candidateId,
            applicationId,
            currentInterviewStep
        );
        res.status(200).json({ message: 'Candidate stage updated successfully', data: updated });
    } catch (error: any) {
        if (error?.status === 400 || error?.status === 404) {
            return res.status(error.status).json({ error: error.message });
        }
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export { addCandidate };
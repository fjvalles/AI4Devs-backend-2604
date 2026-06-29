import { Request, Response } from 'express';
import { getCandidatesByPosition } from '../../application/services/positionService';
import { parsePositiveInt } from '../utils/parseId';

/**
 * GET /positions/:id/candidates
 * Lista los candidatos en proceso de una posición para la vista kanban.
 */
export const getCandidatesByPositionController = async (req: Request, res: Response) => {
    try {
        const positionId = parsePositiveInt(req.params.id);
        if (positionId === null) {
            return res.status(400).json({ error: 'Invalid position ID format' });
        }

        const candidates = await getCandidatesByPosition(positionId);
        res.status(200).json(candidates);
    } catch (error: any) {
        if (error?.status === 400 || error?.status === 404) {
            return res.status(error.status).json({ error: error.message });
        }
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

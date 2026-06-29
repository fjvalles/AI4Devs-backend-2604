import { Router } from 'express';
import { getCandidatesByPositionController } from '../presentation/controllers/positionController';

const router = Router();

// GET /positions/:id/candidates → candidatos en proceso de una posición
router.get('/:id/candidates', getCandidatesByPositionController);

export default router;

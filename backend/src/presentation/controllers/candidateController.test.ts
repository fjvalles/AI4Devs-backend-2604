jest.mock('../../application/services/candidateService', () => ({
    addCandidate: jest.fn(),
    findCandidateById: jest.fn(),
    updateCandidateStage: jest.fn(),
}));

import { updateCandidateStage } from './candidateController';
import { updateCandidateStage as updateCandidateStageService } from '../../application/services/candidateService';

const mockRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('updateCandidateStage controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('400 si el candidate id no es numérico', async () => {
        const req: any = { params: { id: 'abc' }, body: { applicationId: 10, currentInterviewStep: 2 } };
        const res = mockRes();

        await updateCandidateStage(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(updateCandidateStageService).not.toHaveBeenCalled();
    });

    it.each(['1abc', '0', '-3', '1.5'])('400 si el candidate id es malformado o no positivo (%s)', async (id) => {
        const req: any = { params: { id }, body: { applicationId: 10, currentInterviewStep: 2 } };
        const res = mockRes();

        await updateCandidateStage(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(updateCandidateStageService).not.toHaveBeenCalled();
    });

    it('400 si los ids del body no son enteros positivos', async () => {
        const req: any = { params: { id: '5' }, body: { applicationId: 0, currentInterviewStep: -2 } };
        const res = mockRes();

        await updateCandidateStage(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(updateCandidateStageService).not.toHaveBeenCalled();
    });

    it('400 si faltan campos en el body', async () => {
        const req: any = { params: { id: '5' }, body: {} };
        const res = mockRes();

        await updateCandidateStage(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(updateCandidateStageService).not.toHaveBeenCalled();
    });

    it('200 y delega en el service con argumentos parseados', async () => {
        (updateCandidateStageService as jest.Mock).mockResolvedValue({ id: 10, currentInterviewStep: 2 });
        const req: any = { params: { id: '5' }, body: { applicationId: 10, currentInterviewStep: 2 } };
        const res = mockRes();

        await updateCandidateStage(req, res);

        expect(updateCandidateStageService).toHaveBeenCalledWith(5, 10, 2);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('404 cuando el service lanza un error con status 404', async () => {
        (updateCandidateStageService as jest.Mock).mockRejectedValue(
            Object.assign(new Error('Application not found for the given candidate'), { status: 404 })
        );
        const req: any = { params: { id: '5' }, body: { applicationId: 10, currentInterviewStep: 2 } };
        const res = mockRes();

        await updateCandidateStage(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });
});

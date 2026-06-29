jest.mock('../../application/services/positionService', () => ({
    getCandidatesByPosition: jest.fn(),
}));

import { getCandidatesByPositionController } from './positionController';
import { getCandidatesByPosition } from '../../application/services/positionService';

const mockRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('getCandidatesByPositionController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it.each(['abc', '12abc', '0', '-1', '1.5'])('400 si el position id es inválido (%s)', async (id) => {
        const req: any = { params: { id } };
        const res = mockRes();

        await getCandidatesByPositionController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(getCandidatesByPosition).not.toHaveBeenCalled();
    });

    it('200 con la lista de candidatos', async () => {
        const candidates = [
            { applicationId: 10, candidateId: 5, fullName: 'John Doe', currentInterviewStep: { id: 2, name: 'Tech' }, averageScore: 4.5 },
        ];
        (getCandidatesByPosition as jest.Mock).mockResolvedValue(candidates);
        const req: any = { params: { id: '1' } };
        const res = mockRes();

        await getCandidatesByPositionController(req, res);

        expect(getCandidatesByPosition).toHaveBeenCalledWith(1);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(candidates);
    });

    it('404 cuando el service lanza un error con status 404', async () => {
        (getCandidatesByPosition as jest.Mock).mockRejectedValue(
            Object.assign(new Error('Position not found'), { status: 404 })
        );
        const req: any = { params: { id: '999' } };
        const res = mockRes();

        await getCandidatesByPositionController(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });
});

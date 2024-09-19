import { Router } from 'express';
import diagramController from '../controllers/diagram.controller';

const router = Router();

router.get('/', diagramController.getDiagrams);
router.get('/:id', diagramController.getDiagramById);
router.post('/', diagramController.createDiagram);
router.put('/:id', diagramController.updateDiagramUML);
router.put('/name/:id', diagramController.updateDiagramName);
router.put('/participant/:id', diagramController.addParticipant);
router.delete('/:id/:userId', diagramController.deleteDiagram);
router.delete('/participant/:id', diagramController.deleteParticipant);
router.get('/user/:id', diagramController.getDiagramsByUser);

/* Invitacion */
router.post('/user/invite/:id', diagramController.createInvitacionDiagrama);

export default router;
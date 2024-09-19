import { Request, Response } from "express";
import diagramService from "../services/diagram.service";

const getDiagrams = async (req: Request, res: Response) => {
    try {
        const diagrams = await diagramService.getDiagrams();
        return res.status(200).json(diagrams);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Ocurrio un error en el server" });
    }
}

const getDiagramById = async (req: Request, res: Response) => {
    try {
        const diagram = await diagramService.getDiagramById(req.params.id);
        return res.status(200).json(diagram);
    } catch (error) {
        return res.status(500).json({ message: "Ocurrio un error en el server" });
    }
}

const createDiagram = async (req: Request, res: Response) => {
    try {
        const diagram = await diagramService.createDiagram(req.body);
        return res.status(200).json(diagram);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Ocurrio un error en el server" });
    }
}

const updateDiagramUML = async (req: Request, res: Response) => {
    try {
        console.log(req.body);
        const diagram = await diagramService.updateDiagramUML(req.params.id, req.body);
        return res.status(200).json(diagram);
    } catch (error) {
        return res.status(500).json({ message: "Ocurrio un error en el server" });
    }
}

const updateDiagramName = async (req: Request, res: Response) => {
    try {
        const diagram = await diagramService.updateDiagramName(req.params.id, req.body);
        return res.status(200).json(diagram);
    } catch (error) {
        return res.status(500).json({ message: "Ocurrio un error en el server" });
    }
}

const addParticipant = async (req: Request, res: Response) => {
    try {
        const diagram = await diagramService.addParticipant(req.params.id, req.body);
        return res.status(200).json(diagram);
    } catch (error) {
        return res.status(500).json({ message: "Ocurrio un error en el server" });
    }
}

const deleteDiagram = async (req: Request, res: Response) => {
    try {
        console.log(req.params);
        const diagram = await diagramService.deleteDiagram(req.params.id, req.params.userId);
        return res.status(200).json(diagram);
    } catch (error) {
        return res.status(500).json({ message: "Ocurrio un error en el server" });
    }
}

const deleteParticipant = async (req: Request, res: Response) => {
    try {
        const diagram = await diagramService.deleteParticipant(req.params.id, req.body);
        return res.status(200).json(diagram);
    } catch (error) {
        return res.status(500).json({ message: "Ocurrio un error en el server" });
    }
}

const getDiagramsByUser = async (req: Request, res: Response) => {
    try {
        const diagrams = await diagramService.getDiagramsByUser(req.params.id);
        return res.status(200).json(diagrams);
    } catch (error) {
        return res.status(500).json({ message: "Ocurrio un error en el server" });
    }
}

const createInvitacionDiagrama = async (req: Request, res: Response) => {
    try {
        console.log(req.body);
        const diagram = await diagramService.createInvitacionDiagrama(req.params.id, req.body);
        return res.status(200).json(diagram);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Ocurrio un error en el server" });
    }
}



export default {
    getDiagrams,
    getDiagramById,
    createDiagram,
    updateDiagramUML,
    updateDiagramName,
    addParticipant,
    deleteDiagram,
    deleteParticipant,
    getDiagramsByUser,
    createInvitacionDiagrama,
}
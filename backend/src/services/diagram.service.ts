import diagramModel from "../models/diagram.model";
import { Diagram } from "../interface/diagram.interface";
import { io } from "../index";
import { generateQR } from "../utils/qr.utils";
import { transport } from "../config/nodemailer";
import userModel from "../models/user.model";
import { htmlTemplateEvent } from "../utils/htmlTemplate.utils";

const getDiagrams = async () => {
    return await diagramModel.find();
}

const getDiagramById = async (id: string) => {
    return await diagramModel.findById(id).populate("participantes anfitrion");
}

const createDiagram = async (diagram: Diagram) => {
    return await diagramModel.create({
        name: diagram.name,
        anfitrion: diagram.anfitrion,
        plantUML: `@startuml
                    class User {
                        name
                    }
                @enduml`,
        participantes: [],
    });
}

const updateDiagramUML = async (id: string, diagram: Diagram) => {
    console.log(diagram);
    const diagramUML = await diagramModel.findById(id);
    diagramUML!.plantUML = diagram.plantUML;
    diagramUML!.name = diagram.name;
    diagramUML!.participantes = diagram.participantes;
    /* console.log(diagramUML); */
    io.emit("updateDiagram", diagramUML);
    return await diagramUML!.save();
}

const updateDiagramName = async (id: string, diagram: Diagram) => {
    const diagramName = await diagramModel.findById(id);
    diagramName!.name = diagram.name;
    return await diagramName!.save();
}

const addParticipant = async (id: string, diagram: Diagram) => {
    const diagramParticipant = await diagramModel.findById(id);
    /* diagramParticipant.participantes.push(diagram.participantes[0]);
    return await diagramParticipant!.save(); */
    if (diagramParticipant != null) {
        if (diagramParticipant.participantes.includes(diagram.participantes[0])) {
            return { message: "Ya estas participando en este diagrama" };
        } else {
            diagramParticipant.participantes.push(diagram.participantes[0]);
            return await diagramParticipant!.save();
        }
    } else {
        return { message: "No existe el diagrama" };
    }
}

const deleteDiagram = async (id: string, userId: string) => {
    console.log(id);
    console.log(userId);

    // Buscar el diagrama y poblar el campo anfitrion para acceder al _id
    const diagram = await diagramModel.findById(id).populate('anfitrion').exec();

    if (!diagram) {
        throw new Error("Diagrama no encontrado");
    }

    // Verificar si el anfitrion es el que desea eliminar
    if (diagram.anfitrion && (diagram.anfitrion as any)._id.toString() === userId) {
        await diagramModel.findByIdAndDelete(id);
        console.log("Diagrama eliminado");
        return { message: "Diagrama eliminado" };
    }

    throw new Error("No eres el anfitrion");
}


const deleteParticipant = async (id: string, diagram: Diagram) => {
    const diagramParticipant = await diagramModel.findById(id);
    const index = diagramParticipant!.participantes.indexOf(diagram.participantes[0]);
    diagramParticipant!.participantes.splice(index, 1);
    return await diagramParticipant!.save();
}

const getDiagramsByUser = async (id: string) => {
    const diagrams = await diagramModel.find({
        $or: [
            { anfitrion: id },
            { participantes: { $in: [id] } }
        ]
    }).select("-plantUML").populate("participantes anfitrion");
    console.log(diagrams);
    return diagrams;
}

const createInvitacionDiagrama = async (id: string, diagram: Diagram) => {
    console.log(diagram);
    await updateDiagramUML(id, diagram);
    const diagrama = await diagramModel.findById(id);
    const userIdParticipante = diagram.participantes[0];
    const userParticipante = await userModel.findById(userIdParticipante);
    const url = `http://137.184.205.247:5173/private/diagrams/${id}`;
    const qr = await generateQR({ url });
    const mailOptions = await transport.sendMail({
        from: '"Marco David Toledo 🌀" <marcotoledo@midominio.com>',
        to: userParticipante!.email,
        subject: `Invitacion al la pizarra de trabajo: ${diagrama?.name}`,
        html: htmlTemplateEvent({
            _id: diagrama?._id,
            name: diagrama?.name,
            qr: qr,
        }, url),
        attachments: [{ filename: `QR-${diagrama?.name}`, path: `${qr}` }],
    });
    console.log(mailOptions);
    return mailOptions;
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
    createInvitacionDiagrama
}
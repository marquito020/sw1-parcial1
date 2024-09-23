import userModel from "../models/user.model";
export interface Diagram {
    _id?: string;
    name: string;
    plantUML?: string;
    anfitrion: typeof userModel;
    qr?: string;
    participantes: string[];
    createdAt: string;
    updatedAt: string;
}
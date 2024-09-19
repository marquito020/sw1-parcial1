export interface Diagram {
    _id?: string;
    name: string;
    plantUML?: string;
    anfitrion: string;
    qr?: string;
    participantes: string[];
    createdAt: string;
    updatedAt: string;
}
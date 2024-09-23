import { Schema, model } from "mongoose";
import { Diagram } from "../interface/diagram.interface";
import userModel from "../models/user.model";

const diagramSchema = new Schema<Diagram>({
  name: {
    type: String,
    required: true,
  },
  plantUML: {
    type: String,
  },
  anfitrion: {
    type: Schema.Types.ObjectId, // Asegúrate de que es un ObjectId refiriéndose a un modelo de usuario
    ref: "User", // Referencia al modelo de usuario
  },
  qr: {
    type: String,
  },
  participantes: [{
    type: Schema.Types.ObjectId, // Debe ser una lista de ObjectId refiriéndose al modelo de usuario
    ref: "User",
  }],
});

export default model("Diagram", diagramSchema);

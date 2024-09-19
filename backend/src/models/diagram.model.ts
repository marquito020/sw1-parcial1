import { Schema, model } from "mongoose";
import { Diagram } from "../interface/diagram.interface";

const diagramSchema = new Schema<Diagram>({
  name: {
    type: String,
    required: true,
  },
  plantUML: {
    type: String,
  },
  anfitrion: {
    type: String,
    required: true,
  },
  qr: {
    type: String,
  },
  participantes: [{
    type: Array,
    required: true,
  }],
});

export default model("Diagram", diagramSchema);

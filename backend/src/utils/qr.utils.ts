import QRCode from "qrcode";
import { QR } from "../interface/qr.interface";

const generateQR = async (dataEvent: QR) => {

  // Nota: algunos lectores de qr no reconocen caracteres con tilde
  console.log(dataEvent.url);
  const qrUrl = await QRCode.toDataURL(dataEvent.url);
  console.log(qrUrl);

  return qrUrl;
};

export { generateQR };

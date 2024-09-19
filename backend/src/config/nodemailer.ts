import { createTransport } from "nodemailer";

// ingresar al dashboard de Mailtrap, entrar a la seccion de "imboxes"
// y por ultimo dar click en "Integrations" y elegir Nodejs
const transport = createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
        user: "95cf6977916e4a",
        pass: "ee9b22a0505702",
    },
});

export { transport };
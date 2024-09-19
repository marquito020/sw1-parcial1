# Utiliza la imagen oficial de Node.js como base
FROM node:18-alpine

# Instala las dependencias del sistema necesarias para bcrypt
RUN apk add --no-cache make gcc g++ python3

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos de dependencias al contenedor
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Instalar ts-node y nodemon globalmente
RUN npm install -g ts-node nodemon

# Recompila bcrypt para el entorno correcto
RUN npm rebuild bcrypt --build-from-source

# Copia el resto de los archivos del proyecto
COPY . .

# Expone el puerto 4000
EXPOSE 4000

# Comando para iniciar el servidor
CMD ["npm", "run", "dev"]

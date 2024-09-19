# Utiliza la imagen oficial de Node.js como base
FROM node:18-alpine

# Instala las dependencias del sistema necesarias para bcrypt
RUN apk add --no-cache make gcc g++ python3

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos del backend al contenedor
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Instalar ts
RUN npm install -g ts-node

# Copia el resto de los archivos del backend
COPY . .

# Recompila bcrypt para el entorno correcto
RUN npm rebuild bcrypt --build-from-source

# Expone el puerto 4000
EXPOSE 4000

# Comando para iniciar el servidor
CMD ["npm", "run", "dev"]

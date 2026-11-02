FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
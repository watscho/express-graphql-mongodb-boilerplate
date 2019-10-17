FROM node:alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm i --only=production

COPY ./ ./

EXPOSE 8000

CMD ["npm", "run", "start"]

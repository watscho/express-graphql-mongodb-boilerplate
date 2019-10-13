FROM node:alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY ./ ./

EXPOSE 8000

CMD [ "npm", "run" ,"start" ]


# docker build -t watscho .
# docker run --rm -it -p 8000:8000 watscho

# docker images     # docker images
# docker images -a  # docker images runnig

# docker rm -vf $(docker ps -a -q)   # To delete all containers including its volumes use
# docker rmi -f $(docker images -a -q)  # To delete all the images,
FROM node:7.10.1-alpine
WORKDIR /work/
ADD package.json /work/
RUN npm install
ADD config /work/config/
ADD data /work/data/
ADD src /work/src/
CMD npm start

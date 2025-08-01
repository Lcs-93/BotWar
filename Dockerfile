FROM node:18
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY backend ./backend
EXPOSE 3000
CMD ["node", "backend/server.js"]
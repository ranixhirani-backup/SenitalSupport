FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Copy seed script to root
COPY seed.js /app/seed.js

EXPOSE 3001

CMD ["npm", "run", "dev"]

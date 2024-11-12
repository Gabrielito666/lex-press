# Dockerfile
FROM node:22.10.0

WORKDIR /app

COPY ./app .

RUN npm install --omit-dev

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# Start the application
CMD ["npm", "run", "start"]
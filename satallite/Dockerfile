FROM node:22

WORKDIR /app

COPY package*.json ./



RUN echo "Installing dependencies..." && \
    npm install || { echo 'Dependency installation failed. Exiting build.'; exit 1; }


    COPY . .

    
RUN echo "Running tests..." && \
    npm test || { echo 'Tests failed. Exiting build.'; exit 1; }

RUN echo "Building application..." && \
    npm run build || { echo 'Build failed. Exiting build.'; exit 1; }

EXPOSE 3000

CMD ["npm", "start"]
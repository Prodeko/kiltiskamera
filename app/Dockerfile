# Stage 1: Build
FROM node:slim as builder

# Declaring env
ENV NODE_ENV development

# Setting up the work directory for the build
WORKDIR /app/backend

# Copying only the package.json and package-lock.json for dependency installation
COPY backend/package*.json ./

# Installing dependencies
RUN npm install

# Building the frontend
WORKDIR /app/frontend

# Copying only the package.json and package-lock.json for dependency installation
COPY frontend/package*.json ./

# Installing dependencies
RUN npm install

COPY frontend/ .

WORKDIR /app/backend

COPY backend/ .

# Building the frontend
WORKDIR /app/frontend
# Building the frontend (adjust the build command as needed)
RUN npm run build

# Stage 2: Create final image
FROM node:slim

# Declaring env
ENV NODE_ENV development

# Setting up the work directory
WORKDIR /app

# Copying only the necessary files from the builder stage
COPY --from=builder /app/backend/ ./backend/
COPY --from=builder /app/frontend/build ./frontend/build

WORKDIR /app/backend

# Installing only production dependencies
RUN npm install

# Starting our application
CMD [ "npm", "run", "dev" ]
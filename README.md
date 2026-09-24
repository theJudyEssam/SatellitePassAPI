# Satellite Pass API

A small NestJS API that calculates satellite visibility windows for a given observer location.

The application itself is intentionally simple. The primary goal of this project is **not** to build a complex backend, but to demonstrate a practical **automated CI/CD deployment pipeline** around a containerized application.

---

## Project Overview

Given:

1. A satellite NORAD ID
2. An observer's latitude
3. An observer's longitude
4. An observer's altitude

The API determines when the satellite rises above a configurable minimum elevation and when it falls below it again.

Satellite orbital data is retrieved from **CelesTrak** and propagated using **satellite.js**.

The application exposes a small number of endpoints for retrieving satellite data, propagating satellite positions, and calculating satellite passes.

### Example

```text
Observer
Latitude: 40.7128
Longitude: -74.0060
Altitude: 10m

Satellite
NORAD ID: 25544 (ISS)

        ↓

Satellite Pass API

        ↓

Rise Time
Peak Elevation
Set Time
Maximum Elevation
```

The satellite calculation is primarily used as a realistic workload for the deployment infrastructure. Keeping the application itself small allows the focus to remain on the DevOps pipeline.

---

# DevOps Objective

The main objective of this project is to demonstrate how a change can move from source code to a deployed application through an automated pipeline.

The intended flow is:

```text
Developer
   │
   │ git push
   ▼
GitHub Repository
   │
   ▼
GitHub Actions
   │
   ├── Install dependencies
   ├── Run tests
   ├── Build application
   ├── Build Docker image
   └── Push image to GHCR
            │
            ▼
   GitHub Container Registry
            │
            ▼
      Deployment Pipeline
```

The goal is to make deployments **repeatable, automated, and consistent**.

---

# CI/CD Pipeline

The project uses GitHub Actions as the automation layer.

The pipeline is divided conceptually into two stages:

### Continuous Integration

Every pull request targeting the development branch is validated by GitHub Actions.

```text
Pull Request
     │
     ▼
Install dependencies
     │
     ▼
Run Jest tests
     │
     ▼
Build NestJS application
```

This ensures that changes can be validated before they are merged.

### Continuous Deployment

When code is pushed to the development branch, the pipeline additionally creates and publishes a Docker image.

```text
Push to develop
     │
     ▼
Install dependencies
     │
     ▼
Run tests
     │
     ▼
Build application
     │
     ▼
Build Docker image
     │
     ▼
Push image to GHCR
```


---

# Docker

The application is containerized using Docker.

The Docker image contains:

* Node.js runtime
* Application dependencies
* Compiled NestJS application
* Application startup configuration

Instead of installing and configuring Node.js and the application separately on every server, the deployment environment can simply run the same Docker image.

The same application artifact can therefore be promoted between environments rather than rebuilding the application differently for each environment.

---

# GitHub Container Registry

Built Docker images are published to **GitHub Container Registry (GHCR)**.

The image follows the format:

```text
ghcr.io/<github-user>/satellite-api:<tag>
```

For example:

```text
ghcr.io/thejudyessam/satellite-api:latest
```

GHCR acts as the bridge between the CI pipeline and the deployment environments.

Instead of a server building the application itself, the server can pull a previously built image:

```bash
docker pull ghcr.io/thejudyessam/satellite-api:<tag>
```

and run that image.

This separates **building** from **running** the application.

---

# Technology Stack

## Application

* **NestJS**
* **TypeScript**
* **satellite.js**
* **Jest**

## Containerization

* **Docker**
* **Docker Compose**

## CI/CD

* **GitHub Actions**

## Container Registry

* **GitHub Container Registry (GHCR)**

## Satellite Data

* **CelesTrak**

---

# Application Architecture

The application is intentionally small.

```text
                ┌─────────────────┐
                │    Controller   │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ SatelliteService│
                └────────┬────────┘
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
       CelesTrak               satellite.js
     Orbital Data                Propagation
             │                       │
             └───────────┬───────────┘
                         ▼
                  Pass Calculation
```

The service:

1. Retrieves orbital data from CelesTrak.
2. Parses the satellite's TLE.
3. Propagates the satellite position using `satellite.js`.
4. Converts the satellite position into observer-relative look angles.
5. Samples the satellite's elevation over time.
6. Detects when the satellite rises above and falls below the minimum elevation.

---

# API Endpoints

### Get satellite information

```http
GET /satellites/:noradId
```

Example:

```http
GET /satellites/25544
```

---

### Propagate satellite position

```http
GET /satellites/:noradId/propagate
```

Example:

```http
GET /satellites/25544/propagate
```

---

### Calculate satellite pass

```http
GET /satellites/:noradId/pass-time/:latitude/:longitude/:altitude
```

Example:

```http
GET /satellites/25544/pass-time/40.7128/-74.0060/10
```

The response contains the detected rise time, peak time, set time, and maximum elevation.

---

# Testing

The application uses Jest for unit testing.

Tests cover, among other things:

* Service initialization
* CelesTrak TLE retrieval
* Invalid satellite data
* External request failures
* Satellite look-angle calculations
* Satellite pass detection
* Cases where no visible pass occurs

Tests are executed locally and automatically as part of the GitHub Actions pipeline.

```bash
npm test
```

---

# Running Locally

## Requirements

* Node.js 22+
* npm
* Docker

### Install dependencies

```bash
npm install
```

### Run tests

```bash
npm test
```

### Run the application

```bash
npm run start:dev
```

The API will be available at:

```text
http://localhost:3000
```

---

# Running with Docker

Build the image:

```bash
docker build -t satellite-api .
```

Run the container:

```bash
docker run -p 3000:3000 satellite-api
```

Or use Docker Compose:

```bash
docker compose up
```

---

# Repository Structure

```text
.
├── .github/
│   └── workflows/
│       └── ci.yml
│
└── satellite/
    ├── src/
    ├── Dockerfile
    ├── docker-compose.yml
    ├── package.json
    ├── package-lock.json
    └── ...
```

The GitHub Actions workflow is kept at the repository root because GitHub automatically discovers workflows under:

```text
.github/workflows/
```

---

# Current Pipeline

The current CI pipeline performs the following steps:

```text
1. Checkout repository
        ↓
2. Setup Node.js
        ↓
3. Install dependencies
        ↓
4. Run Jest tests
        ↓
5. Build NestJS application
        ↓
6. Authenticate with GHCR
        ↓
7. Build Docker image
        ↓
8. Push Docker image to GHCR
```

The next stage of the project is to consume that image from deployment environments rather than building the application directly on the target server and add multi-enviroments for the project.

---

# Project Goals

This project was intentionally designed around a simple application so that the complexity could be placed in the infrastructure rather than the business logic.

The main concepts demonstrated are:

* Automated testing
* Continuous integration
* Docker containerization
* Docker Compose
* Container image management
* GitHub Actions
* GitHub Container Registry
* Artifact promotion
* Automated deployment

The satellite calculation is simply the application being deployed; **the deployment pipeline is the primary engineering focus of the project.**


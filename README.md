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

The application exposes endpoints for:

* Retrieving satellite orbital data
* Propagating satellite positions
* Calculating satellite passes for an observer

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

Pass Detection
Rise Time
Peak Elevation
Set Time
Maximum Elevation
```

The satellite calculation is primarily used as a realistic workload for the deployment infrastructure. Keeping the application itself small allows the focus to remain on the DevOps pipeline.

---

# DevOps Objective

The main objective of this project is to demonstrate how a change can move from source code to a deployed application through an automated pipeline.

The project uses separate **development** and **production** environments.

```text
                         GitHub Repository
                                │
                 ┌──────────────┴──────────────┐
                 │                             │
              develop                         main
                 │                             │
                 ▼                             ▼
          Development CI/CD             Production CI/CD
                 │                             │
                 ▼                             ▼
              GHCR                          GHCR
                 │                             │
                 ▼                             ▼
        Development EC2             Production EC2
                 │                             │
                 ▼                             ▼
          Docker Container             Docker Container
```

The goal is to make deployments:

* Repeatable
* Automated
* Consistent
* Separated by environment

---

# CI/CD Pipeline

The project uses **GitHub Actions** as the automation layer.

The pipeline is divided into **Continuous Integration** and **Continuous Deployment**.

## Continuous Integration

Pull requests targeting `develop` or `main` are validated by GitHub Actions.

The CI process performs:

```text
Pull Request
     │
     ▼
Checkout repository
     │
     ▼
Setup Node.js
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

This ensures that changes are tested and compiled before being deployed.

## Continuous Deployment

A push to an environment branch triggers deployment.

### Development

```text
Push to develop
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
      │
      ▼
SSH into Development EC2
      │
      ▼
Pull image
      │
      ▼
Replace running container
```

### Production

```text
Push to main
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
      │
      ▼
SSH into Production EC2
      │
      ▼
Pull image
      │
      ▼
Replace running container
```

GitHub Actions uses separate GitHub Environments for the two deployment targets:

```text
development
    ├── EC2_HOST
    ├── EC2_USERNAME
    └── EC2_KEY

production
    ├── EC2_HOST
    ├── EC2_USERNAME
    └── EC2_KEY
```

This keeps environment-specific deployment credentials separate.

---

# Docker

The application is containerized using Docker.

The Docker image contains:

* Node.js runtime
* Application dependencies
* Compiled NestJS application
* Application startup configuration

The Dockerfile also runs the application's tests and build during image creation.

Instead of installing and configuring Node.js and the application separately on every server, the deployment environment can run the same Docker image produced by the CI pipeline.

This creates a clear separation between:

```text
Build
  ↓
Docker Image
  ↓
Run
```

The application is therefore built once and the resulting artifact is consumed by the deployment environments.

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

The EC2 instances do not build the application themselves. Instead, they pull the image produced by GitHub Actions:

```bash
docker pull ghcr.io/thejudyessam/satellite-api:latest
```

and run it.

This separates **building** from **running** the application.

---

# Deployment Architecture

The application currently runs on two AWS EC2 instances.

```text
                         Internet
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
       Development EC2             Production EC2
              │                           │
              ▼                           ▼
          Docker                      Docker
              │                           │
              ▼                           ▼
       satellite-api               satellite-api
              │                           │
              ▼                           ▼
         NestJS API                  NestJS API
```

The application listens on port `3000`.

```text
EC2 :3000
   │
   ▼
Docker :3000
   │
   ▼
NestJS :3000
```

For development/testing, the EC2 security group restricts access to port `3000` to an allowed public IP address.

SSH access is provided through port `22`.

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

## Infrastructure

* **AWS EC2**
* **AWS Security Groups**
* **SSH**

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

## Get Satellite Information

```http
GET /satellites/:noradId
```

Example:

```http
GET /satellites/25544
```

---

## Propagate Satellite Position

```http
GET /satellites/:noradId/propagate
```

Example:

```http
GET /satellites/25544/propagate
```

---

## Calculate Satellite Pass

```http
GET /satellites/:noradId/pass-time/:latitude/:longitude/:altitude
```

Example:

```http
GET /satellites/25544/pass-time/40.7128/-74.0060/10
```

The endpoint calculates the next detected pass above the configured minimum elevation for the specified observer.

---

# Testing

The application uses **Jest** for unit testing.

Tests cover:

* Service initialization
* CelesTrak TLE retrieval
* Invalid satellite data
* External request failures
* Satellite look-angle calculations
* Satellite pass detection
* Cases where no visible pass occurs

Run the tests locally with:

```bash
npm test
```

Tests are also executed automatically by GitHub Actions before deployment.

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
│       ├── ci.yml
│       ├── development.yml
│       └── production.yml
│
└── satallite/
    ├── src/
    ├── Dockerfile
    ├── docker-compose.yml
    ├── package.json
    ├── package-lock.json
    └── ...
```

The GitHub Actions workflows are kept at the repository root because GitHub automatically discovers workflows under:

```text
.github/workflows/
```

---

# Current Pipeline

The complete deployment pipeline is currently:

```text
1. Developer pushes code
        ↓
2. GitHub Actions starts
        ↓
3. Checkout repository
        ↓
4. Setup Node.js
        ↓
5. Install dependencies
        ↓
6. Run Jest tests
        ↓
7. Build NestJS application
        ↓
8. Authenticate with GHCR
        ↓
9. Build Docker image
        ↓
10. Push Docker image to GHCR
        ↓
11. SSH into target EC2 instance
        ↓
12. Pull Docker image
        ↓
13. Stop existing container
        ↓
14. Remove existing container
        ↓
15. Start new container
```

The target environment depends on the branch:

```text
develop
   ↓
Development EC2


main
   ↓
Production EC2
```

---

# Project Goals

This project was intentionally designed around a simple application so that the complexity could be placed in the infrastructure rather than the business logic.

The main concepts demonstrated are:

* Automated testing
* Continuous integration
* Continuous deployment
* Docker containerization
* Docker Compose
* Container image management
* GitHub Actions
* GitHub Container Registry
* AWS EC2 deployment
* Environment separation
* SSH-based deployment
* Artifact promotion
* Automated application replacement

The satellite calculation is simply the application being deployed.

**The deployment pipeline is the primary engineering focus of the project.**

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
```

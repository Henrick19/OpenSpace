# Docker setup plan

## Do we need Docker?

Docker is recommended for the Node.js integration service because it can give every authorised developer the same runtime and can later support container-based AWS hosting. It is not compulsory for early React wireframe and UI development, and it does not replace Node.js package dependencies.

## Planned container boundary

```text
Host browser
    ↓ http://localhost:5173
Vite React development server
    ↓ /api requests
Node.js service container on port 8787
    ↓ authenticated server-side requests
OpenSpace private API
```

Initially, only the Node.js service needs a container. The React frontend can run with Vite on the host machine. For production, Amplify Hosting can serve the static React build while a managed container service runs the Node.js integration.

## Files to add when implementation begins

```text
apps/api/Dockerfile       Multi-stage build for the Node.js service
.dockerignore             Exclude dependencies, builds, secrets and captures
compose.yaml              Optional local API container configuration
```

These runnable files are intentionally not present yet because there is no `package.json`, lockfile or server source code for Docker to build.

## Planned Node.js image

The eventual Dockerfile should:

1. use an approved Node.js 22 base image;
2. install exact versions from the committed lockfile;
3. build the shared package and API service in a build stage;
4. copy only production requirements into the runtime stage;
5. run as a non-root user;
6. expose only the Node.js service port;
7. provide a health-check endpoint;
8. avoid copying `.env`, INSV files, logs or credentials into the image.

## Upload storage

During local development, a temporary host directory may be mounted into the container for uploads. It must be ignored by Git. The service should remove temporary files after successful transfer or according to an agreed recovery policy.

Large INSV files should stream through the dedicated Node.js service. They should not be routed through AWS Lambda or API Gateway.

## Secrets

Never use Docker build arguments or Dockerfile `ENV` instructions for the OpenSpace client secret, machine-user password or access token.

For authorised local testing, inject secrets at container runtime through the school-approved secret-management workflow. For AWS deployment, the container should use its IAM role to retrieve the secret from AWS Secrets Manager.

## Future local commands

After the Dockerfile and compose file exist, the team should provide simple commands similar to:

```text
docker compose build api
docker compose up api
docker compose down
```

These commands are examples of the intended workflow; they will not work until the runnable container files and application dependencies are added.

## Readiness checklist

- Node.js service source code exists.
- Root and API package manifests exist.
- A lockfile is committed.
- Mock mode works without OpenSpace credentials.
- Upload and diagnostic directories are ignored by Git.
- The API has a health-check route.
- No secret is present in the image or build history.
- The team has agreed how temporary multi-gigabyte files are cleaned up.

# aca-cicd-sample

Minimal Node service wired for continuous deployment to Azure Container Apps
via GitHub Actions and OIDC federated auth. Push to `main`, get a new revision.

## What's here

| File | Purpose |
| --- | --- |
| `server.js` | Express app on port 8080, with `/healthz`, `/readyz` and `/version` |
| `Dockerfile` | Two-stage Alpine build, non-root, SIGTERM-aware |
| `.dockerignore` | Keeps `node_modules` and git metadata out of the build context |
| `.github/workflows/deploy.yml` | Build, push to ACR, update the app, smoke test |

The page at `/` shows the commit SHA baked into the image, so you can see at a
glance which build is live.

## Before the first push

Create these in Azure (resource group, ACR, Container Apps environment, the app
itself with a system-assigned identity holding **AcrPull**), then set up an
Entra app registration with a federated credential for
`repo:<ORG>/<REPO>:ref:refs/heads/main`.

**Repository secrets** — Settings → Secrets and variables → Actions → Secrets:

| Secret | Value |
| --- | --- |
| `AZURE_CLIENT_ID` | Application (client) ID of the app registration |
| `AZURE_TENANT_ID` | Directory (tenant) ID |
| `AZURE_SUBSCRIPTION_ID` | Subscription ID |

**Repository variables** — same page, Variables tab:

| Variable | Example |
| --- | --- |
| `AZURE_RESOURCE_GROUP` | `rg-aca-demo` |
| `ACR_NAME` | `acrACADemo01` (name only, no `.azurecr.io`) |
| `CONTAINER_APP_NAME` | `ca-aca-demo` |

Set the container app's **ingress target port to 8080**.

## Run it locally

```bash
npm install
GIT_SHA=$(git rev-parse --short HEAD) npm start
# http://localhost:8080
```

With Docker:

```bash
docker build --build-arg GIT_SHA=$(git rev-parse --short HEAD) -t aca-cicd-sample .
docker run --rm -p 8080:8080 aca-cicd-sample
```

## How the pipeline behaves

- **Pull requests** run the `validate` job: install, test, build the image, but
  never push or deploy.
- **Pushes to `main`** run `build-and-deploy`: build, push both a `:<sha>` and a
  `:latest` tag, update the container app, then poll `/version` until the new
  commit is actually being served. If the revision never takes traffic, the job
  fails rather than reporting a false green.
- Changes to `*.md` and `docs/**` skip the pipeline entirely.

## Rolling back

The image is tagged with the commit SHA, so every revision is pinned to an
immutable digest. In the portal: **Container app → Revision management →**
activate the previous revision and shift traffic to it.

'use strict';

const express = require('express');

const app = express();
const PORT = Number(process.env.PORT) || 8080;

// Build metadata is injected at image build time (see Dockerfile ARGs)
const BUILD = {
  commit: process.env.GIT_SHA || 'local',
  builtAt: process.env.BUILD_TIME || 'local',
  revision: process.env.CONTAINER_APP_REVISION || 'n/a',
  appName: process.env.CONTAINER_APP_NAME || 'aca-cicd-sample',
};

app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Azure Container Apps CI/CD</title>
  <style>
    :root { color-scheme: light dark; }
    body {
      margin: 0; min-height: 100vh; display: grid; place-items: center;
      font: 16px/1.6 ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
      background: Canvas; color: CanvasText;
    }
    main { max-width: 34rem; padding: 2rem; }
    h1 { font-size: 1.5rem; margin: 0 0 .25rem; }
    p.lead { margin: 0 0 1.5rem; opacity: .7; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: .5rem 1.25rem; margin: 0; }
    dt { opacity: .6; }
    dd { margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; word-break: break-all; }
  </style>
</head>
<body>
  <main>
    <h1>Deployed from GitHub Actions</h1>
    <p class="lead">This page is served by a container built and shipped by the pipeline.</p>
    <dl>
      <dt>App</dt><dd>${BUILD.appName}</dd>
      <dt>Commit</dt><dd>${BUILD.commit}</dd>
      <dt>Built at</dt><dd>${BUILD.builtAt}</dd>
      <dt>Revision</dt><dd>${BUILD.revision}</dd>
    </dl>
  </main>
</body>
</html>`);
});

// Container Apps health probes point here
app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok' }));
app.get('/readyz', (_req, res) => res.status(200).json({ status: 'ready' }));

// Machine-readable build info, handy for verifying a deploy from curl
app.get('/version', (_req, res) => res.json(BUILD));

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`listening on :${PORT} (commit ${BUILD.commit})`);
});

// Container Apps sends SIGTERM when draining an old revision
const shutdown = (signal) => {
  console.log(`${signal} received, draining connections`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

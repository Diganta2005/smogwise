'use strict';
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { validate } = require('./src/validate');
const { buildPlan } = require('./src/advice');
const { enrich } = require('./src/llm');

function createApp({ summarize = enrich } = {}) {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));
  const prod = process.env.NODE_ENV === 'production';
  app.use(helmet({
    // Forcing HTTPS upgrades breaks plain-http local development in some browsers.
    contentSecurityPolicy: { directives: { upgradeInsecureRequests: prod ? [] : null } },
  }));
  app.use(compression());
  app.use(express.json({ limit: '4kb' }));
  app.use('/api/', rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false }));
  app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.post('/api/plan', async (req, res, next) => {
    try {
      const { value, errors } = validate(req.body);
      if (errors) return res.status(400).json({ errors });
      const plan = buildPlan(value);
      const summary = await summarize(value, plan);
      res.json({ ...plan, summary, summarySource: summary ? 'ai' : 'none' });
    } catch (err) {
      next(err);
    }
  });

  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ errors: { body: 'Invalid JSON.' } });
    if (err.type === 'entity.too.large') return res.status(413).json({ errors: { body: 'Request too large.' } });
    console.error(err);
    res.status(500).json({ errors: { server: 'Something went wrong. Try again.' } });
  });
  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => console.log(`SmogWise running on http://localhost:${port}`));
}

module.exports = { createApp };

import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EnterpriseGeoFencingService } from './services/geo-fencing.js';
import { GraphIntelligenceService } from './utils/transaction-grapher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist');
const geoFencingService = new EnterpriseGeoFencingService();
const port = Number(process.env.PORT || 4000);

const MIME_TYPES = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain'
};

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
};

const resolveCorsOrigin = (requestOrigin) => {
  const configured = (process.env.CORS_ORIGIN || '*').trim();
  if (configured === '*') {
    return '*';
  }

  const allowedOrigins = configured
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!allowedOrigins.length) {
    return '*';
  }

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  return allowedOrigins[0];
};

const applyCors = (req, res) => {
  const origin = resolveCorsOrigin(req.headers.origin);
  res.setHeader('Access-Control-Allow-Origin', origin);
  if (origin !== '*') {
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const readJsonBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = '';
    let settled = false;

    const rejectOnce = (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    };

    const resolveOnce = (value) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };

    req.on('data', (chunk) => {
      raw += chunk.toString();
      if (raw.length > 1_000_000) {
        rejectOnce(new Error('Request body too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolveOnce({});
        return;
      }

      try {
        resolveOnce(JSON.parse(raw));
      } catch {
        rejectOnce(new Error('Invalid JSON payload.'));
      }
    });
    req.on('error', (error) => rejectOnce(error));
  });

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

const serveStatic = async (req, res) => {
  if (!existsSync(distDir)) {
    sendJson(res, 404, { error: 'Frontend build not found. Run "npm run build" first.' });
    return;
  }

  const requestPath = new URL(req.url || '/', 'http://localhost').pathname;
  const safePath = requestPath === '/' ? '/index.html' : requestPath;
  const resolvedPath = path.resolve(distDir, `.${safePath}`);

  if (!resolvedPath.startsWith(distDir)) {
    sendJson(res, 403, { error: 'Forbidden path.' });
    return;
  }

  const fileExists = await stat(resolvedPath).then((result) => result.isFile()).catch(() => false);
  const targetFile = fileExists ? resolvedPath : path.resolve(distDir, 'index.html');
  const targetFileExists = await stat(targetFile).then((result) => result.isFile()).catch(() => false);

  if (!targetFileExists) {
    sendJson(res, 404, { error: 'Frontend entrypoint not found. Run "npm run build" first.' });
    return;
  }

  const ext = path.extname(targetFile);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': contentType });
  const stream = createReadStream(targetFile);
  stream.on('error', () => {
    if (!res.headersSent) {
      sendJson(res, 500, { error: 'Failed to read static file.' });
      return;
    }

    res.destroy();
  });
  stream.pipe(res);
};

const handleApi = async (req, res) => {
  const pathname = new URL(req.url || '/', 'http://localhost').pathname;

  if (req.method === 'GET' && pathname === '/api/health') {
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/geofencing/request-nonce') {
    const { deviceId } = await readJsonBody(req);

    if (!deviceId || typeof deviceId !== 'string') {
      sendJson(res, 400, { error: 'deviceId is required.' });
      return true;
    }

    const nonce = geoFencingService.requestChallengeNonce(deviceId);
    sendJson(res, 200, { nonce });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/geofencing/evaluate') {
    const { telemetry, targetLat, targetLng, baseRadiusMeters, expectedBleChallenge } = await readJsonBody(req);

    if (!telemetry || typeof telemetry !== 'object') {
      sendJson(res, 400, { error: 'telemetry object is required.' });
      return true;
    }

    if (
      typeof telemetry.deviceId !== 'string' ||
      typeof telemetry.nonce !== 'string' ||
      !isFiniteNumber(telemetry.timestamp) ||
      !isFiniteNumber(telemetry.latitude) ||
      !isFiniteNumber(telemetry.longitude)
    ) {
      sendJson(res, 400, {
        error: 'telemetry must include deviceId, nonce, timestamp, latitude and longitude.'
      });
      return true;
    }

    if (!isFiniteNumber(targetLat) || !isFiniteNumber(targetLng) || !isFiniteNumber(baseRadiusMeters)) {
      sendJson(res, 400, { error: 'targetLat, targetLng and baseRadiusMeters must be valid numbers.' });
      return true;
    }

    const result = await geoFencingService.evaluateSecureLock(
      telemetry,
      targetLat,
      targetLng,
      baseRadiusMeters,
      expectedBleChallenge
    );
    sendJson(res, 200, result);
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/graph/process') {
    const { logs } = await readJsonBody(req);

    if (!Array.isArray(logs)) {
      sendJson(res, 400, { error: 'logs must be an array.' });
      return true;
    }

    const result = GraphIntelligenceService.processNetworkGraph(logs);
    sendJson(res, 200, result);
    return true;
  }

  sendJson(res, 404, { error: 'API route not found.' });
  return true;
};

const server = createServer(async (req, res) => {
  const reqUrl = req.url || '/';
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (reqUrl.startsWith('/api/')) {
      await handleApi(req, res);
      return;
    }

    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'Method not allowed.' });
      return;
    }

    await serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : 'Unexpected server error.' });
  }
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Cypherchat API server running at http://localhost:${port}`);
});

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const parseResponse = async (response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
};

const requestJson = async (path, payload) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await parseResponse(response);
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
};

export const requestChallengeNonce = async (deviceId) => {
  if (!deviceId || typeof deviceId !== 'string') {
    throw new Error('deviceId is required.');
  }

  const { nonce } = await requestJson('/geofencing/request-nonce', { deviceId });
  return nonce;
};

export const evaluateSecureLock = async ({
  telemetry,
  targetLat,
  targetLng,
  baseRadiusMeters,
  expectedBleChallenge
}) => {
  return requestJson('/geofencing/evaluate', {
    telemetry,
    targetLat,
    targetLng,
    baseRadiusMeters,
    expectedBleChallenge
  });
};

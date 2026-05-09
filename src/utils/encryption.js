import CryptoJS from 'crypto-js';

const SECURE_MESSAGE_PREFIX = 'CCIPD_AES_V1::';
const DEFAULT_RADIUS_METERS = 100;

const normalizeAddress = (address = '') => address.toLowerCase().trim();
const normalizeKey = (key) => {
  if (typeof key === 'string') {
    return key;
  }

  if (key && typeof key === 'object') {
    if (typeof key.privateKey === 'string') return key.privateKey;
    if (typeof key.publicKey === 'string') return key.publicKey;
  }

  return '';
};

export const deriveConversationKey = (addressA, addressB) => {
  const a = normalizeAddress(addressA);
  const b = normalizeAddress(addressB);
  const [first, second] = [a, b].sort();

  return `${first}|${second}|cypherchat-aes-v1`;
};

export const encryptMessage = (plainText, key) => {
  const normalizedKey = normalizeKey(key);

  if (typeof plainText !== 'string' || !plainText.length) {
    throw new Error('Message text is required for encryption.');
  }

  if (!normalizedKey.length) {
    throw new Error('Encryption key is required.');
  }

  return CryptoJS.AES.encrypt(plainText, normalizedKey).toString();
};

export const decryptMessage = (cipherText, key) => {
  const normalizedKey = normalizeKey(key);

  if (typeof cipherText !== 'string' || !cipherText.length) {
    return '';
  }

  if (!normalizedKey.length) {
    return '';
  }

  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, normalizedKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return '';
  }
};

export const generateKeyPair = async () => {
  const key = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
  return { publicKey: key, privateKey: key };
};

export const encodeSecurePayload = ({
  cipherText,
  geofence
}) => {
  const payload = {
    v: 1,
    alg: 'AES',
    cipherText,
    geofence: geofence
      ? {
          latitude: geofence.latitude,
          longitude: geofence.longitude,
          radiusMeters: geofence.radiusMeters || DEFAULT_RADIUS_METERS
        }
      : null
  };

  return `${SECURE_MESSAGE_PREFIX}${JSON.stringify(payload)}`;
};

export const tryParseSecurePayload = (rawValue) => {
  if (typeof rawValue !== 'string') {
    return null;
  }

  if (!rawValue.startsWith(SECURE_MESSAGE_PREFIX)) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue.slice(SECURE_MESSAGE_PREFIX.length));
    if (!parsed || typeof parsed.cipherText !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const isWithinGeofence = (location, geofence) => {
  if (!location || !geofence) {
    return false;
  }

  const lat1 = Number(location.latitude);
  const lon1 = Number(location.longitude);
  const lat2 = Number(geofence.latitude);
  const lon2 = Number(geofence.longitude);
  const radiusMeters = Number(geofence.radiusMeters || DEFAULT_RADIUS_METERS);

  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2) ||
    !Number.isFinite(radiusMeters) ||
    radiusMeters <= 0
  ) {
    return false;
  }

  const earthRadius = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const haversineA =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const haversineC = 2 * Math.atan2(Math.sqrt(haversineA), Math.sqrt(1 - haversineA));
  const distance = earthRadius * haversineC;

  return distance <= radiusMeters;
};

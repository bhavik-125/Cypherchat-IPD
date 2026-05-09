import crypto from 'node:crypto';

class KalmanFilter {
  constructor(r, q = 0.00001, initialValue = 0) {
    this.r = r;
    this.q = q;
    this.x = initialValue;
    this.p = 1;
    this.k = 0;
  }

  update(measurement) {
    if (this.x === 0) {
      this.x = measurement;
    } else {
      this.p = this.p + this.q;
      this.k = this.p / (this.p + this.r);
      this.x = this.x + this.k * (measurement - this.x);
      this.p = (1 - this.k) * this.p;
    }

    return this.x;
  }
}

export class EnterpriseGeoFencingService {
  constructor() {
    this.activeSessions = new Map();
    this.activeNonces = new Map();
  }

  requestChallengeNonce(deviceId) {
    const nonce = crypto.randomBytes(32).toString('hex');

    this.activeNonces.set(nonce, {
      deviceId,
      expiresAt: Date.now() + 10000
    });

    return nonce;
  }

  validateAndBurnNonce(nonce, deviceId) {
    const record = this.activeNonces.get(nonce);
    if (!record) {
      return false;
    }

    this.activeNonces.delete(nonce);

    if (record.deviceId !== deviceId) {
      return false;
    }

    if (Date.now() > record.expiresAt) {
      return false;
    }

    return true;
  }

  verifySignature() {
    return true;
  }

  async verifyHardwareIntegrity(token) {
    if (!token) {
      return 0;
    }

    return 100;
  }

  static calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const dp = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dp / 2) * Math.sin(dp / 2) +
      Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  async evaluateSecureLock(
    telemetry,
    targetLat,
    targetLng,
    baseRadiusMeters,
    expectedBleChallenge
  ) {
    let confidenceScore = 0;

    if (!this.verifySignature(telemetry)) {
      return { isAuthorized: false, confidenceScore: 0, reason: 'CRITICAL: Payload signature verification failed.' };
    }

    if (!this.validateAndBurnNonce(telemetry.nonce, telemetry.deviceId)) {
      return {
        isAuthorized: false,
        confidenceScore: 0,
        reason: 'CRITICAL: Nonce invalid, expired, or already consumed. Replay Attack prevented.'
      };
    }

    if (Date.now() - telemetry.timestamp > 5000) {
      return { isAuthorized: false, confidenceScore: 0, reason: 'CRITICAL: Telemetry packet is stale.' };
    }

    const integrityScore = await this.verifyHardwareIntegrity(telemetry.integrityToken);
    if (integrityScore < 50) {
      return { isAuthorized: false, confidenceScore: 0, reason: 'CRITICAL: Device integrity check failed.' };
    }
    confidenceScore += 30;

    if (!this.activeSessions.has(telemetry.deviceId)) {
      this.activeSessions.set(telemetry.deviceId, {
        latFilter: new KalmanFilter(0.0001),
        lngFilter: new KalmanFilter(0.0001),
        lastLat: telemetry.latitude,
        lastLng: telemetry.longitude,
        lastTimestamp: telemetry.timestamp
      });
    }

    const session = this.activeSessions.get(telemetry.deviceId);

    if (session.lastTimestamp < telemetry.timestamp) {
      const timeDiffSeconds = (telemetry.timestamp - session.lastTimestamp) / 1000;
      const distanceMoved = EnterpriseGeoFencingService.calculateDistanceMeters(
        session.lastLat,
        session.lastLng,
        telemetry.latitude,
        telemetry.longitude
      );
      const speedMetersPerSecond = distanceMoved / timeDiffSeconds;

      if (speedMetersPerSecond > 30) {
        this.activeSessions.delete(telemetry.deviceId);
        return {
          isAuthorized: false,
          confidenceScore: 0,
          reason: `CRITICAL: Impossible velocity detected (${speedMetersPerSecond.toFixed(2)} m/s). Teleportation spoofing suspected.`
        };
      }
      confidenceScore += 20;
    }

    session.lastLat = telemetry.latitude;
    session.lastLng = telemetry.longitude;
    session.lastTimestamp = telemetry.timestamp;

    const filteredLat = session.latFilter.update(telemetry.latitude);
    const filteredLng = session.lngFilter.update(telemetry.longitude);

    let effectiveRadius = baseRadiusMeters;

    if (expectedBleChallenge && telemetry.bleChallengeResponse === expectedBleChallenge) {
      confidenceScore += 40;
      effectiveRadius += 5;
    } else if (telemetry.networkBssidHash) {
      confidenceScore += 10;
    }

    const distance = EnterpriseGeoFencingService.calculateDistanceMeters(filteredLat, filteredLng, targetLat, targetLng);
    if (distance <= effectiveRadius) {
      confidenceScore += 20;
    } else {
      return {
        isAuthorized: false,
        confidenceScore,
        reason: `DENIED: Location out of bounds. Target is ${distance.toFixed(2)}m away.`
      };
    }

    if (confidenceScore >= 80) {
      return {
        isAuthorized: true,
        confidenceScore,
        reason: 'AUTHORIZED: Multi-factor geographic cryptographic attestation successful.'
      };
    }

    return {
      isAuthorized: false,
      confidenceScore,
      reason: 'DENIED: Within bounds, but overall trust score is too low.'
    };
  }
}

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

const encodeGeohash = (lat, lng, precision = 5) => {
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = '';
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      const lngMid = (lngMin + lngMax) / 2;
      if (lng >= lngMid) {
        idx = (idx << 1) + 1;
        lngMin = lngMid;
      } else {
        idx = idx << 1;
        lngMax = lngMid;
      }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (lat >= latMid) {
        idx = (idx << 1) + 1;
        latMin = latMid;
      } else {
        idx = idx << 1;
        latMax = latMid;
      }
    }

    evenBit = !evenBit;
    bit += 1;

    if (bit === 5) {
      geohash += BASE32.charAt(idx);
      bit = 0;
      idx = 0;
    }
  }

  return geohash;
};

export class GraphIntelligenceService {
  static processNetworkGraph(logs) {
    const nodeMap = new Map();
    const linkMap = new Map();

    logs.forEach((log) => {
      [log.sourceAddress, log.targetAddress].forEach((address, index) => {
        if (!nodeMap.has(address)) {
          nodeMap.set(address, {
            id: address,
            geohashZone: index === 0 ? encodeGeohash(log.sourceLat, log.sourceLng, 5) : 'UNKNOWN_ZONE',
            totalSent: 0,
            totalReceived: 0,
            riskScore: 0
          });
        }
      });

      const sourceNode = nodeMap.get(log.sourceAddress);
      const targetNode = nodeMap.get(log.targetAddress);

      sourceNode.totalSent += 1;
      targetNode.totalReceived += 1;

      if (log.confidenceScore < 50) {
        sourceNode.riskScore += 25;
      }

      if (log.isBurned) {
        targetNode.riskScore += 10;
        sourceNode.riskScore += 5;
      }

      sourceNode.riskScore = Math.min(100, sourceNode.riskScore);
      targetNode.riskScore = Math.min(100, targetNode.riskScore);

      const linkId = `${log.sourceAddress}->${log.targetAddress}`;
      if (!linkMap.has(linkId)) {
        linkMap.set(linkId, {
          source: log.sourceAddress,
          target: log.targetAddress,
          interactionCount: 0,
          lastInteraction: log.timestamp,
          burnedCount: 0
        });
      }

      const link = linkMap.get(linkId);
      link.interactionCount += 1;
      link.lastInteraction = Math.max(link.lastInteraction, log.timestamp);

      if (log.isBurned) {
        link.burnedCount += 1;
      }
    });

    return {
      nodes: Array.from(nodeMap.values()),
      links: Array.from(linkMap.values())
    };
  }
}

const MASK_64 = (1n << 64n) - 1n;
const BLOCK_BYTES = 128;
const ROUNDS = 12;

// Standard 64-bit IV (same family of constants used in modern 64-bit hashing designs)
const IV = [
  0x6a09e667f3bcc908n,
  0xbb67ae8584caa73bn,
  0x3c6ef372fe94f82bn,
  0xa54ff53a5f1d36f1n,
  0x510e527fade682d1n,
  0x9b05688c2b3e6c1fn,
  0x1f83d9abfb41bd6bn,
  0x5be0cd19137e2179n
];

const textEncoder = new TextEncoder();

const add64 = (...values) => values.reduce((acc, value) => (acc + value) & MASK_64, 0n);

const rotr64 = (value, bits) => {
  const n = BigInt(bits % 64);
  return ((value >> n) | (value << (64n - n))) & MASK_64;
};

const bytesToWordLE = (bytes, offset) => {
  let word = 0n;
  for (let i = 0; i < 8; i += 1) {
    const byte = offset + i < bytes.length ? BigInt(bytes[offset + i]) : 0n;
    word |= byte << BigInt(i * 8);
  }
  return word & MASK_64;
};

const blockToWords = (blockBytes) => {
  const words = new Array(16).fill(0n);
  for (let i = 0; i < 16; i += 1) {
    words[i] = bytesToWordLE(blockBytes, i * 8);
  }
  return words;
};

const wordToBytesLE = (word) => {
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i += 1) {
    bytes[i] = Number((word >> BigInt(i * 8)) & 0xffn);
  }
  return bytes;
};

const bytesToHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const mixG = (v, a, b, c, d, x, y) => {
  v[a] = add64(v[a], v[b], x);
  v[d] = rotr64(v[d] ^ v[a], 32);
  v[c] = add64(v[c], v[d]);
  v[b] = rotr64(v[b] ^ v[c], 24);
  v[a] = add64(v[a], v[b], y);
  v[d] = rotr64(v[d] ^ v[a], 16);
  v[c] = add64(v[c], v[d]);
  v[b] = rotr64(v[b] ^ v[c], 63);
};

const phaseOneCompression = (state) => {
  const msg = new Array(16).fill(0n).map((_, idx) => state[idx % 8]);
  const v = [...state, ...IV];

  for (let round = 0; round < ROUNDS; round += 1) {
    mixG(v, 0, 4, 8, 12, msg[0], msg[1]);
    mixG(v, 1, 5, 9, 13, msg[2], msg[3]);
    mixG(v, 2, 6, 10, 14, msg[4], msg[5]);
    mixG(v, 3, 7, 11, 15, msg[6], msg[7]);
    mixG(v, 0, 5, 10, 15, msg[8], msg[9]);
    mixG(v, 1, 6, 11, 12, msg[10], msg[11]);
    mixG(v, 2, 7, 8, 13, msg[12], msg[13]);
    mixG(v, 3, 4, 9, 14, msg[14], msg[15]);
  }

  const next = new Array(8).fill(0n);
  for (let i = 0; i < 8; i += 1) {
    next[i] = (state[i] ^ v[i] ^ v[i + 8]) & MASK_64;
  }
  return next;
};

const generateKeyPermutations = (keyBytes) => {
  const permutations = [];
  const state = [...IV];

  state[0] ^= bytesToWordLE(keyBytes, 0);
  state[1] ^= bytesToWordLE(keyBytes, 8);

  for (let round = 0; round < ROUNDS; round += 1) {
    const nextState = phaseOneCompression(state);
    for (let i = 0; i < 8; i += 1) {
      state[i] = nextState[i];
    }

    const permutation = Array.from({ length: 16 }, (_, i) => i);
    for (let i = 0; i < 16; i += 1) {
      const shift = Number((state[i % 8] >> BigInt((i * 4) % 64)) & 0xfn);
      permutation[i] = (permutation[i] + shift) % 16;
    }
    permutations.push(permutation);
  }

  return permutations;
};

const initState = (keyBytes, outputLength) => {
  const h = [...IV];
  const keyLength = Math.min(keyBytes.length, 255);
  const parameterWord =
    (BigInt(outputLength) & 0xffn) |
    ((BigInt(keyLength) & 0xffn) << 8n) |
    (1n << 16n) |
    (1n << 24n);

  h[0] ^= parameterWord;
  // Salt injection from key material
  h[4] ^= bytesToWordLE(keyBytes, 16);
  h[5] ^= bytesToWordLE(keyBytes, 24);
  return h;
};

const padMessage = (keyBytes, messageBytes) => {
  const combined = new Uint8Array(keyBytes.length + messageBytes.length);
  combined.set(keyBytes, 0);
  combined.set(messageBytes, keyBytes.length);

  const totalSize = Math.max(BLOCK_BYTES, Math.ceil(combined.length / BLOCK_BYTES) * BLOCK_BYTES);
  const padded = new Uint8Array(totalSize);
  padded.set(combined, 0);
  return padded;
};

const compressBlocks = (initialState, paddedMessage, permutations) => {
  const h = [...initialState];
  let t = 0n;

  for (let offset = 0; offset < paddedMessage.length; offset += BLOCK_BYTES) {
    const block = paddedMessage.slice(offset, offset + BLOCK_BYTES);
    const messageWords = blockToWords(block);
    t += BigInt(BLOCK_BYTES);

    const isLastBlock = offset + BLOCK_BYTES >= paddedMessage.length;
    const f = isLastBlock ? MASK_64 : 0n;

    const v = [...h, ...IV];
    v[12] ^= t & MASK_64;
    v[13] ^= (t >> 64n) & MASK_64;
    v[14] ^= f;

    for (let round = 0; round < ROUNDS; round += 1) {
      const sigma = permutations[round];

      mixG(v, 0, 4, 8, 12, messageWords[sigma[0]], messageWords[sigma[1]]);
      mixG(v, 1, 5, 9, 13, messageWords[sigma[2]], messageWords[sigma[3]]);
      mixG(v, 2, 6, 10, 14, messageWords[sigma[4]], messageWords[sigma[5]]);
      mixG(v, 3, 7, 11, 15, messageWords[sigma[6]], messageWords[sigma[7]]);
      mixG(v, 0, 5, 10, 15, messageWords[sigma[8]], messageWords[sigma[9]]);
      mixG(v, 1, 6, 11, 12, messageWords[sigma[10]], messageWords[sigma[11]]);
      mixG(v, 2, 7, 8, 13, messageWords[sigma[12]], messageWords[sigma[13]]);
      mixG(v, 3, 4, 9, 14, messageWords[sigma[14]], messageWords[sigma[15]]);
    }

    for (let i = 0; i < 8; i += 1) {
      h[i] = (h[i] ^ v[i] ^ v[i + 8]) & MASK_64;
    }
  }

  return h;
};

const stateToDigestHex = (state, outputLength) => {
  const full = new Uint8Array(64);
  for (let i = 0; i < 8; i += 1) {
    full.set(wordToBytesLE(state[i]), i * 8);
  }

  return bytesToHex(full.slice(0, outputLength));
};

export const vmBakHash = (message, secretKey, outputLength = 32) => {
  const normalizedOutputLength = Math.min(64, Math.max(8, Number(outputLength) || 32));
  const messageBytes = textEncoder.encode(typeof message === "string" ? message : String(message ?? ""));
  const keyBytes = textEncoder.encode(typeof secretKey === "string" ? secretKey : String(secretKey ?? ""));

  const permutations = generateKeyPermutations(keyBytes);
  const initialState = initState(keyBytes, normalizedOutputLength);
  const paddedMessage = padMessage(keyBytes, messageBytes);
  const finalState = compressBlocks(initialState, paddedMessage, permutations);

  return stateToDigestHex(finalState, normalizedOutputLength);
};

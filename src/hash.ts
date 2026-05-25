// blake3.ts
// Pure TypeScript BLAKE3-256 implementation.

const OUT_LEN = 32;
const BLOCK_LEN = 64;
const CHUNK_LEN = 1024;

const CHUNK_START = 1 << 0;
const CHUNK_END = 1 << 1;
const PARENT = 1 << 2;
const ROOT = 1 << 3;

const IV: readonly number[] = [
  0x6a09e667,
  0xbb67ae85,
  0x3c6ef372,
  0xa54ff53a,
  0x510e527f,
  0x9b05688c,
  0x1f83d9ab,
  0x5be0cd19,
];

const MSG_SCHEDULE: readonly (readonly number[])[] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  [2, 6, 3, 10, 7, 0, 4, 13, 1, 11, 12, 5, 9, 14, 15, 8],
  [3, 4, 10, 12, 13, 2, 7, 14, 6, 5, 9, 0, 11, 15, 8, 1],
  [10, 7, 12, 9, 14, 3, 13, 15, 4, 0, 11, 2, 5, 8, 1, 6],
  [12, 13, 9, 11, 15, 10, 14, 8, 7, 2, 5, 3, 0, 1, 6, 4],
  [9, 14, 11, 5, 8, 12, 15, 1, 13, 3, 0, 10, 2, 6, 4, 7],
  [11, 15, 5, 0, 1, 9, 8, 6, 14, 10, 2, 12, 3, 4, 7, 13],
];

function rotr32(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

function add32(a: number, b: number): number {
  return (a + b) >>> 0;
}

function load32LE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset]! |
    (bytes[offset + 1]! << 8) |
    (bytes[offset + 2]! << 16) |
    (bytes[offset + 3]! << 24)
  ) >>> 0;
}

function store32LE(out: Uint8Array, offset: number, value: number): void {
  out[offset] = value & 0xff;
  out[offset + 1] = (value >>> 8) & 0xff;
  out[offset + 2] = (value >>> 16) & 0xff;
  out[offset + 3] = (value >>> 24) & 0xff;
}

function wordsFromBlock(block: Uint8Array): number[] {
  const words = new Array<number>(16).fill(0);

  for (let i = 0; i < 16; i++) {
    const offset = i * 4;
    if (offset + 4 <= block.length) {
      words[i] = load32LE(block, offset);
    } else {
      let value = 0;
      for (let j = 0; j < 4; j++) {
        const byte = block[offset + j] ?? 0;
        value |= byte << (8 * j);
      }
      words[i] = value >>> 0;
    }
  }

  return words;
}

function g(
  state: number[],
  a: number,
  b: number,
  c: number,
  d: number,
  mx: number,
  my: number,
): void {
  state[a] = add32(add32(state[a]!, state[b]!), mx);
  state[d] = rotr32(state[d]! ^ state[a]!, 16);
  state[c] = add32(state[c]!, state[d]!);
  state[b] = rotr32(state[b]! ^ state[c]!, 12);

  state[a] = add32(add32(state[a]!, state[b]!), my);
  state[d] = rotr32(state[d]! ^ state[a]!, 8);
  state[c] = add32(state[c]!, state[d]!);
  state[b] = rotr32(state[b]! ^ state[c]!, 7);
}

function round(state: number[], msg: readonly number[], roundIndex: number): void {
  const schedule = MSG_SCHEDULE[roundIndex]!;

  g(state, 0, 4, 8, 12, msg[schedule[0]!]!, msg[schedule[1]!]!);
  g(state, 1, 5, 9, 13, msg[schedule[2]!]!, msg[schedule[3]!]!);
  g(state, 2, 6, 10, 14, msg[schedule[4]!]!, msg[schedule[5]!]!);
  g(state, 3, 7, 11, 15, msg[schedule[6]!]!, msg[schedule[7]!]!);

  g(state, 0, 5, 10, 15, msg[schedule[8]!]!, msg[schedule[9]!]!);
  g(state, 1, 6, 11, 12, msg[schedule[10]!]!, msg[schedule[11]!]!);
  g(state, 2, 7, 8, 13, msg[schedule[12]!]!, msg[schedule[13]!]!);
  g(state, 3, 4, 9, 14, msg[schedule[14]!]!, msg[schedule[15]!]!);
}

function compress(
  cv: readonly number[],
  blockWords: readonly number[],
  counter: number,
  blockLen: number,
  flags: number,
): number[] {
  const counterLow = counter >>> 0;
  const counterHigh = Math.floor(counter / 0x100000000) >>> 0;

  const state = [
    cv[0]!,
    cv[1]!,
    cv[2]!,
    cv[3]!,
    cv[4]!,
    cv[5]!,
    cv[6]!,
    cv[7]!,
    IV[0]!,
    IV[1]!,
    IV[2]!,
    IV[3]!,
    counterLow,
    counterHigh,
    blockLen,
    flags,
  ];

  for (let i = 0; i < 7; i++) {
    round(state, blockWords, i);
  }

  return [
    state[0]! ^ state[8]!,
    state[1]! ^ state[9]!,
    state[2]! ^ state[10]!,
    state[3]! ^ state[11]!,
    state[4]! ^ state[12]!,
    state[5]! ^ state[13]!,
    state[6]! ^ state[14]!,
    state[7]! ^ state[15]!,
    state[8]! ^ cv[0]!,
    state[9]! ^ cv[1]!,
    state[10]! ^ cv[2]!,
    state[11]! ^ cv[3]!,
    state[12]! ^ cv[4]!,
    state[13]! ^ cv[5]!,
    state[14]! ^ cv[6]!,
    state[15]! ^ cv[7]!,
  ].map((x) => x >>> 0);
}

class Output {
  constructor(
    readonly inputCV: readonly number[],
    readonly blockWords: readonly number[],
    readonly counter: number,
    readonly blockLen: number,
    readonly flags: number,
  ) {}

  chainingValue(): number[] {
    return compress(
      this.inputCV,
      this.blockWords,
      this.counter,
      this.blockLen,
      this.flags,
    ).slice(0, 8);
  }

  rootBytes(outLen = OUT_LEN): Uint8Array {
    const out = new Uint8Array(outLen);
    let offset = 0;
    let outputBlockCounter = 0;

    while (offset < outLen) {
      const words = compress(
        this.inputCV,
        this.blockWords,
        outputBlockCounter,
        this.blockLen,
        this.flags | ROOT,
      );

      for (let i = 0; i < 16 && offset < outLen; i++) {
        const wordBytes = new Uint8Array(4);
        store32LE(wordBytes, 0, words[i]!);

        for (let j = 0; j < 4 && offset < outLen; j++) {
          out[offset] = wordBytes[j]!;
          offset++;
        }
      }

      outputBlockCounter++;
    }

    return out;
  }
}

function chunkOutput(
  chunk: Uint8Array,
  key: readonly number[],
  chunkCounter: number,
  flags: number,
): Output {
  let cv = [...key];

  const blockCount = Math.max(1, Math.ceil(chunk.length / BLOCK_LEN));

  for (let blockIndex = 0; blockIndex < blockCount; blockIndex++) {
    const blockStart = blockIndex * BLOCK_LEN;
    const block = chunk.subarray(blockStart, blockStart + BLOCK_LEN);
    const blockWords = wordsFromBlock(block);

    const isFirstBlock = blockIndex === 0;
    const isLastBlock = blockIndex === blockCount - 1;

    const blockFlags =
      flags |
      (isFirstBlock ? CHUNK_START : 0) |
      (isLastBlock ? CHUNK_END : 0);

    if (isLastBlock) {
      return new Output(cv, blockWords, chunkCounter, block.length, blockFlags);
    }

    cv = compress(cv, blockWords, chunkCounter, BLOCK_LEN, blockFlags).slice(0, 8);
  }

  throw new Error("unreachable");
}

function parentOutput(
  leftCV: readonly number[],
  rightCV: readonly number[],
  key: readonly number[],
  flags: number,
): Output {
  const blockWords = [...leftCV, ...rightCV];
  return new Output(key, blockWords, 0, BLOCK_LEN, flags | PARENT);
}

function parentCV(
  leftCV: readonly number[],
  rightCV: readonly number[],
  key: readonly number[],
  flags: number,
): number[] {
  return parentOutput(leftCV, rightCV, key, flags).chainingValue();
}

function largestPowerOfTwoLessThan(n: number): number {
  let power = 1;
  while (power * 2 < n) {
    power *= 2;
  }
  return power;
}

function leftLen(inputLen: number): number {
  const fullChunks = Math.floor((inputLen - 1) / CHUNK_LEN);
  return largestPowerOfTwoLessThan(fullChunks + 1) * CHUNK_LEN;
}

function subtreeOutput(
  input: Uint8Array,
  key: readonly number[],
  chunkCounter: number,
  flags: number,
): Output {
  if (input.length <= CHUNK_LEN) {
    return chunkOutput(input, key, chunkCounter, flags);
  }

  const leftLength = leftLen(input.length);

  const left = input.subarray(0, leftLength);
  const right = input.subarray(leftLength);

  const leftCV = subtreeOutput(left, key, chunkCounter, flags).chainingValue();
  const rightCV = subtreeOutput(
    right,
    key,
    chunkCounter + leftLength / CHUNK_LEN,
    flags,
  ).chainingValue();

  return parentOutput(leftCV, rightCV, key, flags);
}

export function blake3(input: Uint8Array | string): Uint8Array {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;

  return subtreeOutput(bytes, IV, 0, 0).rootBytes(OUT_LEN);
}

export function blake3Hex(input: Uint8Array | string): string {
  return [...blake3(input)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function hash (input: string): string {
  return blake3Hex(input).slice(0, 16);
}

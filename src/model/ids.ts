/**
 * ID generation. IDs are `<prefix>_<base36>`. The generator is injectable so
 * generation and tests are fully deterministic (seeded sequence); the app uses
 * a crypto-random seed per session so IDs never collide across projects.
 */
export type IdGenerator = (prefix: string) => string;

export function createSequentialIds(seed = 0): IdGenerator {
  let n = seed;
  return (prefix) => `${prefix}_${(n++).toString(36).padStart(4, '0')}`;
}

export function createRandomIds(): IdGenerator {
  return (prefix) => {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return `${prefix}_${Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 10)}`;
  };
}

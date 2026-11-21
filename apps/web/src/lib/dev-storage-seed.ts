/**
 * Development-only localStorage stress seeder.
 *
 * Visit `/?seedStorage=4` on the Vite dev server to fill a namespaced key with
 * roughly 4 MB of synthetic records, or `/?seedStorage=clear` to remove it.
 * The writer shrinks its target when the browser quota is smaller and reserves
 * room so theme and recent-search preferences keep working. Production builds
 * never import this module.
 */

const SEED_KEY = 'kiddo.dev.storage-seed';
const META_KEY = `${SEED_KEY}.meta`;
const DEFAULT_MEGABYTES = 4;
const MIN_MEGABYTES = 0.25;
const MAX_MEGABYTES = 4;
const MIN_CHARACTERS = 64 * 1024;
const PREFERENCE_RESERVE_CHARS = 2 * 1024;

export interface StorageSeedResult {
  key: string;
  requestedMegabytes: number;
  characters: number;
  estimatedBytes: number;
  reducedToFitQuota: boolean;
  createdAt: string;
}

function clampMegabytes(value: number): number {
  return Math.min(Math.max(value, MIN_MEGABYTES), MAX_MEGABYTES);
}

function buildPayload(targetCharacters: number): string {
  const header = '{"seed":true,"records":[';
  const footer = ']}';
  const records: string[] = [];
  let length = header.length + footer.length;
  let index = 0;

  while (length < targetCharacters) {
    const record = JSON.stringify({
      id: `seed-${index}`,
      caption: 'Synthetic record for the local storage stress seed.',
      tags: ['kiddo', 'glass', 'sage', 'dev'],
      likes: index % 997,
      saved: index % 3 === 0,
      createdAt: new Date(0).toISOString(),
    });
    records.push(record);
    length += record.length + 1;
    index += 1;
  }

  return `${header}${records.join(',')}${footer}`;
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
}

export function clearDevStorageSeed(): boolean {
  try {
    const existed = localStorage.getItem(SEED_KEY) !== null;
    localStorage.removeItem(SEED_KEY);
    localStorage.removeItem(META_KEY);
    return existed;
  } catch {
    return false;
  }
}

export function seedDevStorage(megabytes = DEFAULT_MEGABYTES): StorageSeedResult | null {
  if (!import.meta.env.DEV) return null;

  const requestedMegabytes = clampMegabytes(megabytes);
  const requestedCharacters = Math.floor(requestedMegabytes * 1024 * 1024);
  const initialTarget = Math.max(MIN_CHARACTERS, requestedCharacters - PREFERENCE_RESERVE_CHARS);
  let targetCharacters = initialTarget;

  clearDevStorageSeed();

  try {
    let characters = 0;
    let wrote = false;
    while (targetCharacters >= MIN_CHARACTERS) {
      const payload = buildPayload(targetCharacters);
      try {
        localStorage.setItem(SEED_KEY, payload);
        characters = payload.length;
        wrote = true;
        break;
      } catch (error) {
        if (!isQuotaError(error)) throw error;
        localStorage.removeItem(SEED_KEY);
        targetCharacters = Math.floor(targetCharacters / 2);
      }
    }

    if (!wrote) {
      console.warn('[dev] localStorage quota is too small for the stress seed.');
      return null;
    }

    const createdAt = new Date().toISOString();
    const result: StorageSeedResult = {
      key: SEED_KEY,
      requestedMegabytes,
      characters,
      estimatedBytes: characters * 2,
      reducedToFitQuota: characters < initialTarget,
      createdAt,
    };

    try {
      localStorage.setItem(META_KEY, JSON.stringify(result));
    } catch {
      // The payload is the point of the stress test; metadata is optional.
    }

    console.info(
      `[dev] Seeded ${(characters / (1024 * 1024)).toFixed(2)}M characters into ${SEED_KEY}` +
        (result.reducedToFitQuota ? ' (reduced to fit the browser quota).' : '.'),
    );
    return result;
  } catch (error) {
    console.warn('[dev] Could not seed localStorage.', error);
    return null;
  }
}

/** Reads `?seedStorage` from the URL. Returns null outside dev or without the flag. */
export function maybeSeedDevStorage(search = window.location.search): StorageSeedResult | null {
  if (!import.meta.env.DEV) return null;

  const raw = new URLSearchParams(search).get('seedStorage');
  if (raw === null) return null;

  if (raw.trim().toLowerCase() === 'clear') {
    const existed = clearDevStorageSeed();
    console.info(
      existed ? '[dev] Cleared the localStorage stress seed.' : '[dev] No stress seed to clear.',
    );
    return null;
  }

  const value = raw.trim() === '' ? DEFAULT_MEGABYTES : Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    console.warn('[dev] Expected ?seedStorage=<megabytes> or ?seedStorage=clear.');
    return null;
  }

  return seedDevStorage(value);
}

const { redis } = require('./redis');

async function getOrSetCache(key, fetcher, ttl) {
  if (!redis) {
    return fetcher();
  }

  let cached;
  try {
    cached = await redis.get(key);
  } catch {
    console.warn(`Cache read failed for ${key}; using the data source.`);
    return fetcher();
  }

  if (cached !== null && cached !== undefined) {
    return cached;
  }

  const data = await fetcher();

  if (data !== null && data !== undefined) {
    try {
      await redis.set(key, data, { ex: ttl });
    } catch {
      console.warn(`Cache write failed for ${key}; returning uncached data.`);
    }
  }

  return data;
}

async function invalidateCache(key) {
  if (!redis) {
    return;
  }

  try {
    await redis.del(key);
  } catch {
    console.warn(`Cache invalidation failed for ${key}.`);
  }
}

module.exports = { getOrSetCache, invalidateCache };

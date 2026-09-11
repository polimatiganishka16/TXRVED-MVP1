const { redis } = require('./redis');

async function getOrSetCache(key, fetcher, ttl) {
  if (!redis) {
    return fetcher();
  }

  const cached = await redis.get(key);

  if (cached !== null && cached !== undefined) {
    return cached;
  }

  const data = await fetcher();

  if (data !== null && data !== undefined) {
    await redis.set(key, data, { ex: ttl });
  }

  return data;
}

module.exports = { getOrSetCache };

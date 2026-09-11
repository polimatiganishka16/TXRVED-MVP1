const { Redis } = require('@upstash/redis');

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? Redis.fromEnv() : null;

module.exports = { redis };

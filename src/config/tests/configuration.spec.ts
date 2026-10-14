import configuration from '../configuration';

describe('configuration (redis)', () => {
  const redisDbOriginal = process.env.REDIS_DB;

  afterEach(() => {
    if (redisDbOriginal === undefined) delete process.env.REDIS_DB;
    else process.env.REDIS_DB = redisDbOriginal;
  });

  it('usa o índice 0 quando REDIS_DB não está definido', () => {
    delete process.env.REDIS_DB;

    expect(configuration().redis.db).toBe(0);
  });

  it('converte REDIS_DB para número', () => {
    process.env.REDIS_DB = '2';

    expect(configuration().redis.db).toBe(2);
  });
});

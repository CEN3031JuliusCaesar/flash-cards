export const Snowflake = class Snowflake {
  static lastTime = 0;
  static sequence = 0;
  /**
   * generate
   */
  public static generate() {
    const TIMESTAMP = Date.now();
    if (Snowflake.lastTime === TIMESTAMP) {
      Snowflake.sequence = Snowflake.sequence + 1;
    } else {
      Snowflake.sequence = 0;
    }
    Snowflake.lastTime = TIMESTAMP;
    let result = BigInt(TIMESTAMP) << BigInt(22);
    result = result | BigInt(Snowflake.sequence);
    return result.toString(16);
  }

  public static isSnowflake(snowflake: string) {
    if (snowflake.length !== 16) return false;
    return /^[0-9a-f]+$/.test(snowflake);
  }
};

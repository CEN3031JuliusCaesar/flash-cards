export class Snowflake {
  static readonly singleton = new Snowflake();

  lastTime = 0n;
  sequence = 0n;

  public static generate() {
    return this.singleton.generate();
  }
  public generate() {
    const timestamp = BigInt(Date.now());
    if (this.lastTime === timestamp) {
      this.sequence = this.sequence + 1n;
    } else {
      this.sequence = 0n;
    }
    this.lastTime = timestamp;
    let result = this.lastTime << 22n;
    result = result | this.sequence;
    return result.toString(16);
  }

  public static isSnowflake(snowflake: string) {
    if (snowflake.length !== 16) return false;
    return /^[0-9a-f]+$/.test(snowflake);
  }
}

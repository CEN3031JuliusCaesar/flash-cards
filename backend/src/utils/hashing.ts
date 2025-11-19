function hexToUint8Array(hex: string): Uint8Array<ArrayBuffer> {
  if (hex.length % 2 !== 0) {
    throw new Error("Hex string must have an even number of characters");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export async function pbkdf2(
  password: string,
  saltHex: string, // hex-encoded salt
  iterations: number = 100000,
  keyLength: number = 64, // in bytes
  hash: "SHA-256" | "SHA-512" = "SHA-256",
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const passwordBuffer = enc.encode(password);

  const importedKey = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const salt = hexToUint8Array(saltHex);

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: iterations,
      hash: { name: hash },
    },
    importedKey,
    keyLength * 8,
  );

  return new Uint8Array(derivedBits);
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function genSalt() {
  return crypto.getRandomValues(new Uint8Array(16))
    .reduce((s, b) => s + b.toString(16).padStart(2, "0"), "");
}

if (import.meta.main) {
  const [password, saltHex] = Deno.args;
  if (!password) {
    console.error(
      "Usage: deno run -A hashing.ts <password> [salt_hex] [iterations=100000] [keylen=64] [SHA-256|SHA-512]",
    );
    Deno.exit(1);
  }

  const salt = saltHex || genSalt();

  const key = await pbkdf2(
    password,
    salt,
  );

  console.info("salt:", salt);
  console.info("key:", toHex(key));
}

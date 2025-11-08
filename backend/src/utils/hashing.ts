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
  iterations: number,
  keyLength: number, // in bytes
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

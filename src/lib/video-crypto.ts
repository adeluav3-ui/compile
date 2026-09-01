/**
 * AES-256-CBC encryption/decryption for School Edition video files.
 *
 * At rest: video files are stored as encrypted blobs — no plaintext file
 * ever exists on the school's local disk.
 *
 * Playback: the Electron app calls /api/school/video/[lessonId] which
 * decrypts into memory and streams to the video element. The decrypted
 * bytes are NEVER written back to disk.
 *
 * Key lifecycle:
 *   - Each school has a unique symmetric key stored only in Supabase.
 *   - The Electron app fetches the key during a successful license check.
 *   - If no successful check has occurred in >7 days, the key is withheld
 *     and playback is blocked — enforced locally without needing internet
 *     at the moment of playback.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-cbc" as const;
const KEY_LEN = 32; // 256 bits
const IV_LEN = 16;  // 128 bits

/** Generate a random 256-bit key (hex string). Store this in Supabase per school. */
export function generateKey(): string {
  return randomBytes(KEY_LEN).toString("hex");
}

/**
 * Encrypt a video Buffer. The IV is prepended to the ciphertext so the
 * same function can be used for decryption without storing IV separately.
 */
export function encryptVideo(plaintext: Buffer, keyHex: string): Buffer {
  const key = Buffer.from(keyHex, "hex");
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  return Buffer.concat([iv, cipher.update(plaintext), cipher.final()]);
}

/**
 * Decrypt a video Buffer into memory. Never call fs.writeFile on the result.
 * The first 16 bytes of the input are the IV.
 */
export function decryptVideo(ciphertext: Buffer, keyHex: string): Buffer {
  const key = Buffer.from(keyHex, "hex");
  const iv = ciphertext.subarray(0, IV_LEN);
  const data = ciphertext.subarray(IV_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

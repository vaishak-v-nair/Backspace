import crypto from "crypto";
import fs from "fs";
import path from "path";
import os from "os";
import zlib from "zlib";
import { getBackspaceDir } from "./db.js";

const ALGORITHM = "aes-256-gcm";
const CRYPTO_KEY_FILENAME = "crypto.key";

/**
 * Retrieves or derives a unique 256-bit cryptographic key tied to the local installation.
 *
 * The seed is stored in a dedicated `crypto.key` file (not config.json) to prevent
 * accidental deletion or corruption when other commands modify config.json.
 * Backward compatible: migrates existing seeds from config.json on first run.
 */
export function getLocalEncryptionKey(cwd: string = process.cwd()): Buffer {
  const backspaceDir = getBackspaceDir(cwd);
  const CRYPTO_KEY_PATH = path.join(backspaceDir, CRYPTO_KEY_FILENAME);
  const LEGACY_CONFIG_PATH = path.join(backspaceDir, "config.json");

  let secretSeed: string | null = null;

  // 1. Try reading from the dedicated crypto.key file (preferred)
  try {
    if (fs.existsSync(CRYPTO_KEY_PATH)) {
      const rawContent = fs.readFileSync(CRYPTO_KEY_PATH, "utf8").trim();
      if (rawContent.length > 0) {
        secretSeed = rawContent;
        return crypto.createHash("sha256").update(secretSeed).digest();
      }
      // File exists but is empty — this is a corruption scenario.
      // Generating a new key would make existing encrypted snapshots unrecoverable.
      throw new Error(
        `Encryption key file exists but is empty: ${CRYPTO_KEY_PATH}\n` +
        `This likely means the key was corrupted. Existing encrypted snapshots cannot be recovered without the original key.\n` +
        `If this is a fresh project with no snapshots, delete the file and run 'backspace-ai init' again.`
      );
    }
  } catch (err) {
    // Re-throw our own corruption error, only swallow unexpected read errors
    if (err instanceof Error && err.message.includes('Encryption key file exists but is empty')) {
      throw err;
    }
    // Fall through to migration/generation
  }

  // 2. Backward compatibility: migrate seed from legacy config.json
  try {
    if (fs.existsSync(LEGACY_CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(LEGACY_CONFIG_PATH, "utf8"));
      if (config.local_crypto_seed) {
        secretSeed = config.local_crypto_seed;

        // Migrate: write to dedicated file and remove from config.json
        if (!fs.existsSync(backspaceDir)) {
          fs.mkdirSync(backspaceDir, { recursive: true, mode: 0o700 });
        }
        fs.writeFileSync(CRYPTO_KEY_PATH, secretSeed as string, { mode: 0o400 });

        // Clean up config.json (remove the seed, keep other fields)
        delete config.local_crypto_seed;
        fs.writeFileSync(LEGACY_CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });

        console.log("[Crypto] Migrated encryption key to dedicated crypto.key file.");
        return crypto.createHash("sha256").update(secretSeed as string).digest();
      }
    }
  } catch {
    // Fall through to generation
  }

  // 3. Generate a fresh seed for new installations
  secretSeed = crypto.randomBytes(64).toString("hex");
  try {
    if (!fs.existsSync(backspaceDir)) {
      fs.mkdirSync(backspaceDir, { recursive: true, mode: 0o700 });
    }
    // Write with read-only permissions (0o400) — prevents accidental overwrites
    fs.writeFileSync(CRYPTO_KEY_PATH, secretSeed, { mode: 0o400 });
  } catch (err) {
    console.error("[Crypto] Warning: could not persist encryption key to disk.", err);
  }

  // Derive a rigid 32-byte key via SHA-256 hash
  return crypto.createHash("sha256").update(secretSeed).digest();
}

export interface EncryptedData {
  encryptedPayload: string;
  iv: string;
  tag: string;
}

/**
 * Encrypts arbitrary string payloads securely using hardware-accelerated AES-256-GCM.
 */
export function encryptData(plainText: string, cwd: string = process.cwd()): EncryptedData {
  const key = getLocalEncryptionKey(cwd);
  const iv = crypto.randomBytes(12); // Standard safe length for GCM initialization vectors
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag();

  return {
    encryptedPayload: encrypted,
    iv: iv.toString("hex"),
    tag: tag.toString("hex")
  };
}

/**
 * Decrypts and authenticates payloads. Throws if data has been tampered with or corrupted.
 */
export function decryptData(encryptedPayload: string, ivHex: string, tagHex: string, cwd: string = process.cwd()): string {
  const key = getLocalEncryptionKey(cwd);
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedPayload, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Encrypts an event patch for storage in the events table.
 *
 * Pipeline: brotli compress → AES-256-GCM encrypt → JSON envelope Buffer.
 * Same envelope shape as legacy snapshots so readers share one decoder.
 */
export function encryptEventPayload(patch: string, cwd: string = process.cwd()): Buffer {
  const compressed = zlib.brotliCompressSync(Buffer.from(patch, "utf8"));
  const block = encryptData(compressed.toString("base64"), cwd);
  return Buffer.from(
    JSON.stringify({
      cipher_payload: block.encryptedPayload,
      crypto_iv: block.iv,
      crypto_tag: block.tag,
      compressed: true,
    }),
    "utf8",
  );
}

/**
 * Decodes an event's diff_payload Buffer into the original patch text.
 *
 * Handles all three historical formats:
 *   1. Encrypted JSON envelope (current) — decrypt → base64 → brotli
 *   2. Brotli-compressed raw patch (legacy events)
 *   3. Uncompressed raw patch (oldest legacy data)
 */
export function decryptEventPayload(payload: Buffer | null, cwd: string = process.cwd()): string {
  if (!payload) return "";

  const text = payload.toString("utf8");
  if (text.startsWith("{")) {
    try {
      const envelope = JSON.parse(text) as {
        cipher_payload?: string;
        crypto_iv?: string;
        crypto_tag?: string;
        compressed?: boolean;
      };
      if (envelope.cipher_payload && envelope.crypto_iv && envelope.crypto_tag) {
        let decrypted = decryptData(envelope.cipher_payload, envelope.crypto_iv, envelope.crypto_tag, cwd);
        if (envelope.compressed) {
          decrypted = zlib.brotliDecompressSync(Buffer.from(decrypted, "base64")).toString("utf8");
        }
        return decrypted;
      }
    } catch {
      // Not an envelope (or key mismatch) — fall through to legacy paths
    }
  }

  try {
    return zlib.brotliDecompressSync(payload).toString("utf8");
  } catch {
    return text;
  }
}

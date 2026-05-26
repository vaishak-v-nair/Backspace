import crypto from "crypto";
import fs from "fs";
import path from "path";
import os from "os";
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
      secretSeed = fs.readFileSync(CRYPTO_KEY_PATH, "utf8").trim();
      if (secretSeed && secretSeed.length > 0) {
        return crypto.createHash("sha256").update(secretSeed).digest();
      }
    }
  } catch {
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

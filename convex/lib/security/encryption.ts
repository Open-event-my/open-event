/**
 * Encryption Service
 * 
 * Provides encryption/decryption for sensitive data at rest (API keys, tokens, etc.)
 * Uses AES-256-GCM for authenticated encryption with secure key derivation.
 * 
 * Requirements: 1.5, 3.7, 4.7
 */

/**
 * Configuration for encryption operations
 */
export interface EncryptionConfig {
  algorithm: 'aes-256-gcm';
  keyDerivation: 'pbkdf2';
  iterations: number;
  saltLength: number;
  ivLength: number;
  tagLength: number;
}

/**
 * Result of encryption operation
 */
export interface EncryptedData {
  ciphertext: string; // Base64 encoded
  iv: string; // Base64 encoded initialization vector
  tag: string; // Base64 encoded authentication tag
  salt: string; // Base64 encoded salt (for key derivation)
}

/**
 * Default encryption configuration
 */
const DEFAULT_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyDerivation: 'pbkdf2',
  iterations: 100000, // OWASP recommended minimum
  saltLength: 32, // 256 bits
  ivLength: 12, // 96 bits (recommended for GCM)
  tagLength: 16, // 128 bits
};

/**
 * EncryptionService class
 * 
 * Handles encryption and decryption of sensitive data using AES-256-GCM.
 * Each encryption operation uses a unique salt and IV for maximum security.
 */
export class EncryptionService {
  private config: EncryptionConfig;

  constructor(config: Partial<EncryptionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Encrypt plaintext data
   * 
   * @param plaintext - The data to encrypt
   * @param masterKey - The master encryption key (should be from environment variable)
   * @returns Encrypted data with IV, tag, and salt
   */
  async encrypt(plaintext: string, masterKey: string): Promise<EncryptedData> {
    if (!plaintext) {
      throw new Error('Plaintext cannot be empty');
    }
    if (!masterKey || masterKey.length < 32) {
      throw new Error('Master key must be at least 32 characters');
    }

    // Generate random salt for key derivation
    const salt = this.generateRandomBytes(this.config.saltLength);

    // Derive encryption key from master key using PBKDF2
    const derivedKey = await this.deriveKey(masterKey, salt);

    // Generate random IV (initialization vector)
    const iv = this.generateRandomBytes(this.config.ivLength);

    // Encrypt using AES-256-GCM
    const { ciphertext, tag } = await this.encryptAESGCM(
      plaintext,
      derivedKey,
      iv
    );

    return {
      ciphertext: this.toBase64(ciphertext),
      iv: this.toBase64(iv),
      tag: this.toBase64(tag),
      salt: this.toBase64(salt),
    };
  }

  /**
   * Decrypt encrypted data
   * 
   * @param encrypted - The encrypted data object
   * @param masterKey - The master encryption key (same as used for encryption)
   * @returns Decrypted plaintext
   */
  async decrypt(encrypted: EncryptedData, masterKey: string): Promise<string> {
    if (!encrypted.ciphertext || !encrypted.iv || !encrypted.tag || !encrypted.salt) {
      throw new Error('Invalid encrypted data: missing required fields');
    }
    if (!masterKey || masterKey.length < 32) {
      throw new Error('Master key must be at least 32 characters');
    }

    // Convert from base64
    const ciphertext = this.fromBase64(encrypted.ciphertext);
    const iv = this.fromBase64(encrypted.iv);
    const tag = this.fromBase64(encrypted.tag);
    const salt = this.fromBase64(encrypted.salt);

    // Derive the same encryption key using the stored salt
    const derivedKey = await this.deriveKey(masterKey, salt);

    // Decrypt using AES-256-GCM
    const plaintext = await this.decryptAESGCM(ciphertext, derivedKey, iv, tag);

    return plaintext;
  }

  /**
   * Hash data using SHA-256 (for non-reversible hashing like passwords)
   * 
   * @param data - The data to hash
   * @returns Hex-encoded hash
   */
  async hash(data: string): Promise<string> {
    if (!data) {
      throw new Error('Data cannot be empty');
    }

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);

    return this.toHex(new Uint8Array(hashBuffer));
  }

  /**
   * Compare data with a hash (constant-time comparison)
   * 
   * @param data - The data to compare
   * @param hash - The hash to compare against
   * @returns True if data matches hash
   */
  async compareHash(data: string, hash: string): Promise<boolean> {
    const dataHash = await this.hash(data);
    return this.constantTimeCompare(dataHash, hash);
  }

  /**
   * Derive encryption key from master key using PBKDF2
   * 
   * @param masterKey - The master key
   * @param salt - Random salt
   * @returns Derived key as CryptoKey
   */
  private async deriveKey(
    masterKey: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode(masterKey);

    // Import master key as raw key material
    const importedKey = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive AES-GCM key using PBKDF2
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt.buffer as ArrayBuffer,
        iterations: this.config.iterations,
        hash: 'SHA-256',
      },
      importedKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    return derivedKey;
  }

  /**
   * Encrypt data using AES-256-GCM
   * 
   * @param plaintext - Data to encrypt
   * @param key - Encryption key
   * @param iv - Initialization vector
   * @returns Ciphertext and authentication tag
   */
  private async encryptAESGCM(
    plaintext: string,
    key: CryptoKey,
    iv: Uint8Array
  ): Promise<{ ciphertext: Uint8Array; tag: Uint8Array }> {
    const encoder = new TextEncoder();
    const plaintextBuffer = encoder.encode(plaintext);

    // Encrypt with AES-GCM (includes authentication tag)
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer as ArrayBuffer,
        tagLength: this.config.tagLength * 8, // Convert bytes to bits
      },
      key,
      plaintextBuffer
    );

    // AES-GCM returns ciphertext + tag concatenated
    const encrypted = new Uint8Array(encryptedBuffer);
    const ciphertext = encrypted.slice(0, -this.config.tagLength);
    const tag = encrypted.slice(-this.config.tagLength);

    return { ciphertext, tag };
  }

  /**
   * Decrypt data using AES-256-GCM
   * 
   * @param ciphertext - Encrypted data
   * @param key - Decryption key
   * @param iv - Initialization vector
   * @param tag - Authentication tag
   * @returns Decrypted plaintext
   */
  private async decryptAESGCM(
    ciphertext: Uint8Array,
    key: CryptoKey,
    iv: Uint8Array,
    tag: Uint8Array
  ): Promise<string> {
    // Concatenate ciphertext and tag for AES-GCM
    const encryptedData = new Uint8Array(ciphertext.length + tag.length);
    encryptedData.set(ciphertext);
    encryptedData.set(tag, ciphertext.length);

    try {
      // Decrypt with AES-GCM (verifies authentication tag)
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv.buffer as ArrayBuffer,
          tagLength: this.config.tagLength * 8, // Convert bytes to bits
        },
        key,
        encryptedData
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      throw new Error('Decryption failed: invalid ciphertext or authentication tag');
    }
  }

  /**
   * Generate cryptographically secure random bytes
   * 
   * @param length - Number of bytes to generate
   * @returns Random bytes
   */
  private generateRandomBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  }

  /**
   * Convert bytes to base64 string
   * 
   * @param bytes - Bytes to convert
   * @returns Base64 string
   */
  private toBase64(bytes: Uint8Array): string {
    // Convert to binary string
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    // Encode to base64
    return btoa(binary);
  }

  /**
   * Convert base64 string to bytes
   * 
   * @param base64 - Base64 string
   * @returns Bytes
   */
  private fromBase64(base64: string): Uint8Array {
    // Decode from base64
    const binary = atob(base64);
    // Convert to bytes
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Convert bytes to hex string
   * 
   * @param bytes - Bytes to convert
   * @returns Hex string
   */
  private toHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Constant-time string comparison (prevents timing attacks)
   * 
   * @param a - First string
   * @param b - Second string
   * @returns True if strings are equal
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}

/**
 * Create a singleton instance of EncryptionService
 */
export const encryptionService = new EncryptionService();

/**
 * Helper function to encrypt API keys
 * 
 * @param apiKey - The API key to encrypt
 * @param masterKey - The master encryption key from environment
 * @returns Encrypted API key data
 */
export async function encryptAPIKey(
  apiKey: string,
  masterKey: string
): Promise<EncryptedData> {
  return encryptionService.encrypt(apiKey, masterKey);
}

/**
 * Helper function to decrypt API keys
 * 
 * @param encrypted - The encrypted API key data
 * @param masterKey - The master encryption key from environment
 * @returns Decrypted API key
 */
export async function decryptAPIKey(
  encrypted: EncryptedData,
  masterKey: string
): Promise<string> {
  return encryptionService.decrypt(encrypted, masterKey);
}

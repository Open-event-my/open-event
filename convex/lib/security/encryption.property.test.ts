/**
 * Property-Based Tests for Encryption Service
 *
 * Feature: production-readiness, Property 4: Encryption at Rest
 * Validates: Requirements 1.5, 3.7, 4.7
 *
 * These tests verify that encryption works correctly across all possible inputs
 * using property-based testing with fast-check.
 */

import { describe, test, expect } from 'vitest'
import fc from 'fast-check'
import { EncryptionService, encryptAPIKey, decryptAPIKey } from './encryption'

describe('Encryption Service - Property Tests', () => {
  /**
   * Property 4: Encryption at Rest
   * For any sensitive data field (API keys, tokens, passwords),
   * the stored value in the database should be encrypted and not readable as plaintext.
   */

  test('Property 4.1: Round-trip encryption preserves data', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }), // plaintext
        fc.string({ minLength: 32, maxLength: 128 }), // master key
        async (plaintext, masterKey) => {
          const service = new EncryptionService()

          // Encrypt then decrypt should return original plaintext
          const encrypted = await service.encrypt(plaintext, masterKey)
          const decrypted = await service.decrypt(encrypted, masterKey)

          expect(decrypted).toBe(plaintext)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 4.2: Encrypted data is not readable as plaintext', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }), // plaintext
        fc.string({ minLength: 32, maxLength: 128 }), // master key
        async (plaintext, masterKey) => {
          const service = new EncryptionService()

          // Encrypt the data
          const encrypted = await service.encrypt(plaintext, masterKey)

          // Ciphertext should not contain the plaintext
          expect(encrypted.ciphertext).not.toContain(plaintext)

          // Ciphertext should be different from plaintext
          expect(encrypted.ciphertext).not.toBe(plaintext)

          // IV, tag, and salt should not contain plaintext
          expect(encrypted.iv).not.toContain(plaintext)
          expect(encrypted.tag).not.toContain(plaintext)
          expect(encrypted.salt).not.toContain(plaintext)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 4.3: Same plaintext with different salts produces different ciphertext', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }), // plaintext
        fc.string({ minLength: 32, maxLength: 128 }), // master key
        async (plaintext, masterKey) => {
          const service = new EncryptionService()

          // Encrypt the same plaintext twice
          const encrypted1 = await service.encrypt(plaintext, masterKey)
          const encrypted2 = await service.encrypt(plaintext, masterKey)

          // Ciphertexts should be different (due to different salts and IVs)
          expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext)
          expect(encrypted1.iv).not.toBe(encrypted2.iv)
          expect(encrypted1.salt).not.toBe(encrypted2.salt)

          // But both should decrypt to the same plaintext
          const decrypted1 = await service.decrypt(encrypted1, masterKey)
          const decrypted2 = await service.decrypt(encrypted2, masterKey)
          expect(decrypted1).toBe(plaintext)
          expect(decrypted2).toBe(plaintext)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 4.4: Decryption with wrong key fails', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }), // plaintext
        fc.string({ minLength: 32, maxLength: 128 }), // correct key
        fc.string({ minLength: 32, maxLength: 128 }), // wrong key
        async (plaintext, correctKey, wrongKey) => {
          // Skip if keys are the same
          fc.pre(correctKey !== wrongKey)

          const service = new EncryptionService()

          // Encrypt with correct key
          const encrypted = await service.encrypt(plaintext, correctKey)

          // Decryption with wrong key should fail
          await expect(service.decrypt(encrypted, wrongKey)).rejects.toThrow()
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 4.5: Tampering with ciphertext causes decryption failure', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }), // plaintext
        fc.string({ minLength: 32, maxLength: 128 }), // master key
        fc.integer({ min: 0, max: 10 }), // position to tamper
        async (plaintext, masterKey, tamperPos) => {
          const service = new EncryptionService()

          // Encrypt the data
          const encrypted = await service.encrypt(plaintext, masterKey)

          // Tamper with the ciphertext by flipping a bit
          const ciphertextBytes = atob(encrypted.ciphertext)
          if (ciphertextBytes.length > tamperPos) {
            const tamperedBytes = ciphertextBytes.split('')
            const originalChar = tamperedBytes[tamperPos]
            tamperedBytes[tamperPos] = String.fromCharCode(originalChar.charCodeAt(0) ^ 1)
            const tamperedCiphertext = btoa(tamperedBytes.join(''))

            const tamperedEncrypted = {
              ...encrypted,
              ciphertext: tamperedCiphertext,
            }

            // Decryption should fail due to authentication tag mismatch
            await expect(service.decrypt(tamperedEncrypted, masterKey)).rejects.toThrow()
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 4.6: API key encryption helpers work correctly', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 32, maxLength: 64 }), // API key
        fc.string({ minLength: 32, maxLength: 128 }), // master key
        async (apiKey, masterKey) => {
          // Encrypt API key
          const encrypted = await encryptAPIKey(apiKey, masterKey)

          // Encrypted data should have all required fields
          expect(encrypted.ciphertext).toBeDefined()
          expect(encrypted.iv).toBeDefined()
          expect(encrypted.tag).toBeDefined()
          expect(encrypted.salt).toBeDefined()

          // Decrypt API key
          const decrypted = await decryptAPIKey(encrypted, masterKey)

          // Should match original
          expect(decrypted).toBe(apiKey)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 4.7: Hash function is deterministic', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }), // data
        async (data) => {
          const service = new EncryptionService()

          // Hash the same data twice
          const hash1 = await service.hash(data)
          const hash2 = await service.hash(data)

          // Hashes should be identical
          expect(hash1).toBe(hash2)

          // Hash should be hex string of correct length (SHA-256 = 64 hex chars)
          expect(hash1).toMatch(/^[0-9a-f]{64}$/)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 4.8: Different data produces different hashes', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }), // data1
        fc.string({ minLength: 1, maxLength: 1000 }), // data2
        async (data1, data2) => {
          // Skip if data is the same
          fc.pre(data1 !== data2)

          const service = new EncryptionService()

          // Hash both pieces of data
          const hash1 = await service.hash(data1)
          const hash2 = await service.hash(data2)

          // Hashes should be different
          expect(hash1).not.toBe(hash2)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 4.9: compareHash correctly validates matching data', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }), // data
        async (data) => {
          const service = new EncryptionService()

          // Hash the data
          const hash = await service.hash(data)

          // Compare should return true for matching data
          const matches = await service.compareHash(data, hash)
          expect(matches).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 4.10: compareHash correctly rejects non-matching data', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }), // original data
        fc.string({ minLength: 1, maxLength: 1000 }), // different data
        async (originalData, differentData) => {
          // Skip if data is the same
          fc.pre(originalData !== differentData)

          const service = new EncryptionService()

          // Hash the original data
          const hash = await service.hash(originalData)

          // Compare should return false for different data
          const matches = await service.compareHash(differentData, hash)
          expect(matches).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 4.11: Empty plaintext is rejected', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 32, maxLength: 128 }), // master key
        async (masterKey) => {
          const service = new EncryptionService()

          // Encrypting empty string should throw
          await expect(service.encrypt('', masterKey)).rejects.toThrow('Plaintext cannot be empty')
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 4.12: Short master key is rejected', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }), // plaintext
        fc.string({ minLength: 1, maxLength: 31 }), // short key
        async (plaintext, shortKey) => {
          const service = new EncryptionService()

          // Encrypting with short key should throw
          await expect(service.encrypt(plaintext, shortKey)).rejects.toThrow(
            'Master key must be at least 32 characters'
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 4.13: Encrypted data structure is complete', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }), // plaintext
        fc.string({ minLength: 32, maxLength: 128 }), // master key
        async (plaintext, masterKey) => {
          const service = new EncryptionService()

          // Encrypt the data
          const encrypted = await service.encrypt(plaintext, masterKey)

          // All fields should be present and non-empty
          expect(encrypted.ciphertext).toBeTruthy()
          expect(encrypted.iv).toBeTruthy()
          expect(encrypted.tag).toBeTruthy()
          expect(encrypted.salt).toBeTruthy()

          // All fields should be valid base64
          expect(() => atob(encrypted.ciphertext)).not.toThrow()
          expect(() => atob(encrypted.iv)).not.toThrow()
          expect(() => atob(encrypted.tag)).not.toThrow()
          expect(() => atob(encrypted.salt)).not.toThrow()
        }
      ),
      { numRuns: 100 }
    )
  })
})

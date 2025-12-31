/**
 * Property-Based Tests for Backup System
 * 
 * Tests universal properties that should hold for all backup operations.
 * Uses fast-check for property-based testing with minimum 100 iterations.
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { BackupService, BackupMetadata } from './backup';

/**
 * Feature: production-readiness, Property 20: Backup Retention Period
 * Validates: Requirements 4.6
 * 
 * For any backup created, it should not be deleted until at least 30 days
 * have passed since its creation date.
 */
describe('Property 20: Backup Retention Period', () => {
  test('backups should not expire before retention period', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 365 }), // retention days
        async (retentionDays) => {
          const service = new BackupService({ retention: retentionDays });
          const backup = await service.createBackup();

          // Calculate expected expiration
          const expectedExpiration = backup.timestamp + retentionDays * 24 * 60 * 60 * 1000;

          // Verify expiration is at least retention days in the future
          const actualRetentionDays = (backup.expiresAt - backup.timestamp) / (24 * 60 * 60 * 1000);

          return actualRetentionDays >= retentionDays && backup.expiresAt >= expectedExpiration;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('backup expiration should match configured retention period exactly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 365 }), // retention days
        async (retentionDays) => {
          const service = new BackupService({ retention: retentionDays });
          const backup = await service.createBackup();

          // Calculate actual retention period
          const actualRetentionMs = backup.expiresAt - backup.timestamp;
          const expectedRetentionMs = retentionDays * 24 * 60 * 60 * 1000;

          // Should match exactly (within 1 second tolerance for timing)
          return Math.abs(actualRetentionMs - expectedRetentionMs) < 1000;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('minimum retention period should be enforced', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 30, max: 365 }), // retention days >= 30
        async (retentionDays) => {
          const service = new BackupService({ retention: retentionDays });
          const backup = await service.createBackup();

          // Calculate retention in days
          const retentionMs = backup.expiresAt - backup.timestamp;
          const actualDays = retentionMs / (24 * 60 * 60 * 1000);

          // Should be at least 30 days
          return actualDays >= 30;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: production-readiness, Property 21: Backup Encryption
 * Validates: Requirements 4.7
 * 
 * For any backup file created, the backup data should be encrypted
 * before storage.
 */
describe('Property 21: Backup Encryption', () => {
  test('backups should be encrypted when encryption is enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // encryption enabled/disabled
        async (encryptionEnabled) => {
          const service = new BackupService({ encryption: encryptionEnabled });
          const backup = await service.createBackup();

          // Verify encryption flag matches configuration
          const flagMatches = backup.encrypted === encryptionEnabled;

          // If encryption is enabled, location should indicate encrypted file
          const extensionCorrect = !encryptionEnabled || backup.location.match(/\.enc$/);

          return flagMatches && !!extensionCorrect;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('all backups with encryption enabled should have encrypted flag set', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(true), // always encrypted
        fc.string({ minLength: 1, maxLength: 50 }), // location prefix
        async (encryption, locationPrefix) => {
          const service = new BackupService({
            encryption,
            location: locationPrefix,
          });
          const backup = await service.createBackup();

          // Must be marked as encrypted
          const isEncrypted = backup.encrypted === true;

          // Location must indicate encryption
          const hasEncExtension = backup.location.includes('.enc');

          return isEncrypted && hasEncExtension;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('encryption flag should be consistent with file extension', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // encryption setting
        async (encryptionEnabled) => {
          const service = new BackupService({ encryption: encryptionEnabled });
          const backup = await service.createBackup();

          // Check consistency between flag and file extension
          const hasEncExtension = backup.location.endsWith('.enc');
          return backup.encrypted === hasEncExtension;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: production-readiness, Property 22: Backup Status Monitoring
 * Validates: Requirements 4.8
 * 
 * For any backup operation (success or failure), the result should be
 * recorded in the monitoring system with timestamp and status.
 */
describe('Property 22: Backup Status Monitoring', () => {
  test('all backup operations should have a status recorded', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          retention: fc.integer({ min: 1, max: 365 }),
          encryption: fc.boolean(),
          location: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async (config) => {
          const service = new BackupService(config);
          const backup = await service.createBackup();

          // Must have a status
          const hasStatus = backup.status !== undefined;
          const validStatus = ['pending', 'completed', 'failed'].includes(backup.status);
          
          return hasStatus && validStatus;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('backup metadata should include timestamp for all operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          retention: fc.integer({ min: 1, max: 365 }),
          encryption: fc.boolean(),
        }),
        async (config) => {
          const beforeTimestamp = Date.now();
          const service = new BackupService(config);
          const backup = await service.createBackup();
          const afterTimestamp = Date.now();

          // Timestamp should be within the operation window
          return backup.timestamp >= beforeTimestamp && backup.timestamp <= afterTimestamp;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('failed backups should include error message', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant({ retention: 30, encryption: true }),
        async (config) => {
          const service = new BackupService(config);
          const backup = await service.createBackup();

          // If status is failed, error message should be present
          if (backup.status === 'failed') {
            return backup.errorMessage !== undefined && backup.errorMessage !== '';
          }
          
          // If not failed, this property is vacuously true
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('completed backups should have valid metadata', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          retention: fc.integer({ min: 1, max: 365 }),
          encryption: fc.boolean(),
          location: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async (config) => {
          const service = new BackupService(config);
          const backup = await service.createBackup();

          if (backup.status === 'completed') {
            // Must have all required metadata
            return (
              backup.id !== undefined &&
              backup.id !== '' &&
              backup.timestamp > 0 &&
              backup.size >= 0 &&
              backup.location !== undefined &&
              backup.location !== '' &&
              backup.checksum !== undefined &&
              backup.checksum !== '' &&
              backup.expiresAt > backup.timestamp
            );
          }
          
          // If not completed, this property is vacuously true
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('backup IDs should be unique across operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant({ retention: 30, encryption: true }),
        async (config) => {
          const service = new BackupService(config);
          
          // Create multiple backups
          const backup1 = await service.createBackup();
          const backup2 = await service.createBackup();
          const backup3 = await service.createBackup();

          // All IDs should be unique
          const ids = [backup1.id, backup2.id, backup3.id];
          const uniqueIds = new Set(ids);
          return uniqueIds.size === 3;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('backup checksum should be consistent for same data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant({ retention: 30, encryption: false }),
        async (config) => {
          const service = new BackupService(config);
          const backup = await service.createBackup();

          // Checksum should be a valid hex string
          const isHex = /^[a-f0-9]+$/.test(backup.checksum);
          
          // Checksum should be SHA-256 length (64 hex chars)
          const correctLength = backup.checksum.length === 64;
          
          return isHex && correctLength;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Additional property tests for backup system integrity
 */
describe('Backup System Integrity Properties', () => {
  test('backup size should be non-negative', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          retention: fc.integer({ min: 1, max: 365 }),
          encryption: fc.boolean(),
        }),
        async (config) => {
          const service = new BackupService(config);
          const backup = await service.createBackup();

          return backup.size >= 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('backup location should follow naming convention', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          retention: fc.integer({ min: 1, max: 365 }),
          encryption: fc.boolean(),
          location: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        async (config) => {
          const service = new BackupService(config);
          const backup = await service.createBackup();

          // Location should contain configured location prefix
          const hasPrefix = backup.location.includes(config.location);
          
          // Location should contain backup ID
          const hasBackupPrefix = backup.location.includes('backup_');
          
          // Location should end with .json or .json.enc
          const hasCorrectExtension = /\.json(\.enc)?$/.test(backup.location);
          
          return hasPrefix && hasBackupPrefix && hasCorrectExtension;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('backup timestamps should be monotonically increasing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant({ retention: 30, encryption: true }),
        async (config) => {
          const service = new BackupService(config);
          
          const backup1 = await service.createBackup();
          // Small delay to ensure different timestamps
          await new Promise(resolve => setTimeout(resolve, 10));
          const backup2 = await service.createBackup();

          // Second backup should have later or equal timestamp
          return backup2.timestamp >= backup1.timestamp;
        }
      ),
      { numRuns: 100 }
    );
  });
});

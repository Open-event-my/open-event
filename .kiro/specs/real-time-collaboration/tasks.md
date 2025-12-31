# Implementation Plan: Real-Time Collaboration

## Overview

This implementation plan breaks down the real-time collaboration feature into discrete, manageable tasks. The plan follows a phased approach: core presence first, then collaboration engine, permissions, activity/notifications, and finally analytics. Each phase builds on the previous, with checkpoints to ensure stability.

Testing tasks are marked as optional (*) to allow for faster MVP delivery if needed.

## Tasks

### Phase 1: Core Presence System

- [ ] 1. Set up collaboration infrastructure
  - Create `convex/lib/collaboration/` directory structure
  - Add collaboration-related tables to `convex/schema.ts`
  - Create TypeScript interfaces for all collaboration types
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 2. Implement presence manager
  - [ ] 2.1 Create presence service
    - Implement `PresenceManager` class in `convex/lib/collaboration/presence.ts`
    - Add join, leave, and heartbeat functions
    - Implement stale presence cleanup
    - _Requirements: 1.1, 1.2_
  
  - [ ] 2.2 Write property test for presence join visibility
    - **Property 1: Presence Join Visibility**
    - **Validates: Requirements 1.1**
  
  - [ ] 2.3 Write property test for presence leave cleanup
    - **Property 2: Presence Leave Cleanup**
    - **Validates: Requirements 1.2**

- [ ] 3. Implement field-level presence
  - [ ] 3.1 Add field lock tracking
    - Implement setActiveField and getActiveField functions
    - Add field lock indicators to presence state
    - _Requirements: 1.3_
  
  - [ ] 3.2 Write property test for field-level presence
    - **Property 3: Field-Level Presence Indicator**
    - **Validates: Requirements 1.3**

- [ ] 4. Implement presence hook (frontend)
  - [ ] 4.1 Create usePresence hook
    - Implement `usePresence` hook in `src/hooks/usePresence.ts`
    - Add automatic heartbeat management
    - Handle connection/disconnection events
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ] 4.2 Create presence indicator components
    - Create `PresenceAvatars` component for showing online users
    - Create `FieldPresenceIndicator` component for field-level presence
    - _Requirements: 1.1, 1.3, 1.5_

- [ ] 5. Write property test for concurrent capacity
  - **Property 4: Concurrent Collaborator Capacity**
  - **Validates: Requirements 1.4**

- [ ] 6. Checkpoint - Presence system verification
  - Test presence join/leave flow
  - Verify field-level presence indicators
  - Test with multiple concurrent users
  - Ensure all tests pass, ask the user if questions arise

### Phase 2: Collaboration Engine

- [ ] 7. Implement collaboration engine core
  - [ ] 7.1 Create collaboration engine service
    - Implement `CollaborationEngine` class in `convex/lib/collaboration/engine.ts`
    - Add edit application with conflict detection
    - Implement last-write-wins resolution
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ] 7.2 Write property test for non-conflicting edit preservation
    - **Property 5: Non-Conflicting Edit Preservation**
    - **Validates: Requirements 2.1**
  
  - [ ] 7.3 Write property test for conflict resolution
    - **Property 6: Conflict Resolution Consistency**
    - **Validates: Requirements 2.2**

- [ ] 8. Implement real-time sync
  - [ ] 8.1 Add real-time propagation
    - Implement change broadcasting via Convex subscriptions
    - Add latency tracking for sync operations
    - _Requirements: 2.3_
  
  - [ ] 8.2 Write property test for real-time sync latency
    - **Property 7: Real-Time Sync Latency**
    - **Validates: Requirements 2.3, 4.1, 6.1, 7.5, 8.4**

- [ ] 9. Implement optimistic updates
  - [ ] 9.1 Create optimistic update manager
    - Implement `OptimisticUpdateManager` in `src/lib/collaboration/optimisticUpdates.ts`
    - Add apply, confirm, and rollback functions
    - _Requirements: 2.4_
  
  - [ ] 9.2 Write property test for optimistic update rollback
    - **Property 8: Optimistic Update Rollback**
    - **Validates: Requirements 2.4**

- [ ] 10. Implement offline support
  - [ ] 10.1 Add offline queue
    - Implement local change queue in IndexedDB
    - Add sync-on-reconnect logic
    - _Requirements: 2.5_
  
  - [ ] 10.2 Write property test for offline queue and sync
    - **Property 9: Offline Queue and Sync**
    - **Validates: Requirements 2.5**

- [ ] 11. Integrate collaboration with event editing
  - [ ] 11.1 Update event edit forms
    - Wrap event edit mutations with collaboration engine
    - Add conflict notification UI
    - Show real-time updates from other users
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 12. Checkpoint - Collaboration engine verification
  - Test concurrent editing scenarios
  - Verify conflict resolution
  - Test offline/online transitions
  - Ensure all tests pass, ask the user if questions arise

### Phase 3: Permission System

- [ ] 13. Implement permission service
  - [ ] 13.1 Create permission service
    - Implement `PermissionService` class in `convex/lib/collaboration/permissions.ts`
    - Add permission level definitions and checks
    - Implement permission enforcement middleware
    - _Requirements: 3.2, 3.3, 3.4_
  
  - [ ] 13.2 Write property test for permission level enforcement
    - **Property 11: Permission Level Enforcement**
    - **Validates: Requirements 3.2**
  
  - [ ] 13.3 Write property test for permission change immediacy
    - **Property 12: Permission Change Immediacy**
    - **Validates: Requirements 3.3**

- [ ] 14. Implement invitation system
  - [ ] 14.1 Create invitation service
    - Implement invitation token generation
    - Add email sending via Resend
    - Implement invitation acceptance flow
    - _Requirements: 3.1, 3.6_
  
  - [ ] 14.2 Write property test for invitation token security
    - **Property 10: Invitation Token Security**
    - **Validates: Requirements 3.1**

- [ ] 15. Implement access revocation
  - [ ] 15.1 Add revocation functionality
    - Implement revokeAccess function
    - Add session termination on revocation
    - _Requirements: 3.4, 3.5_
  
  - [ ] 15.2 Write property test for access revocation completeness
    - **Property 13: Access Revocation Completeness**
    - **Validates: Requirements 3.4, 3.5**

- [ ] 16. Create collaborator management UI
  - [ ] 16.1 Build collaborator management page
    - Create collaborator list component
    - Add invite collaborator modal
    - Add permission editing UI
    - Add revoke access functionality
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_

- [ ] 17. Checkpoint - Permission system verification
  - Test invitation flow end-to-end
  - Verify permission enforcement
  - Test access revocation
  - Ensure all tests pass, ask the user if questions arise

### Phase 4: Activity Feed & Notifications

- [ ] 18. Implement activity service
  - [ ] 18.1 Create activity service
    - Implement `ActivityService` class in `convex/lib/collaboration/activity.ts`
    - Add activity logging for all event operations
    - Implement activity grouping logic
    - _Requirements: 4.1, 4.2, 4.3, 4.5_
  
  - [ ] 18.2 Write property test for activity content completeness
    - **Property 14: Activity Content Completeness**
    - **Validates: Requirements 4.2**
  
  - [ ] 18.3 Write property test for activity grouping
    - **Property 15: Activity Grouping**
    - **Validates: Requirements 4.3**
  
  - [ ] 18.4 Write property test for activity retention limit
    - **Property 16: Activity Retention Limit**
    - **Validates: Requirements 4.5**

- [ ] 19. Create activity feed UI
  - [ ] 19.1 Build activity feed component
    - Create `ActivityFeed` component
    - Add real-time activity updates
    - Implement click-to-navigate functionality
    - _Requirements: 4.1, 4.2, 4.4_

- [ ] 20. Implement notification service
  - [ ] 20.1 Create notification service
    - Implement `NotificationService` class in `convex/lib/collaboration/notifications.ts`
    - Add multi-channel notification delivery
    - Implement notification batching
    - _Requirements: 9.1, 9.3, 9.4, 9.5_
  
  - [ ] 20.2 Write property test for notification preference respect
    - **Property 30: Notification Preference Respect**
    - **Validates: Requirements 9.1, 9.3**
  
  - [ ] 20.3 Write property test for notification batching
    - **Property 31: Notification Batching**
    - **Validates: Requirements 9.4**
  
  - [ ] 20.4 Write property test for critical notification bypass
    - **Property 32: Critical Notification Bypass**
    - **Validates: Requirements 9.5**

- [ ] 21. Implement task collaboration features
  - [ ] 21.1 Add task assignment notifications
    - Implement task assignment notification triggers
    - Add @mention parsing and notification
    - Implement deadline reminders
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ] 21.2 Write property test for task assignment notification
    - **Property 17: Task Assignment Notification**
    - **Validates: Requirements 5.1**
  
  - [ ] 21.3 Write property test for task real-time updates
    - **Property 18: Task Real-Time Updates**
    - **Validates: Requirements 5.2**
  
  - [ ] 21.4 Write property test for mention notification delivery
    - **Property 19: Mention Notification Delivery**
    - **Validates: Requirements 5.3, 9.2**
  
  - [ ] 21.5 Write property test for task deadline reminder
    - **Property 20: Task Deadline Reminder**
    - **Validates: Requirements 5.4**

- [ ] 22. Create notification center UI
  - [ ] 22.1 Build notification center
    - Create notification dropdown component
    - Add notification preferences page
    - Implement mark-as-read functionality
    - _Requirements: 9.1, 9.3_

- [ ] 23. Checkpoint - Activity and notifications verification
  - Test activity feed updates
  - Verify notification delivery across channels
  - Test notification batching
  - Ensure all tests pass, ask the user if questions arise

### Phase 5: Budget & Vendor Collaboration

- [ ] 24. Implement budget collaboration
  - [ ] 24.1 Add budget collaboration features
    - Implement real-time budget updates
    - Add last-modifier tracking
    - Implement approval workflow for large changes
    - Add budget audit trail
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ] 24.2 Write property test for budget approval workflow
    - **Property 21: Budget Approval Workflow**
    - **Validates: Requirements 6.3**
  
  - [ ] 24.3 Write property test for budget audit trail
    - **Property 22: Budget Audit Trail**
    - **Validates: Requirements 6.4**

- [ ] 25. Implement vendor/sponsor collaboration
  - [ ] 25.1 Add vendor collaboration features
    - Implement vendor assignment to collaborators
    - Add collaborative notes
    - Implement status change notifications
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ] 25.2 Write property test for vendor assignment notification
    - **Property 23: Vendor Assignment Notification**
    - **Validates: Requirements 7.1**
  
  - [ ] 25.3 Write property test for vendor assignment tracking
    - **Property 24: Vendor Assignment Tracking**
    - **Validates: Requirements 7.2**
  
  - [ ] 25.4 Write property test for collaborative notes visibility
    - **Property 25: Collaborative Notes Visibility**
    - **Validates: Requirements 7.4**

- [ ] 26. Checkpoint - Budget and vendor collaboration verification
  - Test budget approval workflow
  - Verify vendor assignment and notifications
  - Test collaborative notes
  - Ensure all tests pass, ask the user if questions arise

### Phase 6: Playground Collaboration

- [ ] 27. Implement playground collaboration
  - [ ] 27.1 Add cursor sharing
    - Implement cursor position broadcasting
    - Create cursor indicator components
    - _Requirements: 8.1_
  
  - [ ] 27.2 Write property test for cursor position sharing
    - **Property 26: Cursor Position Sharing**
    - **Validates: Requirements 8.1**
  
  - [ ] 27.3 Add object locking
    - Implement object selection locking
    - Create lock indicator UI
    - _Requirements: 8.3_
  
  - [ ] 27.4 Write property test for object locking
    - **Property 28: Object Locking**
    - **Validates: Requirements 8.3**
  
  - [ ] 27.5 Implement collaborative undo/redo
    - Modify undo/redo to respect multi-user context
    - Track operation ownership
    - _Requirements: 8.5_
  
  - [ ] 27.6 Write property test for collaborative undo/redo
    - **Property 29: Collaborative Undo/Redo**
    - **Validates: Requirements 8.5**

- [ ] 28. Write property test for concurrent playground editing
  - **Property 27: Concurrent Playground Editing**
  - **Validates: Requirements 8.2**

- [ ] 29. Checkpoint - Playground collaboration verification
  - Test cursor sharing with multiple users
  - Verify object locking behavior
  - Test collaborative undo/redo
  - Ensure all tests pass, ask the user if questions arise

### Phase 7: Analytics & Polish

- [ ] 30. Implement collaboration analytics
  - [ ] 30.1 Create analytics service
    - Implement `CollaborationAnalyticsService` in `convex/lib/collaboration/analytics.ts`
    - Add contribution tracking
    - Implement time tracking
    - Add peak period identification
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ] 30.2 Write property test for contribution tracking accuracy
    - **Property 33: Contribution Tracking Accuracy**
    - **Validates: Requirements 10.1, 10.2**
  
  - [ ] 30.3 Write property test for activity timeline ordering
    - **Property 34: Activity Timeline Ordering**
    - **Validates: Requirements 10.3**
  
  - [ ] 30.4 Write property test for peak period identification
    - **Property 35: Peak Period Identification**
    - **Validates: Requirements 10.4**
  
  - [ ] 30.5 Write property test for privacy-respecting analytics
    - **Property 36: Privacy-Respecting Analytics**
    - **Validates: Requirements 10.5**

- [ ] 31. Create analytics dashboard UI
  - [ ] 31.1 Build collaboration analytics page
    - Create contribution metrics display
    - Add activity timeline visualization
    - Show peak collaboration periods
    - Implement privacy controls for non-admins
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 32. Performance optimization
  - [ ] 32.1 Optimize real-time updates
    - Add throttling for cursor updates
    - Implement efficient presence cleanup
    - Optimize activity feed queries
    - _Requirements: 1.4, 2.3, 8.4_

- [ ] 33. Final checkpoint - Full collaboration verification
  - Run full test suite
  - Test all collaboration features end-to-end
  - Verify performance under load
  - Ensure all tests pass, ask the user if questions arise

## Notes

- All tasks are required for comprehensive testing from the start
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- Property tests validate universal correctness properties across all inputs (minimum 100 iterations each)
- Unit tests validate specific examples, edge cases, and integration points
- The phased approach allows for incremental delivery while maintaining system stability
- Testing is integrated with implementation to catch issues early

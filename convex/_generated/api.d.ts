/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accountLockout from "../accountLockout.js";
import type * as admin from "../admin.js";
import type * as adminAnalytics from "../adminAnalytics.js";
import type * as adminNotifications from "../adminNotifications.js";
import type * as aiTools from "../aiTools.js";
import type * as aiUsage from "../aiUsage.js";
import type * as analytics from "../analytics.js";
import type * as apiKeys from "../apiKeys.js";
import type * as api_adminHelpers from "../api/adminHelpers.js";
import type * as api_auth from "../api/auth.js";
import type * as api_helpers from "../api/helpers.js";
import type * as api_mutations from "../api/mutations.js";
import type * as attendees from "../attendees.js";
import type * as auditLog from "../auditLog.js";
import type * as auth from "../auth.js";
import type * as budgetItems from "../budgetItems.js";
import type * as crons from "../crons.js";
import type * as customAuth from "../customAuth.js";
import type * as emailVerification from "../emailVerification.js";
import type * as eventApplications from "../eventApplications.js";
import type * as eventSponsors from "../eventSponsors.js";
import type * as eventTasks from "../eventTasks.js";
import type * as eventVendors from "../eventVendors.js";
import type * as events from "../events.js";
import type * as exports from "../exports.js";
import type * as globalRateLimit from "../globalRateLimit.js";
import type * as http from "../http.js";
import type * as inquiries from "../inquiries.js";
import type * as lib_agent_handlers from "../lib/agent/handlers.js";
import type * as lib_agent_index from "../lib/agent/index.js";
import type * as lib_agent_tools from "../lib/agent/tools.js";
import type * as lib_agent_types from "../lib/agent/types.js";
import type * as lib_ai_enhancePlaygroundData from "../lib/ai/enhancePlaygroundData.js";
import type * as lib_ai_factory from "../lib/ai/factory.js";
import type * as lib_ai_index from "../lib/ai/index.js";
import type * as lib_ai_providers_anthropic from "../lib/ai/providers/anthropic.js";
import type * as lib_ai_providers_openai from "../lib/ai/providers/openai.js";
import type * as lib_ai_types from "../lib/ai/types.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_compliance_analyticsAnonymization from "../lib/compliance/analyticsAnonymization.js";
import type * as lib_compliance_auditLog from "../lib/compliance/auditLog.js";
import type * as lib_compliance_auditLogMiddleware from "../lib/compliance/auditLogMiddleware.js";
import type * as lib_compliance_dataDeletion from "../lib/compliance/dataDeletion.js";
import type * as lib_compliance_dataExport from "../lib/compliance/dataExport.js";
import type * as lib_compliance_dataRetention from "../lib/compliance/dataRetention.js";
import type * as lib_compliance_termsAcceptance from "../lib/compliance/termsAcceptance.js";
import type * as lib_emailValidation from "../lib/emailValidation.js";
import type * as lib_errorFormatter from "../lib/errorFormatter.js";
import type * as lib_errorLogging from "../lib/errorLogging.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_monitoring_alerts from "../lib/monitoring/alerts.js";
import type * as lib_monitoring_errorHandling from "../lib/monitoring/errorHandling.js";
import type * as lib_monitoring_errorHandlingExample from "../lib/monitoring/errorHandlingExample.js";
import type * as lib_monitoring_index from "../lib/monitoring/index.js";
import type * as lib_monitoring_logger from "../lib/monitoring/logger.js";
import type * as lib_monitoring_metrics from "../lib/monitoring/metrics.js";
import type * as lib_monitoring_metricsIntegrationExample from "../lib/monitoring/metricsIntegrationExample.js";
import type * as lib_monitoring_metricsMiddleware from "../lib/monitoring/metricsMiddleware.js";
import type * as lib_monitoring_serverErrorLogging from "../lib/monitoring/serverErrorLogging.js";
import type * as lib_notificationEmails from "../lib/notificationEmails.js";
import type * as lib_notificationTriggers from "../lib/notificationTriggers.js";
import type * as lib_passwordValidation from "../lib/passwordValidation.js";
import type * as lib_payment_fraudDetection from "../lib/payment/fraudDetection.js";
import type * as lib_payment_paymentAuditLog from "../lib/payment/paymentAuditLog.js";
import type * as lib_payment_paymentIdempotency from "../lib/payment/paymentIdempotency.js";
import type * as lib_payment_paymentSecurity from "../lib/payment/paymentSecurity.js";
import type * as lib_payment_refundService from "../lib/payment/refundService.js";
import type * as lib_performance_cache from "../lib/performance/cache.js";
import type * as lib_resilience_aiResilience from "../lib/resilience/aiResilience.js";
import type * as lib_resilience_backup from "../lib/resilience/backup.js";
import type * as lib_resilience_circuitBreaker from "../lib/resilience/circuitBreaker.js";
import type * as lib_resilience_retry from "../lib/resilience/retry.js";
import type * as lib_security_config from "../lib/security/config.js";
import type * as lib_security_csrf from "../lib/security/csrf.js";
import type * as lib_security_csrfExample from "../lib/security/csrfExample.js";
import type * as lib_security_encryption from "../lib/security/encryption.js";
import type * as lib_security_index from "../lib/security/index.js";
import type * as lib_security_rateLimitMiddleware from "../lib/security/rateLimitMiddleware.js";
import type * as lib_security_rateLimiter from "../lib/security/rateLimiter.js";
import type * as lib_security_requestSizeValidator from "../lib/security/requestSizeValidator.js";
import type * as lib_security_sanitizer from "../lib/security/sanitizer.js";
import type * as lib_security_types from "../lib/security/types.js";
import type * as lib_security_utils from "../lib/security/utils.js";
import type * as lib_sentry from "../lib/sentry.js";
import type * as metrics from "../metrics.js";
import type * as migrations_cleanupOrphanedAdmins from "../migrations/cleanupOrphanedAdmins.js";
import type * as migrations_clearAuthData from "../migrations/clearAuthData.js";
import type * as migrations_migrateApiKeysToEncryption from "../migrations/migrateApiKeysToEncryption.js";
import type * as migrations_migrateSessionsToNewSchema from "../migrations/migrateSessionsToNewSchema.js";
import type * as migrations_seedData from "../migrations/seedData.js";
import type * as moderation from "../moderation.js";
import type * as mutations_events from "../mutations/events.js";
import type * as mutations_superadmin from "../mutations/superadmin.js";
import type * as notificationPreferences from "../notificationPreferences.js";
import type * as notifications from "../notifications.js";
import type * as orders from "../orders.js";
import type * as organizations from "../organizations.js";
import type * as organizerProfiles from "../organizerProfiles.js";
import type * as passwordReset from "../passwordReset.js";
import type * as paymentIdempotency from "../paymentIdempotency.js";
import type * as paymentLedger from "../paymentLedger.js";
import type * as platformSettings from "../platformSettings.js";
import type * as playground from "../playground.js";
import type * as playgroundCreate from "../playgroundCreate.js";
import type * as promoCodes from "../promoCodes.js";
import type * as publicApplications from "../publicApplications.js";
import type * as queries_auth from "../queries/auth.js";
import type * as queries_dashboard from "../queries/dashboard.js";
import type * as settlements from "../settlements.js";
import type * as sponsorLeads from "../sponsorLeads.js";
import type * as sponsorReports from "../sponsorReports.js";
import type * as sponsors from "../sponsors.js";
import type * as stripe from "../stripe.js";
import type * as testJWKS from "../testJWKS.js";
import type * as testKeyFormat from "../testKeyFormat.js";
import type * as ticketTypes from "../ticketTypes.js";
import type * as twoFactorAuth from "../twoFactorAuth.js";
import type * as users from "../users.js";
import type * as vendors from "../vendors.js";
import type * as webhooks from "../webhooks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accountLockout: typeof accountLockout;
  admin: typeof admin;
  adminAnalytics: typeof adminAnalytics;
  adminNotifications: typeof adminNotifications;
  aiTools: typeof aiTools;
  aiUsage: typeof aiUsage;
  analytics: typeof analytics;
  apiKeys: typeof apiKeys;
  "api/adminHelpers": typeof api_adminHelpers;
  "api/auth": typeof api_auth;
  "api/helpers": typeof api_helpers;
  "api/mutations": typeof api_mutations;
  attendees: typeof attendees;
  auditLog: typeof auditLog;
  auth: typeof auth;
  budgetItems: typeof budgetItems;
  crons: typeof crons;
  customAuth: typeof customAuth;
  emailVerification: typeof emailVerification;
  eventApplications: typeof eventApplications;
  eventSponsors: typeof eventSponsors;
  eventTasks: typeof eventTasks;
  eventVendors: typeof eventVendors;
  events: typeof events;
  exports: typeof exports;
  globalRateLimit: typeof globalRateLimit;
  http: typeof http;
  inquiries: typeof inquiries;
  "lib/agent/handlers": typeof lib_agent_handlers;
  "lib/agent/index": typeof lib_agent_index;
  "lib/agent/tools": typeof lib_agent_tools;
  "lib/agent/types": typeof lib_agent_types;
  "lib/ai/enhancePlaygroundData": typeof lib_ai_enhancePlaygroundData;
  "lib/ai/factory": typeof lib_ai_factory;
  "lib/ai/index": typeof lib_ai_index;
  "lib/ai/providers/anthropic": typeof lib_ai_providers_anthropic;
  "lib/ai/providers/openai": typeof lib_ai_providers_openai;
  "lib/ai/types": typeof lib_ai_types;
  "lib/auth": typeof lib_auth;
  "lib/compliance/analyticsAnonymization": typeof lib_compliance_analyticsAnonymization;
  "lib/compliance/auditLog": typeof lib_compliance_auditLog;
  "lib/compliance/auditLogMiddleware": typeof lib_compliance_auditLogMiddleware;
  "lib/compliance/dataDeletion": typeof lib_compliance_dataDeletion;
  "lib/compliance/dataExport": typeof lib_compliance_dataExport;
  "lib/compliance/dataRetention": typeof lib_compliance_dataRetention;
  "lib/compliance/termsAcceptance": typeof lib_compliance_termsAcceptance;
  "lib/emailValidation": typeof lib_emailValidation;
  "lib/errorFormatter": typeof lib_errorFormatter;
  "lib/errorLogging": typeof lib_errorLogging;
  "lib/errors": typeof lib_errors;
  "lib/monitoring/alerts": typeof lib_monitoring_alerts;
  "lib/monitoring/errorHandling": typeof lib_monitoring_errorHandling;
  "lib/monitoring/errorHandlingExample": typeof lib_monitoring_errorHandlingExample;
  "lib/monitoring/index": typeof lib_monitoring_index;
  "lib/monitoring/logger": typeof lib_monitoring_logger;
  "lib/monitoring/metrics": typeof lib_monitoring_metrics;
  "lib/monitoring/metricsIntegrationExample": typeof lib_monitoring_metricsIntegrationExample;
  "lib/monitoring/metricsMiddleware": typeof lib_monitoring_metricsMiddleware;
  "lib/monitoring/serverErrorLogging": typeof lib_monitoring_serverErrorLogging;
  "lib/notificationEmails": typeof lib_notificationEmails;
  "lib/notificationTriggers": typeof lib_notificationTriggers;
  "lib/passwordValidation": typeof lib_passwordValidation;
  "lib/payment/fraudDetection": typeof lib_payment_fraudDetection;
  "lib/payment/paymentAuditLog": typeof lib_payment_paymentAuditLog;
  "lib/payment/paymentIdempotency": typeof lib_payment_paymentIdempotency;
  "lib/payment/paymentSecurity": typeof lib_payment_paymentSecurity;
  "lib/payment/refundService": typeof lib_payment_refundService;
  "lib/performance/cache": typeof lib_performance_cache;
  "lib/resilience/aiResilience": typeof lib_resilience_aiResilience;
  "lib/resilience/backup": typeof lib_resilience_backup;
  "lib/resilience/circuitBreaker": typeof lib_resilience_circuitBreaker;
  "lib/resilience/retry": typeof lib_resilience_retry;
  "lib/security/config": typeof lib_security_config;
  "lib/security/csrf": typeof lib_security_csrf;
  "lib/security/csrfExample": typeof lib_security_csrfExample;
  "lib/security/encryption": typeof lib_security_encryption;
  "lib/security/index": typeof lib_security_index;
  "lib/security/rateLimitMiddleware": typeof lib_security_rateLimitMiddleware;
  "lib/security/rateLimiter": typeof lib_security_rateLimiter;
  "lib/security/requestSizeValidator": typeof lib_security_requestSizeValidator;
  "lib/security/sanitizer": typeof lib_security_sanitizer;
  "lib/security/types": typeof lib_security_types;
  "lib/security/utils": typeof lib_security_utils;
  "lib/sentry": typeof lib_sentry;
  metrics: typeof metrics;
  "migrations/cleanupOrphanedAdmins": typeof migrations_cleanupOrphanedAdmins;
  "migrations/clearAuthData": typeof migrations_clearAuthData;
  "migrations/migrateApiKeysToEncryption": typeof migrations_migrateApiKeysToEncryption;
  "migrations/migrateSessionsToNewSchema": typeof migrations_migrateSessionsToNewSchema;
  "migrations/seedData": typeof migrations_seedData;
  moderation: typeof moderation;
  "mutations/events": typeof mutations_events;
  "mutations/superadmin": typeof mutations_superadmin;
  notificationPreferences: typeof notificationPreferences;
  notifications: typeof notifications;
  orders: typeof orders;
  organizations: typeof organizations;
  organizerProfiles: typeof organizerProfiles;
  passwordReset: typeof passwordReset;
  paymentIdempotency: typeof paymentIdempotency;
  paymentLedger: typeof paymentLedger;
  platformSettings: typeof platformSettings;
  playground: typeof playground;
  playgroundCreate: typeof playgroundCreate;
  promoCodes: typeof promoCodes;
  publicApplications: typeof publicApplications;
  "queries/auth": typeof queries_auth;
  "queries/dashboard": typeof queries_dashboard;
  settlements: typeof settlements;
  sponsorLeads: typeof sponsorLeads;
  sponsorReports: typeof sponsorReports;
  sponsors: typeof sponsors;
  stripe: typeof stripe;
  testJWKS: typeof testJWKS;
  testKeyFormat: typeof testKeyFormat;
  ticketTypes: typeof ticketTypes;
  twoFactorAuth: typeof twoFactorAuth;
  users: typeof users;
  vendors: typeof vendors;
  webhooks: typeof webhooks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

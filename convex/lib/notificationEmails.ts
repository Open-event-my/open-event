/**
 * Notification Email Templates
 *
 * HTML email templates for different notification types
 */

const SITE_URL = process.env.SITE_URL || 'http://localhost:5174'

const baseEmailTemplate = (
  title: string,
  content: string,
  actionUrl?: string,
  actionLabel?: string
) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <h1 style="margin: 0; color: #111827; font-size: 24px; font-weight: 600;">Open Event</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 600;">${title}</h2>
              <div style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                ${content}
              </div>
              ${
                actionUrl && actionLabel
                  ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 32px;">
                <tr>
                  <td align="center">
                    <a href="${actionUrl}" style="display: inline-block; padding: 12px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">
                      ${actionLabel}
                    </a>
                  </td>
                </tr>
              </table>
              `
                  : ''
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 14px;">
                You received this email because you have notifications enabled for your Open Event account.
              </p>
              <p style="margin: 8px 0 0; color: #9ca3af; font-size: 14px;">
                <a href="${SITE_URL}/dashboard/settings" style="color: #3b82f6; text-decoration: none;">Manage notification preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

export function getNotificationEmailTemplate(
  _type: string,
  data: {
    title: string
    message: string
    actionUrl?: string
    actionLabel?: string
    eventTitle?: string
    vendorName?: string
    sponsorName?: string
  }
) {
  const { title, message, actionUrl, actionLabel } = data
  const fullActionUrl = actionUrl ? `${SITE_URL}${actionUrl}` : undefined

  return {
    subject: title,
    html: baseEmailTemplate(title, `<p>${message}</p>`, fullActionUrl, actionLabel),
  }
}

// Specific template generators for better type safety
export function vendorApplicationEmailTemplate(
  vendorName: string,
  eventTitle: string,
  eventId: string
) {
  return getNotificationEmailTemplate('vendor_application', {
    title: 'New Vendor Application',
    message: `${vendorName} has applied to be a vendor for your event "${eventTitle}".`,
    eventTitle,
    vendorName,
    actionUrl: `/dashboard/events/${eventId}/vendors`,
    actionLabel: 'View Application',
  })
}

export function sponsorApplicationEmailTemplate(
  sponsorName: string,
  eventTitle: string,
  eventId: string
) {
  return getNotificationEmailTemplate('sponsor_application', {
    title: 'New Sponsor Application',
    message: `${sponsorName} has applied to sponsor your event "${eventTitle}".`,
    eventTitle,
    sponsorName,
    actionUrl: `/dashboard/events/${eventId}/sponsors`,
    actionLabel: 'View Application',
  })
}

export function taskDeadlineEmailTemplate(
  taskTitle: string,
  daysUntilDue: number,
  eventId: string
) {
  return getNotificationEmailTemplate('task_deadline', {
    title: 'Task Deadline Approaching',
    message: `Your task "${taskTitle}" is due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}. Make sure to complete it on time!`,
    actionUrl: `/dashboard/events/${eventId}/tasks`,
    actionLabel: 'View Task',
  })
}

export function eventReminderEmailTemplate(
  eventTitle: string,
  daysUntilEvent: number,
  eventId: string
) {
  return getNotificationEmailTemplate('event_reminder', {
    title: 'Event Starting Soon',
    message: `Your event "${eventTitle}" starts in ${daysUntilEvent} day${daysUntilEvent === 1 ? '' : 's'}. Make sure everything is ready!`,
    eventTitle,
    actionUrl: `/dashboard/events/${eventId}`,
    actionLabel: 'View Event Details',
  })
}

export function budgetThresholdEmailTemplate(
  eventTitle: string,
  percentage: number,
  threshold: number,
  eventId: string
) {
  return getNotificationEmailTemplate('budget_threshold', {
    title: 'Budget Threshold Exceeded',
    message: `Your event "${eventTitle}" has used ${percentage}% of its budget (threshold: ${threshold}%). You may want to review your spending.`,
    eventTitle,
    actionUrl: `/dashboard/events/${eventId}/budget`,
    actionLabel: 'View Budget',
  })
}

export function applicationApprovedEmailTemplate(type: 'vendor' | 'sponsor', eventTitle: string) {
  return getNotificationEmailTemplate('application_approved', {
    title: 'Application Approved',
    message: `Great news! Your ${type} application for "${eventTitle}" has been approved. You can now proceed with the next steps.`,
    eventTitle,
    actionUrl: `/dashboard`,
    actionLabel: 'Go to Dashboard',
  })
}

export function applicationRejectedEmailTemplate(
  type: 'vendor' | 'sponsor',
  eventTitle: string,
  reason?: string
) {
  const message = reason
    ? `Unfortunately, your ${type} application for "${eventTitle}" was not approved. Reason: ${reason}`
    : `Unfortunately, your ${type} application for "${eventTitle}" was not approved. Please feel free to apply to other events.`

  return getNotificationEmailTemplate('application_rejected', {
    title: 'Application Update',
    message,
    eventTitle,
    actionUrl: `/dashboard`,
    actionLabel: 'View Other Events',
  })
}

export function eventPublishedEmailTemplate(eventTitle: string, eventId: string) {
  return getNotificationEmailTemplate('event_published', {
    title: 'Event Published Successfully',
    message: `Congratulations! Your event "${eventTitle}" has been successfully published and is now live. You can start sharing it with potential attendees.`,
    eventTitle,
    actionUrl: `/events/${eventId}`,
    actionLabel: 'View Published Event',
  })
}

export function teamInvitationEmailTemplate(organizationName: string, inviterName: string) {
  return getNotificationEmailTemplate('team_invitation', {
    title: 'Team Invitation',
    message: `${inviterName} has invited you to join ${organizationName}. Accept the invitation to start collaborating on events together.`,
    actionUrl: `/dashboard/invitations`,
    actionLabel: 'View Invitation',
  })
}

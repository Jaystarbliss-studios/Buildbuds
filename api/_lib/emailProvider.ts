export interface EmailDeliveryResult {
  status: 'sent' | 'failed' | 'skipped';
  messageId?: string;
  error?: string;
}

const processedIdempotencyKeys = new Set<string>();

function getAppUrl(): string {
  return (
    process.env.BUILDBUDS_APP_URL ||
    process.env.APP_URL ||
    'https://buildbuds.vercel.app'
  ).replace(/\/+$/, '');
}

function getFromEmail(): string {
  return (
    process.env.BUILDBUDS_FROM_EMAIL ||
    'Build Buds <notifications@jaystarbliss.com>'
  );
}

function escapeHtml(input: string): string {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildApprovalEmailHtml(params: {
  fullName: string;
  schoolName: string;
  programme: string;
  publicStatusNote?: string;
}): { subject: string; html: string } {
  const appUrl = getAppUrl();
  const hubUrl = `${appUrl}/hub`;
  const communityUrl = `${appUrl}/community`;
  const safeName = escapeHtml(params.fullName);
  const safeSchool = escapeHtml(params.schoolName);
  const safeProgramme = escapeHtml(params.programme);
  const safeNote = params.publicStatusNote ? escapeHtml(params.publicStatusNote) : '';

  const subject = "You're approved! Welcome to the Build Buds Student Hub.";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#FFFDF5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#000000;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background-color:#FFFFFF;border:3px solid #000000;border-radius:24px;overflow:hidden;box-shadow:6px 6px 0px #000000;">
          <tr>
            <td style="background-color:#FFF025;padding:28px 32px;border-bottom:3px solid #000000;">
              <div style="font-size:12px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;color:#000000;margin-bottom:6px;">
                JAYSTARBLISS STUDIOS • BUILD BUDS
              </div>
              <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:900;color:#000000;">
                You're Approved! Welcome to the Build Buds Student Hub 🎉
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;font-weight:600;">
                Hi ${safeName},
              </p>
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#1e293b;">
                Great news! Your Jaystarbliss Studios student record has been verified and your access to the private <strong>Build Buds Student Hub</strong> is now active.
              </p>
              <div style="background-color:#F8FAFC;border:2px solid #000000;border-radius:16px;padding:16px 20px;margin-bottom:24px;">
                <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:#B11469;margin-bottom:8px;">
                  Verified Student Membership
                </div>
                <div style="font-size:14px;line-height:1.6;color:#0f172a;">
                  <strong>Student:</strong> ${safeName}<br/>
                  <strong>School / Club:</strong> ${safeSchool}<br/>
                  <strong>Programme:</strong> ${safeProgramme}
                </div>
                ${
                  safeNote
                    ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:13px;color:#334155;">${safeNote}</div>`
                    : ''
                }
              </div>
              <p style="margin:0 0 12px 0;font-size:14px;font-weight:800;text-transform:uppercase;color:#000000;">
                What you can do inside the Student Hub:
              </p>
              <ul style="margin:0 0 28px 0;padding-left:20px;font-size:14px;line-height:1.7;color:#1e293b;">
                <li>Collaborate in real-time channels (#Games, #Websites, #Videos, #Novels, #General Chat, and #Help).</li>
                <li>Share your project links, join topic sub-groups, and get feedback from mentors and fellow student builders.</li>
                <li>Publish your creations to the Public Community Showcase at <a href="${communityUrl}" style="color:#B11469;font-weight:700;">${communityUrl}</a>.</li>
              </ul>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 24px auto;">
                <tr>
                  <td align="center" style="background-color:#FFF025;border:3px solid #000000;border-radius:14px;box-shadow:4px 4px 0px #000000;">
                    <a href="${hubUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:900;color:#000000;text-decoration:none;">
                      Enter Build Buds &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;text-align:center;">
                Or copy and paste this link into your browser:<br/>
                <a href="${hubUrl}" style="color:#B11469;font-weight:700;">${hubUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0f172a;color:#ffffff;padding:20px 32px;font-size:12px;line-height:1.5;text-align:center;">
              <strong>Build Buds by Jaystarbliss Studios</strong><br/>
              Empowering young creators to build boldly, be kind, and help each other grow.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

export function buildStatusUpdateEmailHtml(params: {
  fullName: string;
  schoolName: string;
  programme: string;
  status: 'pending' | 'rejected' | 'more_information_required' | 'suspended';
  publicStatusNote?: string;
}): { subject: string; html: string } {
  const appUrl = getAppUrl();
  const statusUrl = `${appUrl}/student-access/status`;
  const communityUrl = `${appUrl}/community`;
  const safeName = escapeHtml(params.fullName);
  const safeSchool = escapeHtml(params.schoolName);
  const safeProgramme = escapeHtml(params.programme);
  const safeNote = escapeHtml(
    params.publicStatusNote ||
      'Please visit your Student Access Status page for details.'
  );

  const subjectMap: Record<typeof params.status, string> = {
    pending: 'We received your Build Buds Student Hub verification request',
    more_information_required:
      'Action Needed: Additional information for your Build Buds Student Hub request',
    rejected: 'Update on your Build Buds Student Hub verification request',
    suspended: 'Important notice regarding your Build Buds Student Hub access',
  };

  const headingMap: Record<typeof params.status, string> = {
    pending: 'Verification Request Received',
    more_information_required: 'More Information Needed',
    rejected: 'Student Verification Update',
    suspended: 'Student Hub Access Suspended',
  };

  const subject = subjectMap[params.status];
  const heading = headingMap[params.status];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#FFFDF5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#000000;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#FFFFFF;border:3px solid #000000;border-radius:24px;overflow:hidden;box-shadow:6px 6px 0px #000000;">
          <tr>
            <td style="background-color:#B11469;padding:24px 32px;border-bottom:3px solid #000000;color:#FFFFFF;">
              <div style="font-size:11px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;color:#FFF025;margin-bottom:4px;">
                JAYSTARBLISS STUDIOS • BUILD BUDS
              </div>
              <h1 style="margin:0;font-size:24px;font-weight:900;color:#FFFFFF;">
                ${heading}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 14px 0;font-size:15px;font-weight:600;">Hi ${safeName},</p>
              <div style="background-color:#FFFBEB;border:2px solid #000000;border-radius:14px;padding:16px;margin-bottom:20px;font-size:14px;line-height:1.6;">
                <strong>Status Note:</strong><br/>
                ${safeNote}
              </div>
              <p style="margin:0 0 20px 0;font-size:13px;color:#334155;line-height:1.6;">
                <strong>Submitted School:</strong> ${safeSchool}<br/>
                <strong>Submitted Programme:</strong> ${safeProgramme}
              </p>
              <p style="margin:0 0 24px 0;font-size:14px;color:#1e293b;line-height:1.6;">
                While your student verification is being reviewed or updated, you can continue exploring and participating in the <a href="${communityUrl}" style="color:#B11469;font-weight:700;">Build Buds Public Community</a>.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color:#FFF025;border:2px solid #000000;border-radius:12px;">
                    <a href="${statusUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:900;color:#000000;text-decoration:none;">
                      Check Application Status &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

/**
 * Sends a transactional email via Resend (`https://api.resend.com/emails`).
 * Never blocks or crashes the caller if `RESEND_API_KEY` is missing or if Resend returns an error.
 */
export async function sendResendEmail(params: {
  to: string;
  subject: string;
  html: string;
  idempotencyKey?: string;
}): Promise<EmailDeliveryResult> {
  if (params.idempotencyKey && processedIdempotencyKeys.has(params.idempotencyKey)) {
    return {
      status: 'sent',
      messageId: 'idempotent-cached',
    };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey || resendApiKey.trim() === '') {
    return {
      status: 'skipped',
      error: 'RESEND_API_KEY is not configured on the server. In-app notification was delivered.',
    };
  }

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${resendApiKey.trim()}`,
      'Content-Type': 'application/json',
    };
    if (params.idempotencyKey) {
      headers['Idempotency-Key'] = params.idempotencyKey;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from: getFromEmail(),
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };

    if (!res.ok) {
      return {
        status: 'failed',
        error: data.message || `Resend returned HTTP ${res.status}`,
      };
    }

    if (params.idempotencyKey) {
      processedIdempotencyKeys.add(params.idempotencyKey);
    }

    return {
      status: 'sent',
      messageId: data.id,
    };
  } catch (err) {
    return {
      status: 'failed',
      error: err instanceof Error ? err.message : 'Failed to connect to Resend API.',
    };
  }
}

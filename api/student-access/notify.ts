import { verifyFirebaseIdTokenFromHeader } from '../_lib/firebaseAuthVerifier.ts';
import {
  buildApprovalEmailHtml,
  buildStatusUpdateEmailHtml,
  sendResendEmail,
} from '../_lib/emailProvider.ts';
import type { ApiRequest, ApiResponse } from '../cloudinary/signature.ts';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const authHeader = Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : req.headers.authorization;
    const verifiedAdmin = await verifyFirebaseIdTokenFromHeader(authHeader);

    if (!verifiedAdmin.isAdmin) {
      return res.status(403).json({
        error: 'Forbidden: Only authorised administrators can trigger student notifications.',
      });
    }

    const body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}) as {
      uid?: string;
      fullName?: string;
      email?: string;
      schoolName?: string;
      programme?: string;
      status?: 'approved' | 'pending' | 'rejected' | 'more_information_required' | 'suspended';
      publicStatusNote?: string;
      idempotencyKey?: string;
    };

    if (!body.uid || !body.email || !body.fullName) {
      return res.status(400).json({
        error: 'Applicant uid, fullName, and email are required.',
      });
    }

    const status = body.status || 'approved';

    const emailPayload =
      status === 'approved'
        ? buildApprovalEmailHtml({
            fullName: body.fullName,
            schoolName: body.schoolName || 'Jaystarbliss Studios Partner School',
            programme: body.programme || 'Build Buds Creator Programme',
            publicStatusNote: body.publicStatusNote,
          })
        : buildStatusUpdateEmailHtml({
            fullName: body.fullName,
            schoolName: body.schoolName || 'School / Club',
            programme: body.programme || 'Jaystarbliss Studios Programme',
            status,
            publicStatusNote: body.publicStatusNote,
          });

    const emailResult = await sendResendEmail({
      to: body.email,
      subject: emailPayload.subject,
      html: emailPayload.html,
      idempotencyKey: body.idempotencyKey || `notify_${status}_${body.uid}_${Date.now()}`,
    });

    return res.status(200).json({
      notified: emailResult.status === 'sent',
      uid: body.uid,
      emailNotificationStatus: emailResult.status,
      emailNotificationError: emailResult.error,
      messageId: emailResult.messageId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unauthorized admin request.';
    return res.status(401).json({ error: message });
  }
}

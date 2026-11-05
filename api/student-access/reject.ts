import { verifyFirebaseIdTokenFromHeader } from '../_lib/firebaseAuthVerifier.ts';
import {
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
        error:
          'Forbidden: Only authorised Jaystarbliss Studios administrators can update student access decisions.',
      });
    }

    const body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}) as {
      uid?: string;
      fullName?: string;
      email?: string;
      schoolName?: string;
      programme?: string;
      status?: 'rejected' | 'more_information_required' | 'suspended';
      publicStatusNote?: string;
      idempotencyKey?: string;
    };

    if (!body.uid || !body.email || !body.fullName) {
      return res.status(400).json({
        error: 'Applicant uid, fullName, and email are required.',
      });
    }

    const decisionStatus = body.status || 'rejected';

    const { subject, html } = buildStatusUpdateEmailHtml({
      fullName: body.fullName,
      schoolName: body.schoolName || 'School / Club',
      programme: body.programme || 'Jaystarbliss Studios Programme',
      status: decisionStatus,
      publicStatusNote: body.publicStatusNote,
    });

    const emailResult = await sendResendEmail({
      to: body.email,
      subject,
      html,
      idempotencyKey: body.idempotencyKey || `${decisionStatus}_${body.uid}`,
    });

    return res.status(200).json({
      updated: true,
      uid: body.uid,
      status: decisionStatus,
      reviewedBy: verifiedAdmin.uid,
      emailNotificationStatus: emailResult.status,
      emailNotificationError: emailResult.error,
      messageId: emailResult.messageId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unauthorized admin request.';
    return res.status(401).json({ error: message });
  }
}

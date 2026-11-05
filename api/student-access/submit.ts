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
    const verifiedUser = await verifyFirebaseIdTokenFromHeader(authHeader);

    const body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}) as {
      uid?: string;
      fullName?: string;
      email?: string;
      schoolName?: string;
      gradeLevel?: string;
      programme?: string;
      studentReference?: string;
    };

    if (body.uid && body.uid !== verifiedUser.uid && !verifiedUser.isAdmin) {
      return res.status(403).json({
        error: 'You can only submit a student access request for your own authenticated account.',
      });
    }

    const targetEmail = verifiedUser.email || body.email || '';
    const fullName = (body.fullName || verifiedUser.displayName || 'Student Builder').trim();
    const schoolName = (body.schoolName || '').trim();
    const programme = (body.programme || '').trim();

    if (!targetEmail || !fullName || !schoolName || !programme) {
      return res.status(400).json({
        error: 'Full name, email, school name, and registered programme are required.',
      });
    }

    const { subject, html } = buildStatusUpdateEmailHtml({
      fullName,
      schoolName,
      programme,
      status: 'pending',
      publicStatusNote:
        'Your student verification application has been received and queued for review against official Jaystarbliss Studios student records.',
    });

    const emailResult = await sendResendEmail({
      to: targetEmail,
      subject,
      html,
      idempotencyKey: `submit_${verifiedUser.uid}_${new Date().toISOString().slice(0, 13)}`,
    });

    return res.status(200).json({
      submitted: true,
      uid: verifiedUser.uid,
      emailNotificationStatus: emailResult.status,
      emailNotificationError: emailResult.error,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unauthorized request.';
    return res.status(401).json({ error: message });
  }
}

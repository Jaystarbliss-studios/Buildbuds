import { verifyFirebaseIdTokenFromHeader } from '../_lib/firebaseAuthVerifier.ts';
import { studentRecordVerificationProvider } from '../_lib/studentRecordProvider.ts';
import { buildApprovalEmailHtml, sendResendEmail } from '../_lib/emailProvider.ts';
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
        error: 'Forbidden: Only authorised Jaystarbliss Studios administrators can approve student access.',
      });
    }

    const body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}) as {
      uid?: string;
      fullName?: string;
      email?: string;
      schoolName?: string;
      gradeLevel?: string;
      programme?: string;
      studentReference?: string;
      verifiedAgainstOfficialRecords?: boolean;
      publicStatusNote?: string;
      idempotencyKey?: string;
    };

    if (!body.uid || !body.email || !body.fullName) {
      return res.status(400).json({
        error: 'Applicant uid, fullName, and email are required.',
      });
    }

    // Verify through the clean StudentRecordVerificationProvider boundary
    const verificationCheck = await studentRecordVerificationProvider.verifyStudentRecord(
      {
        uid: body.uid,
        fullName: body.fullName,
        email: body.email,
        schoolName: body.schoolName || '',
        gradeLevel: body.gradeLevel || '',
        programme: body.programme || '',
        studentReference: body.studentReference,
      },
      Boolean(body.verifiedAgainstOfficialRecords)
    );

    if (!verificationCheck.matched) {
      return res.status(400).json({
        error: verificationCheck.message,
      });
    }

    const { subject, html } = buildApprovalEmailHtml({
      fullName: body.fullName,
      schoolName: body.schoolName || 'Jaystarbliss Studios Partner School',
      programme: body.programme || 'Build Buds Creator Programme',
      publicStatusNote: body.publicStatusNote,
    });

    const emailResult = await sendResendEmail({
      to: body.email,
      subject,
      html,
      idempotencyKey: body.idempotencyKey || `approve_${body.uid}`,
    });

    return res.status(200).json({
      approved: true,
      uid: body.uid,
      reviewedBy: verifiedAdmin.uid,
      verificationMode: verificationCheck.verificationMode,
      emailNotificationStatus: emailResult.status,
      emailNotificationError: emailResult.error,
      messageId: emailResult.messageId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unauthorized admin request.';
    return res.status(401).json({ error: message });
  }
}

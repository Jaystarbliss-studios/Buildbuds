export interface StudentVerificationCandidate {
  uid: string;
  fullName: string;
  email: string;
  schoolName: string;
  gradeLevel: string;
  programme: string;
  studentReference?: string;
}

export interface StudentRecordVerificationResult {
  matched: boolean;
  verificationMode: 'manual_admin_confirmation' | 'official_portal_api';
  recordReference?: string;
  message: string;
}

/**
 * Clean service boundary (`StudentRecordVerificationProvider`) for verifying whether an applicant
 * is an active student registered under Jaystarbliss Studios.
 *
 * Current Mode:
 * - Manual Admin Verification (supported immediately via the Admin Student Verification Dashboard)
 *
 * Future Server-to-Server Portal Mode:
 * - If `JW_STUDIOS_PORTAL_VERIFY_URL` and `JW_STUDIOS_PORTAL_API_KEY` are configured in environment
 *   variables, queries the official Jaystarbliss Studios student portal verification endpoint.
 */
export interface StudentRecordVerificationProvider {
  verifyStudentRecord(
    candidate: StudentVerificationCandidate,
    adminConfirmedManualCheck: boolean
  ): Promise<StudentRecordVerificationResult>;
}

class JaystarblissStudentRecordProvider implements StudentRecordVerificationProvider {
  async verifyStudentRecord(
    candidate: StudentVerificationCandidate,
    adminConfirmedManualCheck: boolean
  ): Promise<StudentRecordVerificationResult> {
    const portalUrl = process.env.JW_STUDIOS_PORTAL_VERIFY_URL;
    const portalApiKey = process.env.JW_STUDIOS_PORTAL_API_KEY;

    // If direct server-to-server portal credentials are configured, query the official portal API
    if (portalUrl && portalApiKey) {
      try {
        const res = await fetch(portalUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${portalApiKey}`,
          },
          body: JSON.stringify(candidate),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            verified?: boolean;
            studentId?: string;
            message?: string;
          };
          if (data.verified) {
            return {
              matched: true,
              verificationMode: 'official_portal_api',
              recordReference: data.studentId || candidate.studentReference || 'PORTAL-MATCH',
              message: data.message || 'Matched against official Jaystarbliss Studios portal.',
            };
          }
        }
      } catch (err) {
        console.warn('Official portal lookup fallback to manual admin check:', err);
      }
    }

    // Manual Admin Verification workflow
    if (adminConfirmedManualCheck) {
      return {
        matched: true,
        verificationMode: 'manual_admin_confirmation',
        recordReference: candidate.studentReference || 'ADMIN-MANUAL-CHECK',
        message: 'Verified manually by an authorised Jaystarbliss Studios administrator.',
      };
    }

    return {
      matched: false,
      verificationMode: 'manual_admin_confirmation',
      message:
        'Applicant must be verified against official Jaystarbliss Studios student records before approval.',
    };
  }
}

export const studentRecordVerificationProvider: StudentRecordVerificationProvider =
  new JaystarblissStudentRecordProvider();

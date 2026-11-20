import prisma from '../../prismaClient.js';
import { canModifyReport } from '../policies/report-policy.js';
import { isRecordId } from '../validation/forms.js';

// Must run after requireVerifiedUser. Loads the report into req.report only if the user may change it.
export async function loadReportForModification(req, res, next) {
  if (!isRecordId(req.params.id)) {
    return res.status(404).send('Report not found.');
  }
  try {
    const report = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!report) {
      return res.status(404).send('Report not found.');
    }
    if (!canModifyReport(req.currentUser, report)) {
      return res.status(403).send('You can only change your own reports.');
    }
    req.report = report;
    return next();
  } catch (error) {
    return next(error);
  }
}

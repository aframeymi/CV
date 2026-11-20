import express from 'express';
import path from 'path';
import prisma from '../prismaClient.js';
import cookieParser from 'cookie-parser';
import router from './routes/index.js';
import middleware from './middleware/index.js';
import { trustedProxyHops } from './config/proxy.js';
import { checkCsrfToken, provideCsrfToken, requireCsrfToken } from './middleware/csrf-protection.js';
import { handleError, notFound } from './middleware/error-handler.js';
import { receiveImage } from './middleware/image-upload.js';
import { limitReportSubmissions } from './middleware/rate-limits.js';
import { preventCaching, securityHeaders } from './middleware/security-headers.js';
import { deleteImage, saveImage, UnsupportedImageError } from './services/image-storage.js';
import { loadReportForModification } from './middleware/report-access.js';
import { findTopReporters, getPublicReportStatistics } from './services/report-statistics.js';
import { findReportPage } from './services/report-listing.js';
import { logSecurityEvent } from './services/server-log.js';
import { toScriptJson } from './utils/script-json.js';
import { checkForm, newReportForm, pageQuery, reportChangesForm } from './validation/forms.js';

const app = express();

// Render terminates HTTPS at its proxies, so trust their X-Forwarded headers for req.secure and req.ip
app.set('trust proxy', trustedProxyHops());

// First, so that every response carries the headers, including static files and errors
app.use(securityHeaders);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Static files never need the session, so serve them before it is checked.
// The security headers include nosniff, so browsers never treat an upload as a different type.
app.use(express.static('public'));
// Chart.js is served from the installed npm package, so pages load no code from other sites
const CHART_JS = path.join(process.cwd(), 'node_modules', 'chart.js', 'dist', 'chart.umd.js');
app.get('/vendor/chart.umd.js', (req, res) => res.sendFile(CHART_JS));
app.use(preventCaching);
app.use(cookieParser());
// Before the session is checked, so a forged request is refused without any further work
app.use(provideCsrfToken);
app.use(requireCsrfToken);
app.use(middleware.attachUserIfPresent);
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));
app.use(router);

// Page Routes
app.get('/', (req, res) => {
  res.render('index', { title: 'Community Voice' });
});

app.get('/sign_in', (req, res) => {
  res.render('sign_in', { title: 'Login' });
});

app.get('/sign_up', (req, res) => {
  res.render('sign_up', { title: 'Register' });
});

app.get('/graph', (req, res) => {
  res.render('graph', { title: 'Graph' });
});

app.get('/profile', middleware.requireVerifiedUser, (req, res) => {
  res.render('profile', { title: 'Profile' });
});

// Loading cities & neighbourhoods 
app.get('/report', async (req, res, next) => {
  try {
    const cities = await prisma.city.findMany({
      include: { neighborhoods: true },
      orderBy: { name: 'asc' },
    });
    return res.render('report', { title: 'Report', cities, citiesJson: toScriptJson(cities) });
  } catch (error) {
    return next(error);
  }
});

const limitReports = limitReportSubmissions((req, res) =>
  res.status(429).send('You have sent many reports in a short time. Please try again in an hour.')
);

// New Report Submission. The image is saved only once the rest of the form is valid.
// The limit comes before the image is read, so a client over the limit cannot fill the memory either.
app.post('/submit-report', middleware.requireVerifiedUser, limitReports, receiveImage, checkCsrfToken, async (req, res, next) => {
  const { values, problem } = checkForm(newReportForm, req.body);
  if (problem) {
    return res.status(422).send(problem);
  }
  const { title, description, neighborhoodId } = values;

  let image = null;
  try {
    const neighborhood = await prisma.neighborhood.findUnique({ where: { id: neighborhoodId } });
    if (!neighborhood) {
      return res.status(422).send('Invalid neighborhoodId.');
    }
    image = req.file ? await saveImage(req.file) : null;
    const report = await createReportWithHistory({ title, description, neighborhoodId, author: req.currentUser, image });
    logSecurityEvent('report.created', req, { reportId: report.id });
    return res.redirect('/track');
  } catch (error) {
    if (error instanceof UnsupportedImageError) {
      logSecurityEvent('upload.rejected', req, { reason: 'unsupported_type' });
      return res.status(415).send(error.message);
    }
    if (image) {
      await deleteImage(image).catch((cleanupError) => console.error('Could not remove image:', cleanupError.message));
    }
    return next(error);
  }
});

// Saves the report, its first status entry, and its image attachment together, or none of them.
// Returns the new report.
function createReportWithHistory({ title, description, neighborhoodId, author, image }) {
  return prisma.$transaction(async (tx) => {
    const report = await tx.report.create({
      data: { title, description, imageUrl: image?.url ?? null, status: 'OPEN', authorId: author.id, neighborhoodId },
    });
    await tx.statusChange.create({
      data: { reportId: report.id, from: 'OPEN', to: 'OPEN', changedBy: author.email || null },
    });
    if (image) {
      await tx.attachment.create({
        data: { reportId: report.id, url: image.url, mimeType: image.mimeType, sizeBytes: image.sizeBytes },
      });
    }
    return report;
  });
}

app.get('/track', async (req, res, next) => {
  const { values, problem } = checkForm(pageQuery, req.query);
  if (problem) {
    return notFound(req, res);
  }
  try {
    const { reports, pageCount } = await findReportPage(values.page);
    if (values.page > pageCount) {
      return notFound(req, res);
    }
    return res.render('track', { title: 'Track', reports, page: values.page, pageCount });
  } catch (error) {
    return next(error);
  }
});

// Only the author or an admin may open the edit form, save changes, or delete a report
const modifiableReport = [middleware.requireVerifiedUser, loadReportForModification];

// Records who changed a report, and whether an admin changed a report by someone else
function logReportChange(event, req) {
  const byAdminForAuthor = req.report.authorId !== req.currentUser.id;
  logSecurityEvent(event, req, { reportId: req.report.id, authorId: req.report.authorId, byAdminForAuthor });
}

app.get('/track/:id/edit', modifiableReport, (req, res) => {
  res.render('edit', { title: 'Edit Report', report: req.report });
});

app.post('/track/:id/edit', modifiableReport, async (req, res, next) => {
  const { values, problem } = checkForm(reportChangesForm, req.body);
  if (problem) {
    return res.status(422).send(problem);
  }
  try {
    // values holds only the title and description, so no other column can be changed through this form
    await prisma.report.update({ where: { id: req.report.id }, data: values });
    logReportChange('report.updated', req);
    return res.redirect('/track');
  } catch (error) {
    return next(error);
  }
});

app.post('/track/:id/delete', modifiableReport, async (req, res, next) => {
  try {
    await prisma.report.delete({ where: { id: req.report.id } });
    logReportChange('report.deleted', req);
    return res.redirect('/track');
  } catch (error) {
    return next(error);
  }
});

// Every /admin route requires a logged-in, verified administrator
const adminOnly = [middleware.requireVerifiedUser, middleware.requireAdmin];

// Admin: count reports per city and status.
// $queryRaw sends any ${value} placed in the query as a parameter, never as SQL text,
// so adding a filter later cannot open the query to SQL injection.
app.get('/admin/report-stats', adminOnly, async (req, res, next) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT
        c.name AS city,
        r.status AS status,
        COUNT(*)::int AS count
      FROM reports r
      JOIN neighborhoods n ON n.id = r.neighborhood_id
      JOIN cities c ON c.id = n.city_id
      GROUP BY c.name, r.status
      ORDER BY c.name, r.status;
    `;
    return res.json({ rows });
  } catch (error) {
    return next(error);
  }
});

// Admin: the public totals plus the top reporters, who are identified by name and email
app.get('/admin/analytics', adminOnly, async (req, res, next) => {
  try {
    const [publicStatistics, topReporters] = await Promise.all([
      getPublicReportStatistics(),
      findTopReporters(),
    ]);
    return res.json({ ...publicStatistics, topReporters });
  } catch (error) {
    return next(error);
  }
});

// Public: report totals for the graph page, without any personal data
app.get('/api/stats', async (req, res, next) => {
  try {
    return res.json(await getPublicReportStatistics());
  } catch (error) {
    return next(error);
  }
});

// Last, so they only see requests that no route above answered
app.use(notFound);
app.use(handleError);

export default app;

import express from 'express';
import path from 'path';
import prisma from '../prismaClient.js';
import cookieParser from 'cookie-parser';
import router from './routes/index.js';
import middleware from './middleware/index.js';
import { receiveImage } from './middleware/image-upload.js';
import { deleteImage, saveImage, UnsupportedImageError } from './services/image-storage.js';
import { loadReportForModification } from './middleware/report-access.js';
import { findTopReporters, getPublicReportStatistics } from './services/report-statistics.js';
import { findReportPage } from './services/report-listing.js';
import { toScriptJson } from './utils/script-json.js';
import { checkForm, newReportForm, pageQuery, reportChangesForm } from './validation/forms.js';

const app = express();

// Render terminates HTTPS at its proxy, so trust its X-Forwarded-Proto header for req.secure
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Static files never need the session, so serve them before it is checked.
// nosniff stops browsers from treating an uploaded file as anything other than its declared type.
app.use(express.static('public', { setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff') }));
app.use(cookieParser());
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
app.get('/report', async (req, res) => {
  try {
    const cities = await prisma.city.findMany({
      include: { neighborhoods: true },
      orderBy: { name: 'asc' },
    });
    res.render('report', { title: 'Report', cities, citiesJson: toScriptJson(cities) });
  } catch (e) {
    console.error('Failed to load cities:', e);
    res.status(500).send('Could not load the report form.');
  }
});

// New Report Submission. The image is saved only once the rest of the form is valid.
app.post('/submit-report', middleware.requireVerifiedUser, receiveImage, async (req, res) => {
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
    await createReportWithHistory({ title, description, neighborhoodId, author: req.currentUser, image });
    return res.redirect('/track');
  } catch (error) {
    if (error instanceof UnsupportedImageError) {
      return res.status(415).send(error.message);
    }
    console.error('Error submitting report:', error);
    if (image) {
      await deleteImage(image).catch((cleanupError) => console.error('Could not remove image:', cleanupError.message));
    }
    return res.status(500).send('There was a problem submitting your report.');
  }
});

// Saves the report, its first status entry, and its image attachment together, or none of them
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
  });
}

const PAGE_NOT_FOUND = 'Page not found.';

app.get('/track', async (req, res) => {
  const { values, problem } = checkForm(pageQuery, req.query);
  if (problem) {
    return res.status(404).send(PAGE_NOT_FOUND);
  }
  try {
    const { reports, pageCount } = await findReportPage(values.page);
    if (values.page > pageCount) {
      return res.status(404).send(PAGE_NOT_FOUND);
    }
    return res.render('track', { title: 'Track', reports, page: values.page, pageCount });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return res.status(500).send('Could not fetch reports.');
  }
});

// Only the author or an admin may open the edit form, save changes, or delete a report
const modifiableReport = [middleware.requireVerifiedUser, loadReportForModification];

app.get('/track/:id/edit', modifiableReport, (req, res) => {
  res.render('edit', { title: 'Edit Report', report: req.report });
});

app.post('/track/:id/edit', modifiableReport, async (req, res) => {
  const { values, problem } = checkForm(reportChangesForm, req.body);
  if (problem) {
    return res.status(422).send(problem);
  }
  try {
    // values holds only the title and description, so no other column can be changed through this form
    await prisma.report.update({ where: { id: req.report.id }, data: values });
    return res.redirect('/track');
  } catch (err) {
    console.error('Error updating report:', err);
    return res.status(500).send('Internal Server Error');
  }
});

app.post('/track/:id/delete', modifiableReport, async (req, res) => {
  try {
    await prisma.report.delete({ where: { id: req.report.id } });
    res.redirect('/track');
  } catch (err) {
    console.error('Error deleting report:', err);
    res.status(500).send('Internal Server Error');
  }
});


// Every /admin route requires a logged-in, verified administrator
const adminOnly = [middleware.requireVerifiedUser, middleware.requireAdmin];

// Admin: count reports per city and status.
// $queryRaw sends any ${value} placed in the query as a parameter, never as SQL text,
// so adding a filter later cannot open the query to SQL injection.
app.get('/admin/report-stats', adminOnly, async (req, res) => {
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
    res.json({ rows });
  } catch (e) {
    console.error('report-stats error:', e);
    res.status(500).send('Could not fetch report statistics');
  }
});

// Admin: the public totals plus the top reporters, who are identified by name and email
app.get('/admin/analytics', adminOnly, async (req, res) => {
  try {
    const [publicStatistics, topReporters] = await Promise.all([
      getPublicReportStatistics(),
      findTopReporters(),
    ]);
    res.json({ ...publicStatistics, topReporters });
  } catch (e) {
    console.error('analytics error:', e);
    res.status(500).send('Could not fetch analytics');
  }
});

// Public: report totals for the graph page, without any personal data
app.get('/api/stats', async (req, res) => {
  try {
    res.json(await getPublicReportStatistics());
  } catch (e) {
    console.error('stats error:', e);
    res.status(500).json({ error: 'Could not fetch statistics' });
  }
});

export default app;

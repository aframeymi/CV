import express from 'express';
import path from 'path';
import prisma from '../prismaClient.js';
import cookieParser from 'cookie-parser';
import router from './routes/index.js';
import middleware from './middleware/index.js';
import reportsRouter from './routes/reports.js';
import uploadRouter from './routes/upload.js';
import { upload } from './routes/upload.js';
import { loadReportForModification } from './middleware/report-access.js';
import { findTopReporters, getPublicReportStatistics } from './services/report-statistics.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Static files never need the session, so serve them before it is checked
app.use(express.static('public'));
app.use(cookieParser());
app.use(middleware.attachUserIfPresent);
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));
app.use(reportsRouter);
app.use(uploadRouter);
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
    res.render('report', { title: 'Report', cities });
  } catch (e) {
    console.error('Failed to load cities:', e);
    res.status(500).send('Could not load the report form.');
  }
});

// New Report Submission
app.post(
  '/submit-report',
  middleware.requireVerifiedUser,
  upload.single('image'),
  async (req, res) => {
    try {
      const { title, description, neighborhoodId } = req.body;
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

      // Validate requiered fields
      if (!title || !description || !neighborhoodId) {
        return res.status(422).send('title, description, and neighborhoodId are required.');
      }

      const user = req.currentUser;

      // See if selected neighbourhood exists
      const nbh = await prisma.neighborhood.findUnique({ where: { id: neighborhoodId } });
      if (!nbh) {
        return res.status(422).send('Invalid neighborhoodId.');
      }

      // Save the report, status history, and attachment
      await prisma.$transaction(async (tx) => {
        // Create report
        const created = await tx.report.create({
          data: {
            title,
            description,
            imageUrl,
            status: 'OPEN',
            authorId: user.id,
            neighborhoodId,
          },
        });

        // Initial status 
        await tx.statusChange.create({
          data: {
            reportId: created.id,
            from: 'OPEN',
            to: 'OPEN',
            changedBy: user.email || null,
          },
        });

        // Save image status (if uploaded)
        if (imageUrl) {
          await tx.attachment.create({
            data: {
              reportId: created.id,
              url: imageUrl,
              mimeType: req.file?.mimetype || 'image/jpeg',
              sizeBytes: req.file?.size || null,
            },
          });
        }
      });

      // Send user to the lists of reports
      return res.redirect('/track');
    } catch (error) {
      console.error('Error submitting report:', error);
      return res.status(500).send('There was a problem submitting your report.');
    }
  }
);

// List all reports with author & location
app.get('/track', async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { firstName: true, lastName: true, email: true } },
        neighborhood: { select: { name: true, city: { select: { name: true } } } },
      },
    });

    res.render('track', { title: 'Track', reports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).send('Could not fetch reports.');
  }
});

// Only the author or an admin may open the edit form, save changes, or delete a report
const modifiableReport = [middleware.requireVerifiedUser, loadReportForModification];

app.get('/track/:id/edit', modifiableReport, (req, res) => {
  res.render('edit', { title: 'Edit Report', report: req.report });
});

app.post('/track/:id/edit', modifiableReport, async (req, res) => {
  const { title, description } = req.body;
  try {
    await prisma.report.update({
      where: { id: req.report.id },
      data: { title, description },
    });
    res.redirect('/track');
  } catch (err) {
    console.error('Error updating report:', err);
    res.status(500).send('Internal Server Error');
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

// Admin: Count reports per city and status using a raw SQL query
app.get('/admin/report-stats', adminOnly, async (req, res) => {
  try {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        c.name AS city,
        r.status AS status,
        COUNT(*)::int AS count
      FROM reports r
      JOIN neighborhoods n ON n.id = r.neighborhood_id
      JOIN cities c ON c.id = n.city_id
      GROUP BY c.name, r.status
      ORDER BY c.name, r.status;
    `);
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

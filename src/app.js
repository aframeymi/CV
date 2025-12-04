// src/app.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../prismaClient.js';
import cookieParser from 'cookie-parser';
import router from './routes/index.js';
import middleware from './middleware/index.js';
import reportsRouter from './routes/reports.js';
import uploadRouter from './routes/upload.js';
import { upload } from './routes/upload.js';
// import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Core middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(middleware.attachUserIfPresent); // expose req.user if cookie present
app.use(express.static('public'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// Routers
app.use(reportsRouter);
app.use(uploadRouter);
app.use(router);

// // Multer setup for multipart/form-data (report image uploads)
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'public', 'uploads')),
//   filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
// });
// const upload = multer({ storage });

// Home
app.get('/', (req, res) => {
  res.render('index', { title: 'Community Voice' });
});

// Auth-related pages
app.get('/sign_in', (req, res) => {
  res.render('sign_in', { title: 'Login' });
});

app.get('/sign_up', (req, res) => {
  res.render('sign_up', { title: 'Register' });
});

app.get('/graph', (req, res) => {
  res.render('graph', { title: 'Graph' });
});

app.get('/profile', middleware.verifyToken, (req, res) => {
  res.render('profile', { title: 'Profile' });
});

// Report form: load Cities with Neighborhoods
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

// Submit report: require auth, parse multipart, create atomically (Report + StatusChange [+ Attachment])
app.post(
  '/submit-report',
  middleware.verifyToken,
  upload.single('image'), // parses multipart: puts fields into req.body and file into req.file
  async (req, res) => {
    try {
      const { title, description, neighborhoodId } = req.body;
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

      if (!title || !description || !neighborhoodId) {
        return res.status(422).send('title, description, and neighborhoodId are required.');
      }

      // Verify author
      const email = req.user?.email;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(403).send('User profile not found.');
      }

      // Verify neighborhood
      const nbh = await prisma.neighborhood.findUnique({ where: { id: neighborhoodId } });
      if (!nbh) {
        return res.status(422).send('Invalid neighborhoodId.');
      }

      // Transaction: create report + initial statusChange (OPEN -> OPEN) + optional attachment
      await prisma.$transaction(async (tx) => {
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

        await tx.statusChange.create({
          data: {
            reportId: created.id,
            from: 'OPEN',
            to: 'OPEN',
            changedBy: user.email || null,
          },
        });

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

      return res.redirect('/track');
    } catch (error) {
      console.error('Error submitting report:', error);
      return res.status(500).send('There was a problem submitting your report.');
    }
  }
);

// Track page: show reports with author and neighborhood + city
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

// Load edit form
app.get('/track/:id/edit', async (req, res) => {
  const { id } = req.params;
  try {
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) return res.status(404).send('Report not found');

    res.render('edit', { title: 'Edit Report', report });
  } catch (err) {
    console.error('Error loading edit page:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Handle form submission for edits
app.post('/track/:id/edit', async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;
  try {
    await prisma.report.update({
      where: { id },
      data: { ...({title: title}), 
      ...({description:description })},
    });
    res.redirect('/track');
  } catch (err) {
    console.error('Error updating report:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Raw SQL: counts of reports per status per city
app.get('/admin/report-stats', async (req, res) => {
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

// ORM analytics: counts by status, top reporters, busiest neighborhoods
app.get('/admin/analytics', async (req, res) => {
  try {
    // Counts of reports by status
    const countsByStatus = await prisma.report.groupBy({
      by: ['status'],
      _count: { _all: true },
      orderBy: { status: 'asc' },
    });

    // Top reporters by number of reports
    const topReporters = await prisma.user.findMany({
      select: {
        firstName: true,
        lastName: true,
        email: true,
        _count: { select: { reports: true } },
      },
      orderBy: { reports: { _count: 'desc' } },
      take: 5,
    });

    // Busiest neighborhoods: order by count of the grouped field (neighborhoodId)
    const busiestNeighborhoods = await prisma.report.groupBy({
      by: ['neighborhoodId'],
      _count: { neighborhoodId: true },                 // count grouped field
      orderBy: { _count: { neighborhoodId: 'desc' } },  // order by that count
      take: 5,
    });

    // Hydrate neighborhood and city names
    const busiestWithNames = await Promise.all(
      busiestNeighborhoods.map(async (r) => {
        const n = await prisma.neighborhood.findUnique({
          where: { id: r.neighborhoodId },
          include: { city: true },
        });
        return {
          neighborhood: n?.name ?? '(unknown)',
          city: n?.city?.name ?? '(unknown)',
          count: r._count.neighborhoodId, // note the field used in _count
        };
      })
    );

    res.json({
      countsByStatus,
      topReporters,
      busiestNeighborhoods: busiestWithNames,
    });
  } catch (e) {
    console.error('analytics error:', e);
    res.status(500).send('Could not fetch analytics');
  }
});

/*
  NOTE: Old slug/name/detail CRUD routes removed because they don’t match the current Prisma schema.
  If you still need edit/delete flows, re-implement them with the correct fields (title, description, imageUrl, neighborhoodId).
*/

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});

export default app;

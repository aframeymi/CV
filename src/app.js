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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(middleware.attachUserIfPresent); 
app.use(express.static('public'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(reportsRouter);
app.use(uploadRouter);
app.use(router);


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

app.get('/profile', middleware.verifyToken, (req, res) => {
  res.render('profile', { title: 'Profile' });
});

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

app.post(
  '/submit-report',
  middleware.verifyToken,
  upload.single('image'), 
  async (req, res) => {
    try {
      const { title, description, neighborhoodId } = req.body;
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

      if (!title || !description || !neighborhoodId) {
        return res.status(422).send('title, description, and neighborhoodId are required.');
      }

      const email = req.user?.email;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(403).send('User profile not found.');
      }

      const nbh = await prisma.neighborhood.findUnique({ where: { id: neighborhoodId } });
      if (!nbh) {
        return res.status(422).send('Invalid neighborhoodId.');
      }

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

app.get('/admin/analytics', async (req, res) => {
  try {
    const countsByStatus = await prisma.report.groupBy({
      by: ['status'],
      _count: { _all: true },
      orderBy: { status: 'asc' },
    });

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

    const busiestNeighborhoods = await prisma.report.groupBy({
      by: ['neighborhoodId'],
      _count: { neighborhoodId: true },                 
      orderBy: { _count: { neighborhoodId: 'desc' } },  
      take: 5,
    });

    const busiestWithNames = await Promise.all(
      busiestNeighborhoods.map(async (r) => {
        const n = await prisma.neighborhood.findUnique({
          where: { id: r.neighborhoodId },
          include: { city: true },
        });
        return {
          neighborhood: n?.name ?? '(unknown)',
          city: n?.city?.name ?? '(unknown)',
          count: r._count.neighborhoodId, 
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

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});

export default app;

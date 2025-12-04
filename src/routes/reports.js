import { Router } from 'express';
import prisma from '../../prismaClient.js';
import middleware from '../middleware/index.js';
import { upload } from './upload.js';

const reportsRouter = Router();

reportsRouter.post(
  '/api/reports',
  middleware.verifyToken,
  upload.single('image'), 
  async (req, res) => {
    try {
      const { title, description } = req.body;
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required.' });
      }

      const email = req.user?.email;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(403).json({ error: 'User profile not found' });

      const report = await prisma.report.create({
        data: {
          title,
          description,
          imageUrl,
          authorId: user.id,
          status: 'OPEN',
        },
      });

      res.status(201).json({ message: 'Report created successfully', report });
    } catch (err) {
      console.error('Error creating report:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

reportsRouter.get('/api/reports', async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { name: true, surname: true, email: true } } },
    });
    res.json({ reports });
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default reportsRouter;

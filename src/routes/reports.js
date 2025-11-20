import { Router } from 'express';
import prisma from '../../prismaClient.js';
import middleware from '../middleware/index.js';

const reportsRouter = Router();

// Create report (must be logged in)
reportsRouter.post('/api/reports', middleware.verifyToken, async (req, res) => {
  try {
    const { title, description, imageUrl } = req.body;

    // Find user by email from decoded token
    const email = req.user?.email;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(403).json({ error: 'User profile not found' });

    const report = await prisma.report.create({
      data: {
        title,
        description,
        imageUrl: imageUrl || null,
        authorId: user.id,
        status: 'OPEN',
      },
    });

    res.status(201).json({ message: 'Report created', report });
  } catch (err) {
    console.error('Error creating report:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// List all reports (public)
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

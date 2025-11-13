import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../prismaClient.js';
import cookieParser from 'cookie-parser';
import { createRequire } from 'module';
import router from './routes/index.js';
import verifyToken from './middleware/index.js';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
const port = process.env.PORT || 4001;

app.use(router);


app.get('/', (request, response) => {
  response.render("index", {
    title: "Community Voice"
  });
});

app.get('/sign_in', (request, response) => {
  response.render("sign_in", {
    title: "Login"
  });
});

app.get('/sign_up', (request, response) => {
  response.render("sign_up", {
    title: "Register"
  });
});

app.get('/graph', (request, response) => {
  response.render("graph", {
    title: "Graph"
  });
});

app.get('/report', (request, response) => {
  response.render("report", {
    title: "Report"
  });
});

app.get('/profile', verifyToken, (req, res) => {
  res.render('profile', { title: 'Profile' });
});


app.post('/register', (req, res) => {
  res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Under Process</title>
          <style>
              body { font-family: Arial, sans-serif; text-align: center; margin-top: 100px; }
              h1 { color: #ff0000; }
              p { color: #555; }
              a { text-decoration: none; color: #007BFF; font-weight: bold; }
              a:hover { text-decoration: underline; }
          </style>
      </head>
      <body>
          <h1>Oops!</h1>
          <p>This is still under process.</p>
          <a href="/">Go Back to Home</a>
      </body>
      </html>
  `);
});

app.post('/feedback', (request, response) => {
  response.send(`Thank you ${request.body.email}. Your feedback is important for us.`);
});


app.post('/submit-report', async (request, response) => {
  try {
    const { name, slug, detail } = request.body;
    
    const report = await prisma.report.create({
      data: {
        name: name,
        slug: slug,
        detail: detail
      }
    });

    response.redirect('/track');
  } catch (error) {
    console.error("Error submitting report:", error);
    response.status(500).send('There was a problem submitting your report.');
  }
});

app.get('/track', async (request, response) => {
  try {
    const reports = await prisma.report.findMany();

    response.render("track", {
      title: "Track",
      reports: reports
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    response.status(500).send('Could not fetch reports.');
  }
});

app.get('/track/:slug/edit', async (request, response) => {
  try {
    const slug = request.params.slug;
    
    const report = await prisma.report.findUnique({
      where: { slug: slug }
    });

    if (!report) {
      return response.status(404).send('Could not find that report.');
    }

    response.render('edit', { title: "Edit Report", report: report });
  } catch (error) {
    console.error("Error finding report to edit:", error);
    response.status(404).send('Could not find the page.');
  }
});

app.post('/track/:slug/edit', async (request, response) => {
  try {
    const slug = request.params.slug;
    const { name, slug: newSlug, detail } = request.body; 

    const updatedReport = await prisma.report.update({
      where: { slug: slug },
      data: {
        name: name,
        slug: newSlug,
        detail: detail,
      }
    });

    response.redirect('/track');
  } catch (error) {
    console.error("Error updating report:", error);
    if (error.code === 'P2025') {
      return response.status(404).send('Report Not Found');
    }
    response.status(500).send('Something went wrong, please try again.');
  }
});

app.post('/track/:slug/delete', async (request, response) => {
  try {
    const slug = request.params.slug;
    
    await prisma.report.delete({
      where: { slug: slug }
    });

    response.redirect('/track');
  } catch (error) {
    console.error("Error deleting report:", error);
    if (error.code === 'P2025') {
      return response.status(404).send('Report Not Found');
    }
    response.status(500).send('There was a problem, please try again.');
  }
});


app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});

export default app;



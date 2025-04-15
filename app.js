import express, { response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { databaseconnect } from './db.js';
databaseconnect()
import { Report } from './model/reports.js';
import { request } from 'http';
import { title } from 'process';

const app = express();



app.use(express.json())
app.use(express.urlencoded({extended: true }))
app.use(express.static('public'));
app.set('view engine', 'ejs');
const port = 4000;

app.get('/', (request, response) => {
    response.render("index", {
      title: "Community Voice"
    });
  })

app.get('/sign_in', (request, response) => {
    response.render("sign_in", {
      title:"Login"
    });
  })

  app.get('/sign_up', (request, response) => {
    response.render("sign_up", {
      title: "Register"
    });
  })

  app.get('/graph', (request, response) => {
    response.render("graph", {
      title: "Graph"
    });
  })

app.post('/submit-report', async (request, response) => {
  const report = new Report({
    name:request.body.name,
    slug:request.body.slug,
    detail:request.body.detail
  })

  await report.save()

  response.redirect('/track')
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
              body {
                  font-family: Arial, sans-serif;
                  text-align: center;
                  margin-top: 100px;
              }
              h1 {
                  color: #ff0000;
              }
              p {
                  color: #555;
              }
              a {
                  text-decoration: none;
                  color: #007BFF;
                  font-weight: bold;
              }
              a:hover {
                  text-decoration: underline;
              }
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




app.get('/report',(request, response) => {
  response.render("report", {
    title: "Report"
  });
})

app.get('/track', async (request, response) =>{ 

  const reports = await Report.find()

  response.render("track", {
    title: "Track",
    reports: reports
  });
})


app.get('/track/:slug/edit', async (request,response) => {
  try {
    const slug = request.params.slug
    const report = await Report.findOne({ slug:slug}).exec()
    if (!report) throw new Error('report not found')

    response.render('edit',{title:"edit", report:report})
  } catch (error) {
    console.error(error)
    response.status(404).send('Could not fint the page')
  }
})


app.post('/track/:slug/edit', async (request, response) => {
  try {
    const slug = request.params.slug;
    const updatedData = {
      name : request.body.name,
      slug : request.body.slug,
      detail : request.body.details,
    };

    const report = await Report.findOneAndUpdate({slug: slug}, updatedData, {new:true}).exec()
    if (!report) throw new Error('Report Not Found')

    response.redirect('/track')
  } catch (error) {
    console.error(error);
    response.status(404).send('Something went wrong please try again')
  }
})


app.post('/track/:slug/delete', async (request,response) => {
  try {
    const slug = request.params.slug
    const report = await Report.findOneAndDelete({slug:slug}).exec()
    if (!report) throw new Error ('Report Not found')

    response.redirect('/track')
  } catch (error) {
    console.error(error)
    response.status(500).send('There was a problem please try again')
  }
})



app.get('/profile', (request,response) => {
  response.render("profile", {
    title: "Profile"
  })
})


app.post('/feedback' ,(request, response) => {
  
  response.send(`Thank you ${request.body.email}. Your feedback is important for us.`);
})

app.listen(port, () => {
    console.log(`Started server on port ${port}`);
})
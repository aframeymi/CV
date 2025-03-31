import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import data from './data.json' with {type:"json"}
import { databaseconnect } from './db.js';
databaseconnect()
import { Report } from './model/reports.js';

console.log(data)

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

  response.send('report submited')
});

app.get('/report',(request, response) => {
  response.render("report", {
    title: "Report"
  });
})

app.get('/track', (request, response) =>{
  response.render("track", {
    title: "Track"
  });
})

app.get('/profile', (request,response) => {
  response.render("profile", {
    title: "Profile"
  })
})

// app.get('/track/:id', (request, response) => {
//   const trackId = request.params.id;
//   response.send(`An update was posted for: ${trackId}`)
//   response.sendFile(__dirname + '/report5.html');
// } )

app.post('/feedback' ,(request, response) => {
  
  response.send(`Thank you ${request.body.email}. Your feedback is important for us.`);
})

app.listen(port, () => {
    console.log(`Started server on port ${port}`);
})

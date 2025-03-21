import express, { response } from 'express';
import { request } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import data from './data.json' with {type:"json"}
import { title } from 'process';

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

  // app.get('/register', (request, response) => {
  //   response.render("register");
  // })

  app.get('/graph', (request, response) => {
    response.render("graph", {
      title: "Graph"
    });
  })

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

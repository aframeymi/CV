import express, { response } from 'express';
import { request } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import data from './data.json' with {type:"json"}

console.log(data)

const app = express();



app.use(express.json())
app.use(express.urlencoded({extended: true }))
app.use(express.static('public'));
app.set('view engine', 'ejs');
const port = 3000;

app.get('/', (request, response) => {
    response.render("home");
  })

app.get('/sign_in', (request, response) => {
    response.sendFile(__dirname+'/sign_in.html');
  })

  app.get('/sign_up', (request, response) => {
    response.sendFile(__dirname+'/sign_up.html');
  })

  app.get('/register', (request, response) => {
    response.sendFile(__dirname+'/register.html');
  })

  app.get('/graph', (request, response) => {
    response.sendFile(__dirname+'/graph.html');
  })

app.get('/report',(request, response) => {
  response.sendFile(__dirname+'/report.html');
})

app.get('/track', (request, response) =>{
  response.sendFile(__dirname + '/track.html');
})

app.get('/track/:id', (request, response) => {
  const trackId = request.params.id;
  // response.send(`An update was posted for: ${trackId}`)
  response.sendFile(__dirname + '/report5.html');
} )

app.post('/feedback' ,(request, response) => {
  //console.log(request.body.email)
  
  response.send(`Thank you ${request.body.email}. Your feedback is important for us.`);
})

app.listen(port, () => {
    console.log(`Started server on port ${port}`);
})

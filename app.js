import express, { response } from 'express';
import { request } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json())
app.use(express.urlencoded({extended: true }))
app.use(express.static('public'));
app.set('view engine', 'ejs');
const port = 3000;

app.get('/home', (request, response) => {
    response.sendFile(__dirname+'/home.html');
  })

app.get('/report',(request, response) => {
  response.sendFile(__dirname+'/report.html');
})

app.get('/track', (request, response) =>{
  response.sendFile(__dirname + '/track.html');
})

app.get('/track/:id', (request, response) => {
  const homeId = request.params.id;

  response.send(`This is a dynamic route ${homeId}`)
} )

app.post('/feedback' ,(request, response) => {
  console.log(request.body.email)
  
  response.send(`Thank you ${request.body.email}. Your feedback is important for us.`);
})

app.listen(port, () => {
    console.log(`Started server on port ${port}`);
})

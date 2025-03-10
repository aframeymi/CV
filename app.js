import express, { response } from 'express';

const app = express();
const port = 3000;

app.get('/', (request, response) => {
    response.send('Welcome to my Cookieshop!');
})

app.listen(port, () => {
    console.log(`Started server on port ${port}`);
})

import 'dotenv/config';
import app from './app.js';

const DEFAULT_PORT = 5000;
const port = process.env.PORT || DEFAULT_PORT;

app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});

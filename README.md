# Community Voice

About the website:
This project aims to creat a platform where citizens of Berlin can report city infrastructural problems that they see in their everyday life to the municipality.


Users can:
- Register
- Log in
- Submit reports
- Track reports
- Edit Reports
- Delete Reports
- Upload photos


Prerequisites:
- Node.js (18.0 or later)
- npm (9.0 or later)
- Git
- Prisma CLI
- Postgres Database (Neon or local)
- Firebase

Setup guide:
1. Clone
```bash
git clone https://github.com/aframeymi/CV.git
cd CV
```

2. Install Dependencies
```bash
npm install
```

3. Environment Variables
```bash
   DATABASE_URL="postgresql://<user>:<password>@<your-neon-host>/<database>?sslmode=require"

   FIREBASE_API_KEY=""
   FIREBASE_AUTH_DOMAIN=""
   FIREBASE_PROJECT_ID=""
   FIREBASE_STORAGE_BUCKET=""
   FIREBASE_MESSAGING_SENDER_ID=""
   FIREBASE_APP_ID=""

   PORT=5000
```

4. Initialize prisma
```bash
npx prisma migrate deploy
```

5. Seed
```bash
npm run prisma:seed
```

6. Run
```bash
npm run dev
```

http://localhost:5000


To open prisma studio:
```bash
npx prisma studio
```

The website is deployed on render.com
https://cv-wluv.onrender.com



Database table created on:
dbdiagram.io


![alt text](<CV Tables.png>)
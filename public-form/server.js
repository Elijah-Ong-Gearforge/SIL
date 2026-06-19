const express = require('express');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Aiven Database Connection (SSL Fixed Configuration)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    require: true,
    rejectUnauthorized: false // This bypasses the self-signed certificate error
  }
});

// Handle Form Submission
app.post('/register', async (req, res) => {
  const { full_name, email, school, discord_tag, phone_number, cleared_dates, languages, past_contests, past_works_workshops } = req.body;
  
  try {
    await pool.query(
      `INSERT INTO sil_applicants 
      (full_name, email, school, discord_tag, phone_number, cleared_dates, languages, past_contests, past_works_workshops) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [full_name, email, school, discord_tag, phone_number, cleared_dates === 'true', languages, past_contests, past_works_workshops]
    );
    res.send(`
      <body style="font-family:sans-serif; text-align:center; padding-top:100px; background:#f3f4f6;">
        <h1 style="color:#16a34a;">Application Submitted!</h1>
        <p>Thanks for applying to the SIL 2026 team. We will be in touch via Discord.</p>
      </body>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred. Please try again.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Public Form running on port ${PORT}`));

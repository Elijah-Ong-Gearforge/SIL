const express = require('express');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Parse and enforce strict custom SSL parameters over Aiven strings
const dbUrl = process.env.AIVEN_URL;
const pool = new Pool({
  connectionString: dbUrl.includes('?') ? dbUrl.split('?')[0] : dbUrl,
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
});

// Handle All-In-One Form Submission
app.post('/register', async (req, res) => {
  const { 
    full_name, email, school_email, school, academic_level, gender, 
    discord_tag, phone_number, cleared_dates, languages, noi_achievement, 
    cence_courses, computing_qualification, skill_level, past_contests, past_works_workshops 
  } = req.body;
  
  try {
    await pool.query(
      `INSERT INTO sil_applicants 
      (full_name, email, school_email, school, academic_level, gender, discord_tag, phone_number, cleared_dates, languages, noi_achievement, cence_courses, computing_qualification, skill_level, past_contests, past_works_workshops) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        full_name, email, school_email, school, academic_level, gender, 
        discord_tag, phone_number, cleared_dates === 'true', languages, noi_achievement, 
        cence_courses === 'true', computing_qualification, skill_level, past_contests, past_works_workshops
      ]
    );

    // Modern styled Thank You page response
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registration Submitted</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #f3f4f6;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            color: #1e293b;
          }
          .card {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.06);
            text-align: center;
            max-width: 450px;
            width: 100%;
            box-sizing: border-box;
            border: 1px solid #e2e8f0;
          }
          .icon {
            font-size: 48px;
            color: #16a34a;
            margin-bottom: 16px;
          }
          h1 {
            font-size: 24px;
            font-weight: 700;
            margin: 0 0 8px 0;
            color: #0f172a;
          }
          p {
            font-size: 15px;
            color: #64748b;
            line-height: 1.6;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✓</div>
          <h1>Thank You!</h1>
          <p>Your registration for SIL 2026 has been successfully submitted. If selected, you will be sent an email regarding this shortly.</p>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred. Please try again.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Public Form running on port ${PORT}`));

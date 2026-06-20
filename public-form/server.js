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

// Handle Form Submission
app.post('/register', async (req, res) => {
  const { 
    full_name, school, school_email, academic_level, gender, 
    noi_achievement, cence_courses, computing_qualification, 
    skill_level, rules_agreed 
  } = req.body;
  
  try {
    await pool.query(
      `INSERT INTO sil_applicants 
      (full_name, school, school_email, academic_level, gender, noi_achievement, cence_courses, computing_qualification, skill_level, rules_agreed) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        full_name, school, school_email, academic_level, gender, 
        noi_achievement, cence_courses === 'true', computing_qualification, 
        skill_level, rules_agreed === 'true'
      ]
    );
    res.send(`
      <body style="font-family:sans-serif; text-align:center; padding-top:100px; background:#f3f4f6;">
        <h1 style="color:#16a34a;">Registration Complete!</h1>
        <p>Thank you for registering for SIL 2026. Please check your school email for further instructions soon.</p>
      </body>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred. Please try again.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Public Form running on port ${PORT}`));

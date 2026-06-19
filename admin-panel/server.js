const express = require('express');
const { Pool } = require('pg');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

const app = express();

// Session Setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'sil-super-secret-key',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Google Auth Strategy
// Update it to this:
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://sil-admin-panel.onrender.com/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
    return cb(null, profile);
  }
));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Aiven Database Connection (SSL Required)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
});

// Middleware to check if it is YOUR email
const isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.emails[0].value === process.env.ADMIN_EMAIL) {
    return next();
  }
  res.status(403).send(`
    <body style="font-family:sans-serif; text-align:center; padding-top:100px;">
      <h1 style="color:#dc2626;">403 Forbidden</h1>
      <p>You are not the authorized admin. <a href="/auth/google">Switch Account</a></p>
    </body>
  `);
};

// Auth Routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => res.redirect('/dashboard'));
app.get('/logout', (req, res, next) => { req.logout((err) => { if(err) return next(err); res.redirect('/'); }); });

// Default Route
app.get('/', (req, res) => {
  res.send(`<body style="font-family:sans-serif; text-align:center; padding-top:100px;">
              <h2>SIL Admin Panel</h2>
              <a href="/auth/google" style="padding:10px 20px; background:#2563eb; color:white; text-decoration:none; border-radius:5px;">Login with Google</a>
            </body>`);
});

// Dashboard Route
app.get('/dashboard', isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sil_applicants ORDER BY applied_at DESC');
    
    let rows = result.rows.map(app => `
      <tr>
        <td><b>${app.full_name}</b></td>
        <td><a href="mailto:${app.email}">${app.email}</a></td>
        <td>${app.school}</td>
        <td style="background: #eff6ff; font-weight: 500;">${app.discord_tag}</td>
        <td>${app.phone_number || 'N/A'}</td>
        <td>${app.languages}</td>
        <td>${app.past_contests ? app.past_contests.replace(/\n/g, '<br>') : 'None'}</td>
        <td>${app.past_works_workshops ? app.past_works_workshops.replace(/\n/g, '<br>') : 'None'}</td>
        <td><span style="color:#16a34a; font-weight:bold;">✓ Cleared</span></td>
      </tr>
    `).join('');

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SIL 2026 Dashboard</title>
        <style>
          body { font-family: sans-serif; background: #f9fafb; padding: 30px; color: #111827; }
          .container { max-width: 1200px; margin: 0 auto; background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
          th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
          th { background-color: #1f2937; color: white; }
          tr:nth-child(even) { background-color: #f9fafb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h2>SIL Recruitment Dashboard</h2>
            <p>Logged in as: <b>${req.user.emails[0].value}</b> | <a href="/logout">Logout</a></p>
          </div>
          <p>Total Applicants: <b>${result.rows.length}</b></p>
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>School</th><th>Discord</th><th>Phone</th>
                <th>Languages</th><th>Past Contests</th><th>Works & Workshops</th><th>Dates</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length > 0 ? rows : '<tr><td colspan="9" style="text-align:center;">No applications yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error fetching applicants.");
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Admin Panel online on port ${PORT}`));

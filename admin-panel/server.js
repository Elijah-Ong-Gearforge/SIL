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
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SIL 2026 Admin Dashboard</title>
        <style>
          :root {
            --bg-main: #f8fafc;
            --sidebar-bg: #0f172a;
            --text-dark: #1e293b;
            --text-muted: #64748b;
            --accent: #2563eb;
            --accent-hover: #1d4ed8;
            --border: #e2e8f0;
          }
          
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            background: var(--bg-main); 
            margin: 0; 
            display: flex;
            min-height: 100vh;
            color: var(--text-dark);
          }

          /* Sidebar Layout */
          .sidebar {
            width: 260px;
            background: var(--sidebar-bg);
            color: white;
            padding: 30px 20px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
          }
          .sidebar-brand {
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 0.5px;
            margin-bottom: 40px;
            color: #f8fafc;
          }
          .admin-profile {
            background: rgba(255,255,255,0.05);
            padding: 12px;
            border-radius: 8px;
            font-size: 13px;
          }
          .admin-email {
            font-weight: 600;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .logout-btn {
            display: inline-block;
            margin-top: 8px;
            color: #f87171;
            text-decoration: none;
          }
          .logout-btn:hover { text-decoration: underline; }

          /* Main Content Area */
          .main-content {
            flex-1;
            width: calc(100% - 260px);
            padding: 40px;
            box-sizing: border-box;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 32px;
          }
          h2 { margin: 0; font-size: 28px; font-weight: 700; }
          
          /* Stats Card */
          .stats-card {
            background: white;
            padding: 20px 24px;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            border: 1px solid var(--border);
            display: inline-block;
            margin-bottom: 24px;
          }
          .stats-label { font-size: 14px; color: var(--text-muted); font-weight: 500; }
          .stats-val { font-size: 32px; font-weight: 700; color: var(--accent); margin-top: 4px; }

          /* Table Styling */
          .table-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
            border: 1px solid var(--border);
            overflow: hidden;
          }
          table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
          th { background: #f1f5f9; padding: 16px; font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--border); }
          td { padding: 16px; border-bottom: 1px solid var(--border); vertical-align: top; line-height: 1.5; }
          tr:last-child td { border-bottom: none; }
          tr:hover { background: #f8fafc; }

          /* Custom Badges */
          .badge-discord {
            background: #eef2ff;
            color: #4338ca;
            padding: 4px 8px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 13px;
            display: inline-block;
          }
          .badge-status {
            background: #f0fdf4;
            color: #16a34a;
            padding: 4px 8px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 12px;
          }
          .text-link { color: var(--accent); text-decoration: none; }
          .text-link:hover { text-decoration: underline; }
          .empty-state { padding: 40px; text-align: center; color: var(--text-muted); font-size: 16px; }
        </style>
      </head>
      <body>

        <div class="sidebar">
          <div class="sidebar-top">
            <div class="sidebar-brand">SIL 2026</div>
          </div>
          <div class="admin-profile">
            <div class="stats-label">Logged in as:</div>
            <div class="admin-email" title="${req.user.emails[0].value}">${req.user.emails[0].value}</div>
            <a href="/logout" class="logout-btn">Logout</a>
          </div>
        </div>

        <div class="main-content">
          <div class="header-row">
            <h2>Recruitment Dashboard</h2>
          </div>

          <div class="stats-card">
            <div class="stats-label">Total Applications</div>
            <div class="stats-val">${result.rows.length}</div>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Applicant Details</th>
                  <th>School</th>
                  <th>Discord & Contact</th>
                  <th>Languages</th>
                  <th>Past Contests</th>
                  <th>Works & Workshops</th>
                  <th>Availability</th>
                </tr>
              </thead>
              <tbody>
                ${rows.length > 0 ? rows : '<tr><td colspan="7" class="empty-state">No applications received yet.</td></tr>'}
              </tbody>
            </table>
          </div>
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

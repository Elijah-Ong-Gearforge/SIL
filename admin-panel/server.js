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

// Parse and enforce strict custom SSL parameters over Aiven strings
const dbUrl = process.env.AIVEN_URL;
const pool = new Pool({
  connectionString: dbUrl.includes('?') ? dbUrl.split('?')[0] : dbUrl,
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
});

// Middleware to check if the user is an authorized admin
const isAdmin = (req, res, next) => {
  // Get the list of admin emails from environment variables, split by commas, and trim whitespace
  const allowedAdmins = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase());

  if (req.isAuthenticated() && req.user.emails && req.user.emails[0]) {
    const userEmail = req.user.emails[0].value.toLowerCase();
    
    if (allowedAdmins.includes(userEmail)) {
      return next();
    }
  }
  
  res.status(403).send(`
    <body style="font-family:sans-serif; text-align:center; padding-top:100px; background:#f8fafc; color:#1e293b;">
      <h1 style="color:#dc2626; font-size:48px; margin-bottom:10px;">403 Forbidden</h1>
      <p style="font-size:18px; color:#64748b;">You are not an authorized admin for this dashboard.</p>
      <p><a href="/auth/google" style="color:#2563eb; text-decoration:none; font-weight:600;">Click here to Switch Accounts</a></p>
    </body>
  `);
};

// Auth Routing Routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }), 
  (req, res) => res.redirect('/dashboard')
);

app.get('/logout', (req, res, next) => { 
  req.logout((err) => { 
    if(err) return next(err); 
    res.redirect('/'); 
  }); 
});

// Default Route (Sleek Professional Alps Login Page)
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SIL Staff Portal - Login</title>
      <style>
        body {
          margin: 0; padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: linear-gradient(rgba(15, 23, 42, 0.4), rgba(15, 23, 42, 0.4)), 
                      url('https://images.unsplash.com/photo-1531315630201-bb15abeb1653?q=80&w=1200&auto=format&fit=crop');
          background-size: cover; background-position: center; background-attachment: fixed;
          display: flex; justify-content: center; align-items: center; height: 100vh;
        }
        .login-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          padding: 40px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          width: 100%; max-width: 380px; text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.3); box-sizing: border-box;
        }
        .logo-area { font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: 0.5px; margin-bottom: 8px; }
        .tagline { font-size: 14px; color: #475569; margin-bottom: 35px; }
        .divider { height: 1px; background: #cbd5e1; margin-bottom: 30px; position: relative; }
        .divider span {
          position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
          background: #e2e8f0; padding: 0 10px; font-size: 12px; color: #64748b; font-weight: 500; border-radius: 10px;
        }
        .btn-google {
          display: flex; align-items: center; justify-content: center; gap: 12px;
          width: 100%; padding: 12px; background: #ffffff; color: #1e293b;
          text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 8px;
          border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.05); transition: all 0.2s ease; box-sizing: border-box;
        }
        .btn-google:hover {
          background: #f8fafc; border-color: #94a3b8; transform: translateY(-1px); box-shadow: 0 4px 6px rgba(0,0,0,0.08);
        }
        .btn-google img { width: 18px; height: 18px; }
        .footer-note { margin-top: 35px; font-size: 11px; color: #64748b; line-height: 1.4; }
      </style>
    </head>
    <body>
      <div class="login-card">
        <div class="logo-area">SINGAPORE INFORMATICS LEAGUE</div>
        <div class="tagline">Official Committee Portal</div>
        <div class="divider"><span>STAFF SECURE ACCESS</span></div>
        <a href="/auth/google" class="btn-google">
          <img src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/web-24dp/copy_of_24dp.png" alt="Google Logo">
          Sign in with Google
        </a>
        <div class="footer-note">
          This system is restricted to authorized SIL personnel only. Unauthorized access attempts are monitored and logged.
        </div>
      </div>
    </body>
    </html>
  `);
});

// Dashboard Route (Beautiful SaaS Layout with Full Dataset)
app.get('/dashboard', isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sil_applicants ORDER BY applied_at DESC');
    
    let rows = result.rows.map(app => `
      <tr>
        <td>
          <strong style="font-size: 15px; color: var(--text-dark);">${app.full_name}</strong><br>
          <span style="font-size: 12px; color: var(--text-muted);">${app.academic_level} • ${app.gender}</span>
        </td>
        <td>
          <span style="font-size: 12px; font-weight:600; color:var(--text-muted);">SCH:</span> <a href="mailto:${app.school_email}" class="text-link">${app.school_email}</a><br>
          <span style="font-size: 12px; font-weight:600; color:var(--text-muted);">PERS:</span> <a href="mailto:${app.email}" class="text-link">${app.email}</a>
        </td>
        <td>
          <strong style="color: #0f172a;">${app.school}</strong><br>
          <span style="font-size: 12px; color: var(--text-muted);">${app.phone_number || 'No Phone'}</span>
        </td>
        <td>
          <span class="badge-discord">${app.discord_tag}</span>
        </td>
        <td>
          <span style="font-weight:600; color:#1e3a8a;">NOI: ${app.noi_achievement}</span><br>
          <span style="font-size: 12px; color: var(--text-muted);">CeNCE: ${app.cence_courses ? 'Yes' : 'No'}</span><br>
          <span style="font-size: 12px; color: var(--text-muted);">Qual: ${app.computing_qualification}</span>
        </td>
        <td>
          <code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-weight:600; font-size:12px; color:#0f172a;">${app.skill_level}</code><br>
          <span style="font-size:12px; color:var(--text-muted); display:inline-block; margin-top:4px;">${app.languages}</span>
        </td>
        <td style="max-width: 200px; font-size: 12px; color: var(--text-dark); max-height:100px; overflow-y:auto; white-space:pre-line;">${app.past_contests || 'None'}</td>
        <td style="max-width: 200px; font-size: 12px; color: var(--text-dark); max-height:100px; overflow-y:auto; white-space:pre-line;">${app.past_works_workshops || 'None'}</td>
        <td>
          ${app.cleared_dates ? '<span class="badge-status">✓ Cleared</span>' : '<span style="color:#dc2626; font-weight:bold;">✗ No</span>'}
        </td>
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
            background: var(--bg-main); margin: 0; display: flex; min-height: 100vh; color: var(--text-dark);
          }
          .sidebar {
            width: 260px; background: var(--sidebar-bg); color: white; padding: 30px 20px;
            display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;
          }
          .sidebar-brand { font-size: 20px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 40px; color: #f8fafc; }
          .admin-profile { background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; font-size: 13px; }
          .admin-email { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .logout-btn { display: inline-block; margin-top: 8px; color: #f87171; text-decoration: none; }
          .logout-btn:hover { text-decoration: underline; }
          .main-content { flex: 1; width: calc(100% - 260px); padding: 40px; box-sizing: border-box; }
          .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
          h2 { margin: 0; font-size: 28px; font-weight: 700; }
          .stats-card {
            background: white; padding: 20px 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            border: 1px solid var(--border); display: inline-block; margin-bottom: 24px;
          }
          .stats-label { font-size: 14px; color: var(--text-muted); font-weight: 500; }
          .stats-val { font-size: 32px; font-weight: 700; color: var(--accent); margin-top: 4px; }
          .table-container { background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid var(--border); overflow-x: auto; }
          table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; min-width: 1200px; }
          th { background: #f1f5f9; padding: 14px; font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--border); }
          td { padding: 14px; border-bottom: 1px solid var(--border); vertical-align: top; line-height: 1.4; }
          tr:last-child td { border-bottom: none; }
          tr:hover { background: #f8fafc; }
          .badge-discord { background: #eef2ff; color: #4338ca; padding: 4px 8px; border-radius: 6px; font-weight: 600; font-size: 12px; display: inline-block; }
          .badge-status { background: #f0fdf4; color: #16a34a; padding: 4px 8px; border-radius: 6px; font-weight: 600; font-size: 12px; }
          .text-link { color: var(--accent); text-decoration: none; }
          .text-link:hover { text-decoration: underline; }
          .empty-state { padding: 40px; text-align: center; color: var(--text-muted); font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="sidebar">
          <div class="sidebar-top"><div class="sidebar-brand">SIL 2026</div></div>
          <div class="admin-profile">
            <div class="stats-label">Logged in as:</div>
            <div class="admin-email" title="${req.user.emails[0].value}">${req.user.emails[0].value}</div>
            <a href="/logout" class="logout-btn">Logout</a>
          </div>
        </div>
        <div class="main-content">
          <div class="header-row"><h2>Recruitment Dashboard</h2></div>
          <div class="stats-card">
            <div class="stats-label">Total Applications</div>
            <div class="stats-val">${result.rows.length}</div>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Email Records</th>
                  <th>School & Contact</th>
                  <th>Discord</th>
                  <th>Qualifications</th>
                  <th>Skills & Langs</th>
                  <th>Past Contests</th>
                  <th>Workshops/Works</th>
                  <th>Dates</th>
                </tr>
              </thead>
              <tbody>
                ${rows.length > 0 ? rows : '<tr><td colspan="9" class="empty-state">No applications received yet.</td></tr>'}
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

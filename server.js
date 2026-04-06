const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
const DATA_FILE = path.join(__dirname, 'data', 'book.json');
const ADMIN_PASSWORD = '12345';
const READER_PASSWORD = 'edmund01';

// Ensure data directory and file exist
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    title: 'My Book',
    subtitle: '',
    chapters: []
  }, null, 2));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'writing-site-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

function requireAdmin(req, res, next) {
  if (req.session.isAdmin) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// Readers send the password as "Authorization: Bearer <password>" on every
// request. Nothing is stored in a session or cookie — so refreshing the page
// means re-entering the password on the client side, and there is no
// persistent token that could be stolen from browser storage.
function requireReader(req, res, next) {
  if (req.session.isAdmin) return next(); // admin can always read
  const auth = req.headers['authorization'] || '';
  if (auth === `Bearer ${READER_PASSWORD}`) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

function getData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ── Auth ──────────────────────────────────────────────────────────────────────

app.post('/api/admin/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Wrong password' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/admin/status', (req, res) => {
  res.json({ isAdmin: !!req.session.isAdmin });
});

// ── Book ──────────────────────────────────────────────────────────────────────

app.get('/api/book', requireReader, (req, res) => {
  res.json(getData());
});

app.put('/api/book', requireAdmin, (req, res) => {
  const { title, subtitle } = req.body;
  const data = getData();
  if (title !== undefined) data.title = title;
  if (subtitle !== undefined) data.subtitle = subtitle;
  saveData(data);
  res.json({ success: true });
});

// ── Chapters ──────────────────────────────────────────────────────────────────

app.post('/api/chapters', requireAdmin, (req, res) => {
  const { title, content } = req.body;
  const data = getData();
  const chapter = {
    id: Date.now().toString(),
    title: title || '',
    content: content || '',
    createdAt: new Date().toISOString()
  };
  data.chapters.push(chapter);
  saveData(data);
  res.json(chapter);
});

app.put('/api/chapters/:id', requireAdmin, (req, res) => {
  const { title, content } = req.body;
  const data = getData();
  const idx = data.chapters.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.chapters[idx] = {
    ...data.chapters[idx],
    title: title !== undefined ? title : data.chapters[idx].title,
    content: content !== undefined ? content : data.chapters[idx].content,
    updatedAt: new Date().toISOString()
  };
  saveData(data);
  res.json(data.chapters[idx]);
});

app.delete('/api/chapters/:id', requireAdmin, (req, res) => {
  const data = getData();
  data.chapters = data.chapters.filter(c => c.id !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

app.put('/api/chapters/reorder', requireAdmin, (req, res) => {
  const { order } = req.body;
  const data = getData();
  const map = Object.fromEntries(data.chapters.map(c => [c.id, c]));
  data.chapters = order.map(id => map[id]).filter(Boolean);
  saveData(data);
  res.json({ success: true });
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  Writing site → http://localhost:${PORT}`);
  console.log(`  Admin panel  → http://localhost:${PORT}/admin.html\n`);
});

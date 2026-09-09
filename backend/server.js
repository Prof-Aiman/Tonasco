import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';

const app = express();
const PORT = process.env.PORT || 3000;

const origins = (process.env.FRONTEND_ORIGIN || '')
  .split(',').map(v => v.trim()).filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (!origin || origins.length === 0 || origins.includes(origin)) return cb(null, true);
    cb(new Error('Origin not allowed by CORS'));
  }
}));
app.use(express.json());

function sheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth });
}

function tab() {
  return `'${String(process.env.GOOGLE_SHEET_TAB || '').replace(/'/g, "''")}'`;
}

const clean = v => String(v ?? '').trim();
const norm = v => clean(v).toLowerCase();

function todayMY() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date());
}

function rowToJig(row, sheetRow) {
  return {
    sheetRow,
    partNumber: clean(row[0]),
    registerId: clean(row[1]),
    machine: clean(row[2]),
    binNumber: clean(row[3]),
    status: clean(row[4]),
    borrower: clean(row[5]),
    dateBorrow: clean(row[6]),
    dateReturn: clean(row[7])
  };
}

async function readAll() {
  const sheets = sheetsClient();
  const r = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${tab()}!A2:H`
  });
  return (r.data.values || []).map((row, i) => rowToJig(row, i + 2));
}

async function byRegisterId(registerId) {
  const rows = await readAll();
  return rows.find(j => norm(j.registerId) === norm(registerId));
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'Tonasco Jig API' });
});

app.get('/api/jigs', async (req, res) => {
  try {
    const partNumber = clean(req.query.partNumber);
    if (!partNumber) return res.status(400).json({ message: 'partNumber is required.' });

    const rows = await readAll();
    res.json(rows.filter(j => norm(j.partNumber) === norm(partNumber)));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Unable to read Google Sheet.' });
  }
});

app.post('/api/jigs', async (req, res) => {
  try {
    const jig = {
      partNumber: clean(req.body.partNumber),
      registerId: clean(req.body.registerId),
      machine: clean(req.body.machine),
      binNumber: clean(req.body.binNumber),
      status: clean(req.body.status) || 'Available',
      borrower: clean(req.body.borrower),
      dateBorrow: clean(req.body.dateBorrow),
      dateReturn: clean(req.body.dateReturn)
    };

    if (!jig.partNumber || !jig.registerId) {
      return res.status(400).json({ message: 'Part Number and Register ID are required.' });
    }

    if (!['Available', 'Taken', 'Missing'].includes(jig.status)) {
      return res.status(400).json({ message: 'Status must be Available, Taken, or Missing.' });
    }

    if (await byRegisterId(jig.registerId)) {
      return res.status(409).json({ message: 'Register ID already exists.' });
    }

    const sheets = sheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${tab()}!A:H`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [[
        jig.partNumber,
        jig.registerId,
        jig.machine,
        jig.binNumber,
        jig.status,
        jig.borrower,
        jig.dateBorrow,
        jig.dateReturn
      ]] }
    });

    res.status(201).json(jig);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Unable to add jig.' });
  }
});

app.patch('/api/jigs/:registerId/complete', async (req, res) => {
  try {
    const jig = await byRegisterId(decodeURIComponent(req.params.registerId));

    if (!jig) {
      return res.status(404).json({ message: 'Register ID not found.' });
    }

    const machine = clean(req.body.machine);
    const binNumber = clean(req.body.binNumber);
    const status = clean(req.body.status) || 'Available';

    if (!machine || !binNumber) {
      return res.status(400).json({ message: 'Machine and Bin Number are required.' });
    }

    if (!['Available', 'Taken', 'Missing'].includes(status)) {
      return res.status(400).json({ message: 'Status must be Available, Taken, or Missing.' });
    }

    const sheets = sheetsClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${tab()}!C${jig.sheetRow}:E${jig.sheetRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[machine, binNumber, status]] }
    });

    res.json({
      ...jig,
      machine,
      binNumber,
      status
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Unable to complete jig record.' });
  }
});

app.patch('/api/jigs/:registerId/borrow', async (req, res) => {
  try {
    const jig = await byRegisterId(decodeURIComponent(req.params.registerId));
    const borrower = clean(req.body.borrower);

    if (!jig) return res.status(404).json({ message: 'Register ID not found.' });
    if (!borrower) return res.status(400).json({ message: 'Borrower name is required.' });
    if (norm(jig.status) === 'missing') return res.status(409).json({ message: 'Missing jig cannot be borrowed.' });
    if (norm(jig.status) === 'taken') return res.status(409).json({ message: 'Jig is already taken.' });

    const dateBorrow = todayMY();
    const sheets = sheetsClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${tab()}!E${jig.sheetRow}:H${jig.sheetRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['Taken', borrower, dateBorrow, '']] }
    });

    res.json({ ...jig, status: 'Taken', borrower, dateBorrow, dateReturn: '' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Unable to borrow jig.' });
  }
});

app.patch('/api/jigs/:registerId/return', async (req, res) => {
  try {
    const jig = await byRegisterId(decodeURIComponent(req.params.registerId));
    if (!jig) return res.status(404).json({ message: 'Register ID not found.' });

    const dateReturn = todayMY();
    const sheets = sheetsClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${tab()}!E${jig.sheetRow}:H${jig.sheetRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['Available', jig.borrower, jig.dateBorrow, dateReturn]] }
    });

    res.json({ ...jig, status: 'Available', dateReturn });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Unable to return jig.' });
  }
});

app.listen(PORT, () => console.log(`Tonasco Jig API running on ${PORT}`));

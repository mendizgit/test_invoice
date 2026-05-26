const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

// Quotations data route
app.get('/api/quotations', (req, res) => {
  try {
    const filePath = path.join(__dirname, 'data', 'quotations.json');
    console.log('Loading:', filePath);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch (err) {
    console.error('Error loading quotations:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Invoice generation route
const invoiceRouter = require('./routes/invoice');
app.use('/api/invoice', invoiceRouter);

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
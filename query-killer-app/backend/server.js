const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/kill-query', (req, res) => {
  const { host, user, password, query, killed_by_user, db_name } = req.body;

  const scriptPath = path.join(__dirname, '..', 'scripts', 'kill_mysql_query.py');
  const args = [
    host, user, password || '', query, 
    '--killed_by_user', killed_by_user
  ];

  if (db_name) {
    args.push('--db_name', db_name);
  }

  const process = spawn('python3', [scriptPath, ...args]);

  let stdout = '';
  let stderr = '';

  process.stdout.on('data', (data) => {
    stdout += data.toString();
  });

  process.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  process.on('close', (code) => {
    const jsonResponse = JSON.parse(stdout || '{}');
    jsonResponse.exit_code = code;
    res.status(200).json(jsonResponse);
  });
});

app.listen(3001, () => {
  console.log('Server started on port 3001');
});
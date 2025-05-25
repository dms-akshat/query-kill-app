const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001; // Backend server port

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies

// API endpoint to kill a query
app.post('/api/kill-query', (req, res) => {
  const { host, user, password, query } = req.body;

  if (!host || !user || !query) { // Password can be empty for some MySQL setups
    return res.status(400).json({ message: 'Host, user, and query are required.' });
  }

  // Path to the Python script - adjust if necessary
  // Assumes the script is in query-killer-app/scripts/kill_mysql_query.py
  const scriptPath = path.join(__dirname, '..', 'scripts', 'kill_mysql_query.py');
  
  // Arguments for the Python script
  // IMPORTANT: In a real app, manage passwords securely (e.g., env variables, vault)
  // and consider security implications of passing credentials like this.
  const scriptArgs = ['--host', host, user, password || '', query];

  console.log(`Executing Python script: ${scriptPath} with args: ${scriptArgs.map(arg => arg.includes(' ') ? `"${arg}"` : arg).join(' ')}`);

  const pythonProcess = spawn('python3', [scriptPath, ...scriptArgs]); // Use python3 or python

  let stdoutData = '';
  let stderrData = '';

  pythonProcess.stdout.on('data', (data) => {
    stdoutData += data.toString();
    console.log(`Python stdout: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    stderrData += data.toString();
    console.error(`Python stderr: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python script exited with code ${code}`);
    if (code === 0) {
      res.json({ message: stdoutData.trim() || 'Script executed successfully, but no specific message.' });
    } else {
      res.status(500).json({ message: stderrData.trim() || `Python script exited with error code ${code}` });
    }
  });

  pythonProcess.on('error', (error) => {
    console.error(`Failed to start Python script: ${error.message}`);
    res.status(500).json({ message: `Failed to start Python script: ${error.message}` });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});

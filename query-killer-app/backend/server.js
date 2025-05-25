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
  const { host, user, password, query, killed_by_user, db_name } = req.body;

  if (!host || !user || !query) { // Password can be empty
    return res.status(400).json({ status: "bad_request", message: 'Host, user, and query are required.' });
  }
  if (!killed_by_user) {
    return res.status(400).json({ status: "bad_request", message: 'killed_by_user is required.' });
  }

  const scriptPath = path.join(__dirname, '..', 'scripts', 'kill_mysql_query.py');
  
  const scriptArgs = [
    host, 
    user, 
    password || '', 
    query,
    '--killed_by_user', killed_by_user
  ];

  if (db_name) {
    scriptArgs.push('--db_name', db_name);
  }

  console.log(`Executing Python script: python3 ${scriptPath} ${scriptArgs.map(arg => arg.includes(' ') || arg.startsWith('--') ? `"${arg}"` : arg).join(' ')}`);

  const pythonProcess = spawn('python3', [scriptPath, ...scriptArgs]);

  let stdoutData = '';
  let stderrData = '';

  pythonProcess.stdout.on('data', (data) => {
    stdoutData += data.toString();
    // console.log(`Python stdout chunk: ${data}`); // Log chunks if needed for debugging
  });

  pythonProcess.stderr.on('data', (data) => {
    stderrData += data.toString();
    // console.error(`Python stderr chunk: ${data}`); // Log chunks if needed for debugging
  });

  pythonProcess.on('close', (code) => {
    // Log actual command and exit code for debugging
    console.log(`Python script execution command: python3 ${[scriptPath, ...scriptArgs].join(' ')}`);
    console.log(`Python script exited with code ${code}`);
    console.log(`Python script stdout: ${stdoutData}`);
    console.log(`Python script stderr: ${stderrData}`); // Keep this for raw stderr

    // 1. Log any specific stderr messages from Python (for server-side visibility of secondary errors like logging failures)
    // This is slightly redundant if stderrData is short and already logged above, but explicit if it were longer.
    if (stderrData.trim()) {
      console.error(`Python script reported (stderr): ${stderrData.trim()}`);
    }

    // 2. Determine response based on exit code and stdout
    // Check stdoutData first, as Python script sends JSON errors to stdout too
    if (stdoutData.trim()) {
      try {
        const parsedStdout = JSON.parse(stdoutData);
        // If Python script exited with an error code, but provided valid JSON,
        // respect the JSON but send an appropriate HTTP error status.
        // If Python script exited successfully (code 0), send 200.
        if (code === 0) {
          res.json(parsedStdout); // Covers success, and script-reported "not_found"
        } else {
          // Script exited with non-zero code, but gave JSON. Treat as server error, but use script's JSON detail.
          // e.g. Python's "connection_error" or "error" status.
          res.status(500).json(parsedStdout); 
        }
      } catch (parseError) {
        // stdoutData was not valid JSON. This is an unexpected script output scenario.
        console.error('Failed to parse Python stdout as JSON:', parseError);
        // If script exited with 0 but stdout wasn't JSON, it's a script issue.
        // If script exited with non-0, then stderr (or generic) is the best error source.
        const message = code === 0 ? 
            `Script succeeded but output was not valid JSON. Output: ${stdoutData.trim()}` :
            stderrData.trim() || `Python script exited with error code ${code}. stdout: ${stdoutData.trim()}`;
        res.status(500).json({ message });
      }
    } else { 
      // stdoutData is empty
      if (code === 0) {
        // Script exited successfully but provided no output on stdout.
        res.status(200).json({ message: 'Script executed successfully but returned no primary output.' });
      } else {
        // Script exited with an error and no stdout. Use stderr or a generic error.
        res.status(500).json({ message: stderrData.trim() || `Python script exited with error code ${code}` });
      }
    }
  });

  pythonProcess.on('error', (error) => {
    console.error(`Failed to start Python script: ${error.message}`);
    return res.status(500).json({ status: "process_error", message: `Failed to start Python script: ${error.message}` });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});

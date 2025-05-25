import React, { useState } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

// Mock host data - replace with actual data source if needed
const hosts = [
  { value: 'localhost', label: 'Localhost (MySQL)' },
  { value: '127.0.0.1', label: '127.0.0.1 (MySQL)' },
  // Add more hosts as needed
];

function QueryKillerForm() {
  const [host, setHost] = useState('');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [query, setQuery] = useState('');
  const [killedByUser, setKilledByUser] = useState(''); // New state for Killed By User
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // New state for message type
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(''); // Clear previous messages
    setMessageType(''); // Clear previous message type
    setLoading(true);

    if (!host) {
      // setError('Please select a host.'); // Old way
      setMessage('Please select a host.');
      setMessageType('error');
      setLoading(false);
      return;
    }
    if (!user.trim()) {
      // setError('Please enter a MySQL username.'); // Old way
      setMessage('Please enter a MySQL username.');
      setMessageType('error');
      setLoading(false);
      return;
    }
    if (!query.trim()) {
      // setError('Please enter a SQL query to find and kill.'); // Old way
      setMessage('Please enter a SQL query to find and kill.');
      setMessageType('error');
      setLoading(false);
      return;
    }
    if (!killedByUser.trim()) { // Validation for Killed By User
      // setError('Please enter the "Killed By User" value.'); // Old way
      setMessage('Please enter the "Killed By User" value.');
      setMessageType('error');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/kill-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          host, 
          user, 
          password, 
          query, 
          killed_by_user: killedByUser // Include killedByUser in the payload
        }),
      });

      const responseData = await response.json();

      // Initial setMessage and setMessageType done at the top of handleSubmit

      if (!response.ok) {
        // Handles HTTP errors (e.g., 500, 400 from server itself, or if server relays script's error status as HTTP error)
        // responseData might contain { status: "...", message: "..." } from the backend's error handling
        // setError(responseData.message || `HTTP error! status: ${response.status}`); // Old way
        setMessage(responseData.message || `HTTP error! status: ${response.status}`);
        setMessageType('error');
      } else {
        // HTTP response is OK (2xx), now check responseData.status from our script's JSON output
        if (responseData.status === 'success') {
          // setError(''); // Old way
          const successMsg = `Successfully killed query.\n` +
                            `PID: ${responseData.pid}\n` +
                            `User: ${responseData.user}\n` +
                            `Host: ${responseData.host}\n` +
                            `Database: ${responseData.db || 'N/A'}\n` +
                            `Killed Query: ${responseData.killed_query}\n` +
                            `Message: ${responseData.message}`;
          setMessage(successMsg);
          setMessageType('success');
        } else if (responseData.status === 'not_found') {
          // setError(''); // Old way
          setMessage(responseData.message); // This is an informational message
          setMessageType('info');
        } else if (responseData.status === 'connection_error' || 
                   responseData.status === 'error' || 
                   responseData.status === 'argument_error' ||
                   responseData.status === 'sqlite_error' || // Keep handling for this if backend might still send it
                   responseData.status === 'mysql_log_error') { // Or if backend puts logging error in main status
          // These are errors reported by the script/backend within a 2xx HTTP response's JSON
          // setMessage(''); // Old way
          let detailedErrorMsg = responseData.message || 'An operational error occurred.';
          if (responseData.status === 'sqlite_error' || responseData.status === 'mysql_log_error') {
            detailedErrorMsg = `Operation may have completed, but logging failed: ${responseData.message}`;
            if(responseData.pid) { 
                detailedErrorMsg += `\n(PID: ${responseData.pid}, Query: ${responseData.killed_query || 'N/A'})`;
            }
          }
          // setError(detailedErrorMsg); // Old way
          setMessage(detailedErrorMsg);
          setMessageType('error');
        } else {
          // Handles other statuses e.g. 'success_with_output_issue', 'success_no_output', or any unexpected status
          // setError(''); // Old way
          setMessage(responseData.message || 'Received an unexpected server response.'); // Default to informational
          setMessageType('info');
        }
      }
    } catch (err) {
      // This catches network errors or if `response.json()` fails, or if `throw new Error` was used for !response.ok
      // setMessage(''); // Old way
      // setError(err.message || 'Failed to process query. Make sure the backend server is running and accessible.'); // Old way
      setMessage(err.message || 'Failed to process query. Make sure the backend server is running and accessible.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="host-selector-label">Select Host*</InputLabel>
        <Select
          labelId="host-selector-label"
          id="host-selector"
          value={host}
          label="Select Host*"
          onChange={(e) => setHost(e.target.value)}
        >
          {hosts.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        margin="normal"
        required
        fullWidth
        id="user"
        label="MySQL Username"
        name="user"
        value={user}
        onChange={(e) => setUser(e.target.value)}
        sx={{ mb: 2 }}
      />

      <TextField
        margin="normal"
        fullWidth
        id="password"
        label="MySQL Password (optional)"
        name="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        sx={{ mb: 2 }}
      />

      <TextField
        margin="normal"
        required
        fullWidth
        id="query"
        label="SQL Query to Find & Kill"
        name="query"
        multiline
        rows={4}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ mb: 2 }}
      />

      {/* New TextField for Killed By User */}
      <TextField
        margin="normal"
        required
        fullWidth
        id="killedByUser"
        label="Killed By User (Your Name/ID)"
        name="killedByUser"
        value={killedByUser}
        onChange={(e) => setKilledByUser(e.target.value)}
        sx={{ mb: 2 }}
      />

      {message && messageType && ( // Ensure both message text and type are set
        <Typography 
          gutterBottom 
          sx={{ 
            whiteSpace: 'pre-wrap',
            color: messageType === 'success' ? 'green' :
                   messageType === 'info'    ? 'blue'  :
                   messageType === 'error'   ? 'red'   : // Default to red if type is 'error'
                   'inherit' // Fallback color, though messageType should always be one of the above
          }}
        >
          {message}
        </Typography>
      )}
      {/* The {error && ...} block was removed in a previous step (Turn 51) */}

      <Box sx={{ position: 'relative', mt: 3, mb: 2 }}>
        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={loading}
        >
          Find and Kill Query
        </Button>
        {loading && (
          <CircularProgress
            size={24}
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              marginTop: '-12px',
              marginLeft: '-12px',
            }}
          />
        )}
      </Box>
    </Box>
  );
}

export default QueryKillerForm;

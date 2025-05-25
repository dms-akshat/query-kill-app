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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(''); // Clear previous messages
    setError('');   // Clear previous errors
    setLoading(true);

    if (!host) {
      setError('Please select a host.');
      setLoading(false);
      return;
    }
    if (!user.trim()) {
      setError('Please enter a MySQL username.');
      setLoading(false);
      return;
    }
    if (!query.trim()) {
      setError('Please enter a SQL query to find and kill.');
      setLoading(false);
      return;
    }
    if (!killedByUser.trim()) { // Validation for Killed By User
      setError('Please enter the "Killed By User" value.');
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

      if (!response.ok) {
        // Prioritize message from responseData if available
        throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
      }

      // Handle detailed responses based on responseData.status
      if (responseData.status === 'success') {
        setMessage(
          `Successfully killed query.\n` +
          `PID: ${responseData.pid}\n` +
          `User: ${responseData.user}\n` +
          `Host: ${responseData.host}\n` +
          `Database: ${responseData.db || 'N/A'}\n` +
          `Killed Query: ${responseData.killed_query}\n` +
          `Message: ${responseData.message}`
        );
      } else if (responseData.status === 'not_found') {
        setMessage(responseData.message);
      } else if (responseData.status === 'success_with_output_issue' || responseData.status === 'success_no_output') {
        setMessage(responseData.message || 'Operation reported success but with output issues.');
      } else if (responseData.status === 'sqlite_error') {
        let errMessage = `Killed query, but failed to log: ${responseData.message}`;
        if(responseData.pid) { // If PID is available in the sqlite_error response
            errMessage += `\n(PID: ${responseData.pid}, Query: ${responseData.killed_query || 'N/A'})`;
        }
        setError(errMessage);
      } else if (responseData.message) { // Fallback for other successful responses with a message
        setMessage(responseData.message);
      } else { // Generic success if no specific status or message
        setMessage('Query processed successfully by the server.');
      }
      // Optionally clear query or other fields on success
      // setQuery('');
      // setKilledByUser('');
    } catch (err) {
      // err.message might already be set from `throw new Error` above for !response.ok
      setError(err.message || 'Failed to process query. Make sure the backend server is running and accessible.');
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

      {message && (
        <Typography 
          gutterBottom 
          sx={{ 
            whiteSpace: 'pre-wrap',
            color: message.startsWith("Successfully killed query.") 
                   || message.startsWith("Successfully sent KILL command for PID") // Keep old check for broader compatibility if needed
                   ? 'green' 
                   : 'blue'
            // Using theme colors like theme.palette.success.main or theme.palette.info.main would be more robust
            // but direct color names 'green' and 'blue' are used as per current instructions.
          }}
        >
          {message}
        </Typography>
      )}
      {error && (
        <Typography color="error" gutterBottom sx={{ whiteSpace: 'pre-wrap' }}>
          {error}
        </Typography>
      )}

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

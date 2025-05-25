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
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
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
    // Password can be empty, so no strict validation for it.
    if (!query.trim()) {
      setError('Please enter a SQL query to find and kill.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/kill-query', { // Assuming backend is on port 3001
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ host, user, password, query }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
      }

      setMessage(responseData.message || 'Query processed successfully.');
      // setQuery(''); // Optionally clear query field on success
    } catch (err) {
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

      {message && (
        <Typography color="primary" gutterBottom sx={{ whiteSpace: 'pre-wrap' }}>
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

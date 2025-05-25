import React from 'react';
import QueryKillerForm from './QueryKillerForm';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

function App() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          SQL Query Killer
        </Typography>
        <QueryKillerForm />
      </Box>
    </Container>
  );
}

export default App;

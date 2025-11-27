const express = require('express');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
const port = 3000; // You can change this port

app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from a 'public' directory if needed

app.get('/run-coverage', (req, res) => {
  try {
    // Run Vitest with coverage and HTML reporter
    execSync('vitest run --coverage --reporter=html', { stdio: 'inherit' });
    res.send('Coverage report generated. Access it at /coverage');
  } catch (error) {
    console.error('Error generating coverage report:', error);
    res.status(500).send('Error generating coverage report');
  }
});

app.get('/coverage', (req, res) => {
  // Serve the generated HTML coverage report
  res.sendFile(path.join(__dirname, 'test', 'artifacts', 'coverage-vitest', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

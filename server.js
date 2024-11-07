'use strict';

const express = require('express');

// Constants
const PORT = 3000;
const HOST = '0.0.0.0';

// App
const app = express();
app.get('/', (req, res) => {
  res.send('Node.JS Application deployment in EKS using Helm Terraform');
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const passport = require('./auth');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const { OpenAI } = require('openai');
const Item = require('./models/item');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For form submissions
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/aws-server', {});

const db = mongoose.connection;
db.once('open', () => {
  console.log('Connected to MongoDB');
});

db.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// OAuth Routes for GitHub
app.get('/auth/github', passport.authenticate('github'));

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/' }),
  function(req, res) {
    // Successful authentication, redirect to home or dashboard
    res.redirect('/dashboard');
  }
);

// Logout Route
app.get('/logout', (req, res) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

// Simple Dashboard Route
app.get('/dashboard', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).send('You are not logged in');
  }
  
  try {
    const items = await Item.find({ userId: req.user._id });
    res.send(`
      <h1>Hello ${req.user.username}, welcome to your dashboard!</h1>
      <table border="1">
        <tr>
          <th>ID</th>
          <th>Description</th>
          <th>Cost</th>
          <th>Date</th>
          <th>URL</th>
        </tr>
        ${items.map(item => `
          <tr>
            <td>${item.id}</td>
            <td>${item.description}</td>
            <td>${item.cost}</td>
            <td>${item.date.toISOString().split('T')[0]}</td>
            <td><a href="${item.url}" target="_blank">Link</a></td>
          </tr>
        `).join('')}
      </table>
      <a href="/submit-url">Submit URL</a>
      <a href="/logout">Logout</a>
    `);
  } catch (error) {
    res.status(500).send('Error retrieving items');
  }
});

// Route to serve the HTML form
app.get('/submit-url', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).send('You are not logged in');
  }

  res.send(`
    <h1>Submit a URL</h1>
    <form action="/add-url" method="POST">
      <label for="url">URL:</label>
      <input type="text" id="url" name="url" required>
      <button type="submit">Submit</button>
    </form>
    <a href="/dashboard">Back to Dashboard</a>
  `);
});

// Route to serve the HTML form for description submission
app.get('/submit-description', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).send('You are not logged in');
  }

  res.send(`
    <h1>Submit an Item Description</h1>
    <form action="/add-description" method="POST">
      <label for="description">Description:</label>
      <input type="text" id="description" name="description" required>
      <button type="submit">Submit</button>
    </form>
    <a href="/dashboard">Back to Dashboard</a>
  `);
});

// Route to add an item by extracting info from URL
app.post('/add-url', async (req, res, next) => {
  if (!req.isAuthenticated()) return res.status(401).send('Unauthorized');
  next();
}, async (req, res) => {
  try {
    const { url } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }

    if (!apiKey) {
      console.error('OpenAI API key is not set');
      return res.status(500).json({ message: 'OpenAI API key is not set' });
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    const response = await openai.completions.create({
      model: "gpt-3.5-turbo-instruct",
      prompt: `Extract the price, product description, and other relevant details from the following URL. There may be more than one product listed in the url, make sure you choose the most relevant one: ${url}. The format should be as follows (example): Description: Amazon Item\nCost: 3.00. There should be no dollar sign in front of the cost.`,
      max_tokens: 100,
      temperature: 0.5,
    });

    const openaiData = response.choices[0].text.trim();
    const [descriptionLine, costLine] = openaiData.split('\n');
    const description = descriptionLine ? descriptionLine.split(': ')[1] : 'No description available';
    const cost = costLine ? parseFloat(costLine.split(': ')[1]) : 0;

    const newItem = new Item({
      id: uuidv4(), // Generate a random UUID for the item ID
      description,
      cost,
      date: new Date(), // Current date
      url,
      userId: req.user._id // Associate with the logged-in user
    });

    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error adding item:', error);
    if (!res.headersSent) {
      res.status(400).json({ message: 'Error adding item', error: error.message });
    }
  }
});

// Route to add an item directly with parameters
app.post('/add-item', async (req, res, next) => {
  if (!req.isAuthenticated()) return res.status(401).send('Unauthorized');
  next();
}, async (req, res) => {
  try {
    const { description, cost, url } = req.body;

    if (!description || !cost || !url) {
      return res.status(400).json({ message: 'Description, cost, and URL are required' });
    }

    const newItem = new Item({
      id: uuidv4(), // Generate a random UUID for the item ID
      description,
      cost: parseFloat(cost),
      date: new Date(), // Current date
      url,
      userId: req.user._id // Associate with the logged-in user
    });

    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error adding item:', error);
    if (!res.headersSent) {
      res.status(400).json({ message: 'Error adding item', error: error.message });
    }
  }
});

// Route to add an item based on its description only
app.post('/add-description', async (req, res, next) => {
  if (!req.isAuthenticated()) return res.status(401).send('Unauthorized');
  next();
}, async (req, res) => {
  try {
    const { description } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!description) {
      return res.status(400).json({ message: 'Description is required' });
    }

    if (!apiKey) {
      console.error('OpenAI API key is not set');
      return res.status(500).json({ message: 'OpenAI API key is not set' });
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    const response = await openai.completions.create({
      model: "gpt-3.5-turbo-instruct",
      prompt: `Find a reputable vendor URL and accurate price by checking multiple sources for the following item description: ${description}. The format should be as follows (example): URL: http://example.com\nCost: 3.00. There should be no dollar sign in front of the cost.`,
      max_tokens: 100,
      temperature: 0.5,
    });

    const openaiData = response.choices[0].text.trim();
    const [urlLine, costLine] = openaiData.split('\n');
    const url = urlLine ? urlLine.split(': ')[1] : 'No URL available';
    const cost = costLine ? parseFloat(costLine.split(': ')[1]) : 0;

    const newItem = new Item({
      id: uuidv4(), // Generate a random UUID for the item ID
      description,
      cost,
      date: new Date(), // Current date
      url,
      userId: req.user._id // Associate with the logged-in user
    });
    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error adding item:', error);
    if (!res.headersSent) {
    res.status(400).json({ message: 'Error adding item:', error: error.message });
    }
    }
    });

// Home Route
app.get('/', (req, res) => {
  res.send('<h1>Welcome to My Node App</h1><a href="/auth/github">Login with GitHub</a>');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
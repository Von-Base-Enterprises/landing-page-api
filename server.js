const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// In-memory storage for pages (use database in production)
const pages = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes

// Create a new landing page
app.post('/api/pages', async (req, res) => {
  try {
    const {
      title = 'Welcome',
      subtitle = 'Your amazing landing page',
      description = 'This is a dynamically generated landing page',
      ctaText = 'Get Started',
      ctaUrl = '#',
      backgroundColor = '#ffffff',
      textColor = '#333333',
      accentColor = '#007bff',
      heroImage = null,
      template = 'default'
    } = req.body;

    const pageId = uuidv4();
    const pageData = {
      id: pageId,
      title,
      subtitle,
      description,
      ctaText,
      ctaUrl,
      backgroundColor,
      textColor,
      accentColor,
      heroImage,
      template,
      createdAt: new Date().toISOString(),
      views: 0
    };

    // Store page data
    pages.set(pageId, pageData);

    res.status(201).json({
      success: true,
      page: pageData,
      url: `${req.protocol}://${req.get('host')}/${pageId}`
    });

  } catch (error) {
    console.error('Error creating page:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create landing page'
    });
  }
});

// Get page info
app.get('/api/pages/:pageId', (req, res) => {
  const { pageId } = req.params;
  const page = pages.get(pageId);

  if (!page) {
    return res.status(404).json({
      success: false,
      error: 'Page not found'
    });
  }

  res.json({
    success: true,
    page
  });
});


// List all pages
app.get('/api/pages', (req, res) => {
  const pageList = Array.from(pages.values()).map(page => ({
    id: page.id,
    title: page.title,
    createdAt: page.createdAt,
    views: page.views
  }));

  res.json({
    success: true,
    pages: pageList,
    total: pageList.length
  });
});

// Serve landing pages
app.get('/:pageId', (req, res) => {
  const { pageId } = req.params;
  const page = pages.get(pageId);

  if (!page) {
    return res.status(404).render('404', {
      title: 'Page Not Found'
    });
  }

  // Increment view count
  page.views = (page.views || 0) + 1;
  pages.set(pageId, page);

  // Render the appropriate template
  const templateName = page.template === 'minimal' ? 'minimal' : 'default';
  
  res.render(templateName, {
    page,
    pageUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`
  });
});


// Default route
app.get('/', (req, res) => {
  res.json({
    message: 'Landing Page API',
    endpoints: {
      'POST /api/pages': 'Create a new landing page',
      'GET /api/pages': 'List all pages',
      'GET /api/pages/:pageId': 'Get page info',
      'GET /:pageId': 'View landing page'
    },
    docs: 'See README.md for detailed usage'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Landing Page API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
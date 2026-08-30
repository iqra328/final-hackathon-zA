const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Extract token (Bearer token)
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. Invalid token format.' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');
    req.user = decoded;
    
    // ✅ Call next() to proceed
    next();
  } catch (error) {
    console.error('Auth error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    
    res.status(500).json({ error: 'Authentication error.' });
  }
};
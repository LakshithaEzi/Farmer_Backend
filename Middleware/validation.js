// Sanitize user input to prevent XSS attacks
exports.sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove potential script tags and dangerous characters
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
          .trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

// Validate post creation
exports.validatePost = (req, res, next) => {
  const { title, content } = req.body;
  const errors = [];

  if (!title || title.trim().length < 5) {
    errors.push('Title must be at least 5 characters long');
  }

  if (title && title.length > 200) {
    errors.push('Title cannot exceed 200 characters');
  }

  if (!content || content.trim().length < 10) {
    errors.push('Content must be at least 10 characters long');
  }

  if (content && content.length > 5000) {
    errors.push('Content cannot exceed 5000 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Validate comment creation
exports.validateComment = (req, res, next) => {
  const { content } = req.body;
  const errors = [];

  if (!content || content.trim().length < 1) {
    errors.push('Comment content is required');
  }

  if (content && content.length > 1000) {
    errors.push('Comment cannot exceed 1000 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};
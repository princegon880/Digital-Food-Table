const { verifyToken } = require('@clerk/backend');

const clerkSecretKey = process.env.CLERK_SECRET_KEY;

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];

    // Local mock token check for offline testing
    if (token.startsWith('mock-token-')) {
      const mockUserId = token.replace('mock-token-', '');
      req.user = {
        id: mockUserId,
        email: `${mockUserId}@example.com`
      };
      return next();
    }

    if (!clerkSecretKey) {
      console.error('CLERK_SECRET_KEY is not set in environment variables. Cannot verify Clerk tokens.');
      return res.status(500).json({ error: 'Clerk is not configured on the server. Set CLERK_SECRET_KEY.' });
    }

    // Verify Clerk JWT using the standalone verifyToken function
    const verifiedPayload = await verifyToken(token, {
      secretKey: clerkSecretKey,
    });

    req.user = {
      id: verifiedPayload.sub
    };

    next();
  } catch (error) {
    console.error('Clerk Auth middleware error:', error.message || error);
    res.status(401).json({ error: 'Unauthorized, invalid or expired token' });
  }
};

module.exports = requireAuth;

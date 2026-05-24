const { createClerkClient } = require('@clerk/backend');

const clerkSecretKey = process.env.CLERK_SECRET_KEY;
let clerkClient = null;

if (clerkSecretKey) {
  clerkClient = createClerkClient({ secretKey: clerkSecretKey });
}

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

    if (!clerkClient) {
      return res.status(500).json({ error: 'Clerk is not configured on the server' });
    }

    // Verify Clerk Token cryptographically
    const verifiedToken = await clerkClient.tokens.verifyToken(token);

    req.user = {
      id: verifiedToken.sub
    };

    next();
  } catch (error) {
    console.error('Clerk Auth middleware error:', error);
    res.status(401).json({ error: 'Unauthorized, invalid or expired token' });
  }
};

module.exports = requireAuth;

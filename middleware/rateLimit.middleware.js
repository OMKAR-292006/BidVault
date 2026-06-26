// ══════════════════════════════════════════════
//  middleware/rateLimit.middleware.js
//  Lightweight, in-memory rate-limiter middleware.
//  Protects endpoints without adding external packages.
// ══════════════════════════════════════════════

const rateLimiter = (limit, windowMs) => {
    // Key: Client IP, Value: Array of request timestamps
    const requests = {};

    // Periodically clean up expired records to avoid memory leaks
    setInterval(() => {
        const now = Date.now();
        for (const ip in requests) {
            requests[ip] = requests[ip].filter(timestamp => now - timestamp < windowMs);
            if (requests[ip].length === 0) {
                delete requests[ip];
            }
        }
    }, windowMs * 2);

    return (req, res, next) => {
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const now = Date.now();

        if (!requests[ip]) {
            requests[ip] = [];
        }

        // Filter out timestamps older than windowMs
        requests[ip] = requests[ip].filter(timestamp => now - timestamp < windowMs);

        if (requests[ip].length >= limit) {
            return res.status(429).json({
                error: 'Too many requests. Please try again later.'
            });
        }

        requests[ip].push(now);
        next();
    };
};

module.exports = rateLimiter;

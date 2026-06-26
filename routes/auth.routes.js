const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { validateRegister, validateLogin } = require('../middleware/validate.middleware');
const rateLimiter = require('../middleware/rateLimit.middleware');

// Rate limits: Register (3 per 5 mins), Login (5 per 1 min)
const registerLimiter = rateLimiter(3, 5 * 60 * 1000);
const loginLimiter = rateLimiter(5, 1 * 60 * 1000);

router.post('/register', registerLimiter, validateRegister, register);
router.post('/login', loginLimiter, validateLogin, login);
router.get('/me', verifyToken, getMe);

module.exports = router;

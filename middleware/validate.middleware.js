// ══════════════════════════════════════════════
//  middleware/validate.middleware.js
//  Server-side input validation for all routes
// ══════════════════════════════════════════════

// ── Helper: collect errors ────────────────────
function validate(rules) {
    return (req, res, next) => {
        const errors = [];
        const body = req.body;

        for (const [field, checks] of Object.entries(rules)) {
            const value = body[field];

            if (checks.required && (value === undefined || value === null || value === '')) {
                errors.push(`${field} is required.`);
                continue;  // no point checking other rules if missing
            }

            if (value !== undefined && value !== '') {

                if (checks.minLength && String(value).length < checks.minLength) {
                    errors.push(`${field} must be at least ${checks.minLength} characters.`);
                }

                if (checks.maxLength && String(value).length > checks.maxLength) {
                    errors.push(`${field} must be at most ${checks.maxLength} characters.`);
                }

                if (checks.isEmail) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) {
                        errors.push(`${field} must be a valid email address.`);
                    }
                }

                if (checks.isNumber && isNaN(Number(value))) {
                    errors.push(`${field} must be a number.`);
                }

                if (checks.min !== undefined && Number(value) < checks.min) {
                    errors.push(`${field} must be at least ${checks.min}.`);
                }

                if (checks.max !== undefined && Number(value) > checks.max) {
                    errors.push(`${field} must be at most ${checks.max}.`);
                }

                if (checks.isDate) {
                    const d = new Date(value);
                    if (isNaN(d.getTime())) {
                        errors.push(`${field} must be a valid date.`);
                    }
                }

                if (checks.enum && !checks.enum.includes(value)) {
                    errors.push(`${field} must be one of: ${checks.enum.join(', ')}.`);
                }

                if (checks.noSpaces && /\s/.test(value)) {
                    errors.push(`${field} must not contain spaces.`);
                }

                if (checks.alphanumeric && !/^[a-zA-Z0-9_]+$/.test(value)) {
                    errors.push(`${field} must only contain letters, numbers, and underscores.`);
                }
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({ error: errors[0], errors });
        }

        next();
    };
}


// ── Validation rules for each route ───────────

const validateRegister = validate({
    username: { required: true, minLength: 3, maxLength: 50, alphanumeric: true, noSpaces: true },
    email: { required: true, isEmail: true },
    password: { required: true, minLength: 6, maxLength: 100 },
    role: { enum: ['buyer', 'seller', 'admin'] }
});

const validateLogin = validate({
    email: { required: true, isEmail: true },
    password: { required: true }
});

const validateAuction = validate({
    title: { required: true, minLength: 3, maxLength: 200 },
    category_id: { required: true, isNumber: true, min: 1 },
    starting_price: { required: true, isNumber: true, min: 1 },
    start_time: { required: true, isDate: true },
    end_time: { required: true, isDate: true }
});

const validateBid = validate({
    auction_id: { required: true, isNumber: true, min: 1 },
    amount: { required: true, isNumber: true, min: 0.01 }
});

const validateProfile = validate({
    full_name: { maxLength: 100 },
    phone: { maxLength: 20 },
    password: { minLength: 6 }
});


module.exports = {
    validateRegister,
    validateLogin,
    validateAuction,
    validateBid,
    validateProfile
};

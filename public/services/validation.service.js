// ══════════════════════════════════════════════
//  ValidationService — client-side form checks
//  Catches errors before sending to the server
// ══════════════════════════════════════════════

angular.module('auctionApp')
    .service('ValidationService', [function () {

        // ── Helpers ───────────────────────────────
        const isEmpty = v => !v || String(v).trim() === '';
        const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        const isNum = v => !isNaN(Number(v)) && Number(v) > 0;

        // ── Register form ─────────────────────────
        this.register = function (data) {
            if (isEmpty(data.username)) return 'Username is required.';
            if (data.username.length < 3) return 'Username must be at least 3 characters.';
            if (!/^[a-zA-Z0-9_]+$/.test(data.username)) return 'Username can only contain letters, numbers, and underscores.';
            if (isEmpty(data.email)) return 'Email is required.';
            if (!isEmail(data.email)) return 'Please enter a valid email address.';
            if (isEmpty(data.password)) return 'Password is required.';
            if (data.password.length < 6) return 'Password must be at least 6 characters.';
            if (data.password !== data.confirmPassword) return 'Passwords do not match.';
            return null;  // null = no error
        };

        // ── Login form ────────────────────────────
        this.login = function (data) {
            if (isEmpty(data.email)) return 'Email is required.';
            if (!isEmail(data.email)) return 'Please enter a valid email address.';
            if (isEmpty(data.password)) return 'Password is required.';
            return null;
        };

        // ── Create auction form ───────────────────
        this.createAuction = function (data) {
            if (isEmpty(data.title)) return 'Auction title is required.';
            if (data.title.length < 3) return 'Title must be at least 3 characters.';
            if (isEmpty(data.category_id)) return 'Please select a category.';
            if (isEmpty(data.starting_price)) return 'Starting price is required.';
            if (!isNum(data.starting_price)) return 'Starting price must be a positive number.';
            if (isEmpty(data.start_time)) return 'Start time is required.';
            if (isEmpty(data.end_time)) return 'End time is required.';

            const start = new Date(data.start_time);
            const end = new Date(data.end_time);

            if (isNaN(start.getTime())) return 'Start time is not a valid date.';
            if (isNaN(end.getTime())) return 'End time is not a valid date.';
            if (end <= start) return 'End time must be after start time.';
            if (end <= new Date()) return 'End time must be in the future.';

            if (data.reserve_price && !isNum(data.reserve_price))
                return 'Reserve price must be a positive number.';

            if (data.buy_now_price && !isNum(data.buy_now_price))
                return 'Buy Now price must be a positive number.';

            if (data.buy_now_price && Number(data.buy_now_price) <= Number(data.starting_price))
                return 'Buy Now price must be higher than starting price.';

            return null;
        };

        // ── Place bid ─────────────────────────────
        this.placeBid = function (amount, currentPrice) {
            if (isEmpty(amount)) return 'Please enter a bid amount.';
            if (!isNum(amount)) return 'Bid amount must be a positive number.';
            if (Number(amount) <= Number(currentPrice))
                return `Your bid must be higher than the current price of ₹${currentPrice}.`;
            return null;
        };

        // ── Profile update ────────────────────────
        this.updateProfile = function (data) {
            if (data.phone && !/^[\d\s\+\-\(\)]{7,20}$/.test(data.phone))
                return 'Phone number is not valid.';
            if (data.password && data.password.length < 6)
                return 'New password must be at least 6 characters.';
            return null;
        };

    }]);

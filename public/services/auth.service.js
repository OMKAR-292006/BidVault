// ══════════════════════════════════════════════
//  AuthService — manages token & user session
// ══════════════════════════════════════════════

angular.module('auctionApp')

    .service('AuthService', ['$http', function ($http) {

        const API = '/api/auth';

        // ── Token helpers ──────────────────────────
        this.saveToken = function (token) {
            localStorage.setItem('auction_token', token);
        };

        this.getToken = function () {
            return localStorage.getItem('auction_token');
        };

        this.removeToken = function () {
            localStorage.removeItem('auction_token');
            localStorage.removeItem('auction_user');
        };

        // ── User helpers ───────────────────────────
        this.saveUser = function (user) {
            localStorage.setItem('auction_user', JSON.stringify(user));
        };

        this.getUser = function () {
            const u = localStorage.getItem('auction_user');
            return u ? JSON.parse(u) : null;
        };

        this.isLoggedIn = () => {
            return !!localStorage.getItem('auction_token');
        };

        // ── Auth header for HTTP requests ──────────
        this.authHeader = () => {
            return { Authorization: 'Bearer ' + localStorage.getItem('auction_token') };
        };

        // ── API calls ──────────────────────────────
        this.register = function (data) {
            return $http.post(API + '/register', data);
        };

        this.login = function (data) {
            return $http.post(API + '/login', data);
        };

        this.getMe = function () {
            return $http.get(API + '/me', { headers: this.authHeader() });
        };

    }]);

// ══════════════════════════════════════════════
//  AuctionService — all auction & bid API calls
// ══════════════════════════════════════════════

angular.module('auctionApp')

    .service('AuctionService', ['$http', 'AuthService', function ($http, AuthService) {

        const API = '/api';

        const headers = () => ({ headers: AuthService.authHeader() });

        // ── Auctions ───────────────────────────────
        this.getAll = function (params) {
            return $http.get(API + '/auctions', { params: params });
        };

        this.getById = function (id) {
            return $http.get(API + '/auctions/' + id);
        };

        this.getBids = function (auctionId) {
            return $http.get(API + '/auctions/' + auctionId + '/bids');
        };

        this.create = function (data) {
            if (data.imageFile) {
                const fd = new FormData();
                for (let key in data) {
                    if (key !== 'imageFile') fd.append(key, data[key]);
                }
                fd.append('image', data.imageFile);
                return $http.post(API + '/auctions', fd, {
                    transformRequest: angular.identity,
                    headers: Object.assign({}, AuthService.authHeader(), { 'Content-Type': undefined })
                });
            }
            return $http.post(API + '/auctions', data, headers());
        };

        this.update = function (id, data) {
            return $http.put(API + '/auctions/' + id, data, headers());
        };

        this.delete = function (id) {
            return $http.delete(API + '/auctions/' + id, headers());
        };

        // ── Bids ───────────────────────────────────
        this.placeBid = function (data) {
            return $http.post(API + '/bids', data, headers());
        };

        this.getMyBids = function () {
            return $http.get(API + '/bids/mine', headers());
        };

        // ── Users ──────────────────────────────────
        this.getProfile = function () {
            return $http.get(API + '/users/profile', headers());
        };

        this.updateProfile = function (data) {
            return $http.put(API + '/users/profile', data, headers());
        };

        this.getMyAuctions = function () {
            return $http.get(API + '/users/my-auctions', headers());
        };

        // ── Categories ─────────────────────────────
        this.getCategories = function () {
            return $http.get(API + '/auctions?grouped=true');
        };

    }]);

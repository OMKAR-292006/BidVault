// ══════════════════════════════════════════════
//  WatchlistService — watchlist API calls
// ══════════════════════════════════════════════
angular.module('auctionApp')
    .service('WatchlistService', ['$http', 'AuthService', function ($http, AuthService) {

        const API = '/api/watchlist';
        const headers = () => ({ headers: AuthService.authHeader() });

        this.getAll = function () {
            return $http.get(API, headers());
        };

        this.add = function (auction_id) {
            return $http.post(API, { auction_id }, headers());
        };

        this.remove = function (auction_id) {
            return $http.delete(API + '/' + auction_id, headers());
        };

        this.check = function (auction_id) {
            return $http.get(API + '/check/' + auction_id, headers());
        };

    }]);

// ══════════════════════════════════════════════
//  NotificationService — notification API calls
// ══════════════════════════════════════════════
angular.module('auctionApp')
    .service('NotificationService', ['$http', 'AuthService', function ($http, AuthService) {

        const API = '/api/notifications';
        const headers = () => ({ headers: AuthService.authHeader() });

        this.getAll = function () {
            return $http.get(API, headers());
        };

        this.markRead = function (id) {
            return $http.put(API + '/' + id + '/read', {}, headers());
        };

        this.markAllRead = function () {
            return $http.put(API + '/read-all', {}, headers());
        };

    }]);

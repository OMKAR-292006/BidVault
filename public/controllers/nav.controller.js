// ══════════════════════════════════════════════
//  NavController — navbar + notification bell
// ══════════════════════════════════════════════
angular.module('auctionApp')
    .controller('NavController', ['$scope', '$location', '$interval', 'AuthService', 'NotificationService', 'SocketService',
        function ($scope, $location, $interval, AuthService, NotificationService, SocketService) {

            $scope.menuOpen = false;
            $scope.notifOpen = false;
            $scope.notifications = [];
            $scope.unreadCount = 0;

            // ── Theme ─────────────────────────────────
            $scope.isLightMode = localStorage.getItem('theme') !== 'dark';
            if ($scope.isLightMode) {
                document.body.classList.add('light-theme');
            }

            $scope.toggleTheme = function() {
                $scope.isLightMode = !$scope.isLightMode;
                if ($scope.isLightMode) {
                    document.body.classList.add('light-theme');
                    localStorage.setItem('theme', 'light');
                } else {
                    document.body.classList.remove('light-theme');
                    localStorage.setItem('theme', 'dark');
                }
            };

            // ── Auth Helpers ─────────────────────────
            $scope.isLoggedIn = function () { return AuthService.isLoggedIn(); };
            $scope.currentUser = function () { return AuthService.getUser() || {}; };

            $scope.toggleMenu = function () {
                $scope.menuOpen = !$scope.menuOpen;
                if ($scope.menuOpen) $scope.notifOpen = false;
            };
            $scope.closeMenu = function () { $scope.menuOpen = false; };

            $scope.logout = function () {
                AuthService.removeToken();
                $scope.menuOpen = false;
                $scope.notifications = [];
                $scope.unreadCount = 0;
                $location.path('/');
            };

            // ── Notifications ─────────────────────────
            function loadNotifications() {
                if (!AuthService.isLoggedIn()) return;
                NotificationService.getAll().then(function (res) {
                    $scope.notifications = res.data.notifications || [];
                    $scope.unreadCount = $scope.notifications.filter(function (n) { return !n.is_read; }).length;
                }).catch(angular.noop);
            }

            $scope.toggleNotif = function () {
                $scope.notifOpen = !$scope.notifOpen;
                if ($scope.menuOpen) $scope.menuOpen = false;
            };

            $scope.closeNotif = function () { $scope.notifOpen = false; };

            $scope.markRead = function (notif) {
                if (notif.is_read) return;
                NotificationService.markRead(notif.id).then(function () {
                    notif.is_read = true;
                    $scope.unreadCount = Math.max(0, $scope.unreadCount - 1);
                });
            };

            $scope.markAllRead = function () {
                NotificationService.markAllRead().then(function () {
                    $scope.notifications.forEach(function (n) { n.is_read = true; });
                    $scope.unreadCount = 0;
                });
            };

            $scope.notifIcon = function (type) {
                const icons = {
                    outbid: '🔥',
                    auction_won: '🏆',
                    auction_ended: '🔒',
                    new_bid: '💰',
                    auction_starting: '🚀'
                };
                return icons[type] || '🔔';
            };

            // Load initially
            loadNotifications();

            // Poll every 30 seconds for new notifications
            var pollInterval = $interval(function () {
                if (AuthService.isLoggedIn()) loadNotifications();
            }, 30000);

            // Listen for real-time outbid events via socket to instantly refresh
            SocketService.on('outbid', function (data) {
                var user = AuthService.getUser();
                if (user && data.outbid_user === user.username) {
                    loadNotifications();
                }
            });

            // Destroy polling interval when scope is destroyed
            $scope.$on('$destroy', function () {
                $interval.cancel(pollInterval);
            });

        }]);

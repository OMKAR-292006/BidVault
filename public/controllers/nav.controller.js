angular.module('auctionApp')
    .controller('NavController', ['$scope', '$location', 'AuthService',
        function ($scope, $location, AuthService) {

            $scope.menuOpen = false;
            
            $scope.isLightMode = localStorage.getItem('theme') === 'light';
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

            $scope.isLoggedIn = function () {
                return AuthService.isLoggedIn();
            };

            $scope.currentUser = function () {
                return AuthService.getUser() || {};
            };

            $scope.toggleMenu = function () {
                $scope.menuOpen = !$scope.menuOpen;
            };

            $scope.logout = function () {
                AuthService.removeToken();
                $scope.menuOpen = false;
                $location.path('/');
            };

        }]);

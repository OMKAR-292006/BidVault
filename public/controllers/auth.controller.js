angular.module('auctionApp')
    .controller('AuthController', ['$scope', '$location', 'AuthService', 'ValidationService',
        function ($scope, $location, AuthService, ValidationService) {

            $scope.formData = {};
            $scope.error = '';
            $scope.loading = false;

            // ── REGISTER ──────────────────────────────
            $scope.register = function () {
                // Client-side validation first (faster feedback)
                const err = ValidationService.register($scope.formData);
                if (err) { $scope.error = err; return; }

                $scope.error = '';
                $scope.loading = true;

                AuthService.register($scope.formData)
                    .then(function (res) {
                        AuthService.saveToken(res.data.token);
                        AuthService.saveUser(res.data.user);
                        $location.path('/auctions');
                    })
                    .catch(function (err) {
                        $scope.error = err.data ? err.data.error : 'Registration failed.';
                        $scope.loading = false;
                    });
            };

            // ── LOGIN ─────────────────────────────────
            $scope.login = function () {
                const err = ValidationService.login($scope.formData);
                if (err) { $scope.error = err; return; }

                $scope.error = '';
                $scope.loading = true;

                AuthService.login($scope.formData)
                    .then(function (res) {
                        AuthService.saveToken(res.data.token);
                        AuthService.saveUser(res.data.user);
                        $location.path('/auctions');
                    })
                    .catch(function (err) {
                        $scope.error = err.data ? err.data.error : 'Login failed.';
                        $scope.loading = false;
                    });
            };

        }]);

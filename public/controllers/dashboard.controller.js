// ══════════════════════════════════════════════
//  DashboardController — /dashboard
// ══════════════════════════════════════════════
angular.module('auctionApp')
    .controller('DashboardController', ['$scope', 'AuctionService', 'AuthService',
        function ($scope, AuctionService, AuthService) {

            $scope.user = AuthService.getUser();
            $scope.myAuctions = [];
            $scope.myBids = [];
            $scope.activeTab = 'auctions';
            $scope.loading = true;

            // Load both in parallel
            AuctionService.getMyAuctions()
                .then(function (res) { $scope.myAuctions = res.data.auctions; });

            AuctionService.getMyBids()
                .then(function (res) {
                    $scope.myBids = res.data.bids;
                    $scope.loading = false;
                });

            $scope.setTab = function (tab) { $scope.activeTab = tab; };

            $scope.timeLeft = function (endTime) {
                const diff = new Date(endTime) - new Date();
                if (diff <= 0) return 'Ended';
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                return h + 'h ' + m + 'm left';
            };

            $scope.deleteAuction = function (id) {
                if (!confirm('Delete this auction?')) return;
                AuctionService.delete(id)
                    .then(function () {
                        $scope.myAuctions = $scope.myAuctions.filter(a => a.id !== id);
                    })
                    .catch(function (err) { alert(err.data.error); });
            };

        }]);


// ══════════════════════════════════════════════
//  ProfileController — /profile
// ══════════════════════════════════════════════
angular.module('auctionApp')
    .controller('ProfileController', ['$scope', 'AuctionService',
        function ($scope, AuctionService) {

            $scope.formData = {};
            $scope.success = '';
            $scope.error = '';
            $scope.loading = false;

            // Load current profile
            AuctionService.getProfile()
                .then(function (res) {
                    const u = res.data.user;
                    $scope.formData = {
                        full_name: u.full_name,
                        phone: u.phone,
                        address: u.address
                    };
                });

            $scope.save = function () {
                $scope.success = '';
                $scope.error = '';
                $scope.loading = true;

                AuctionService.updateProfile($scope.formData)
                    .then(function (res) {
                        $scope.success = 'Profile updated successfully!';
                        $scope.loading = false;
                    })
                    .catch(function (err) {
                        $scope.error = err.data.error || 'Update failed.';
                        $scope.loading = false;
                    });
            };

        }]);


// ══════════════════════════════════════════════
//  BidController (unused directly — bids handled
//  inside AuctionDetailController above)
// ══════════════════════════════════════════════
angular.module('auctionApp')
    .controller('BidController', ['$scope', function ($scope) {
        // placeholder
    }]);

angular.module('auctionApp')
    .controller('HomeController', ['$scope', 'AuctionService',
        function ($scope, AuctionService) {

            $scope.featuredAuctions = [];
            $scope.loading = true;

            // Load active auctions for homepage
            AuctionService.getAll({ status: 'active' })
                .then(function (res) {
                    // Show only first 6 on homepage
                    $scope.featuredAuctions = res.data.auctions.slice(0, 6);
                    $scope.loading = false;
                })
                .catch(function (err) {
                    console.error(err);
                    $scope.loading = false;
                });

            // Countdown timer helper — returns time left string
            $scope.timeLeft = function (endTime) {
                const diff = new Date(endTime) - new Date();
                if (diff <= 0) return 'Ended';
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                if (h > 24) return Math.floor(h / 24) + 'd ' + (h % 24) + 'h left';
                return h + 'h ' + m + 'm ' + s + 's';
            };

        }]);

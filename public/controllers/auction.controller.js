// ══════════════════════════════════════════════
//  AuctionListController — /auctions
// ══════════════════════════════════════════════
angular.module('auctionApp')
    .controller('AuctionListController', ['$scope', '$location', 'AuctionService',
        function ($scope, $location, AuctionService) {

            $scope.auctions = [];
            $scope.loading = true;
            $scope.error = '';
            $scope.filters = { status: $location.search().status || 'active', search: '' };

            $scope.load = function () {
                $scope.loading = true;
                AuctionService.getAll($scope.filters)
                    .then(function (res) {
                        $scope.auctions = res.data.auctions;
                        $scope.loading = false;
                    })
                    .catch(function (err) {
                        $scope.error = 'Failed to load auctions.';
                        $scope.loading = false;
                    });
            };

            $scope.load();

            $scope.timeLeft = function (endTime) {
                const diff = new Date(endTime) - new Date();
                if (diff <= 0) return 'Ended';
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                if (h > 24) return Math.floor(h / 24) + 'd left';
                return h + 'h ' + m + 'm left';
            };

        }]);


// ══════════════════════════════════════════════
//  AuctionDetailController — /auctions/:id
// ══════════════════════════════════════════════
angular.module('auctionApp')
    .controller('AuctionDetailController', ['$scope', '$routeParams', '$interval', 'AuctionService', 'AuthService', 'CurrencyService', 'SocketService', 'ValidationService',
        function ($scope, $routeParams, $interval, AuctionService, AuthService, CurrencyService, SocketService, ValidationService) {

            $scope.currency = CurrencyService;

            $scope.auction = null;
            $scope.bids = [];
            $scope.loading = true;
            $scope.bidAmount = '';
            $scope.bidMsg = '';
            $scope.bidError = '';
            $scope.bidding = false;
            $scope.countdown = '';
            $scope.toastMessage = '';
            $scope.flash = false;

            $scope.showToast = function(msg) {
                $scope.toastMessage = msg;
                setTimeout(() => { $scope.toastMessage = ''; $scope.$apply(); }, 3000);
            };

            $scope.flashPrice = function() {
                $scope.flash = true;
                setTimeout(() => { $scope.flash = false; $scope.$apply(); }, 500);
            };

            // Join socket room
            SocketService.joinAuction($routeParams.id);
            $scope.$on('$destroy', function () {
                SocketService.leaveAuction($routeParams.id);
            });

            // Listen for live events
            SocketService.on('new-bid', function(data) {
                if ($scope.auction) {
                    $scope.auction.current_price = data.new_price || data.amount;
                    $scope.auction.total_bids = data.total_bids || ($scope.auction.total_bids + 1);
                }
                $scope.bids.unshift({
                    bidder_name: data.bidder_name || data.bidder,
                    amount: data.amount,
                    bid_time: data.timestamp || data.time,
                    is_winning: true
                });
                for (let i = 1; i < $scope.bids.length; i++) {
                    $scope.bids[i].is_winning = false;
                }
                $scope.showToast('New bid placed by ' + (data.bidder_name || data.bidder) + '!');
                $scope.flashPrice();
            });

            SocketService.on('auction-closed', function(data) {
                if ($scope.auction) {
                    $scope.auction.current_price = data.final_price || data.amount;
                    $scope.auction.status = 'closed';
                }
                $scope.showToast('Auction won by ' + (data.winner_name || data.winner) + '!');
                loadBids();
            });

            // Load auction details
            function loadAuction() {
                AuctionService.getById($routeParams.id)
                    .then(function (res) {
                        $scope.auction = res.data.auction;
                        $scope.loading = false;
                        startCountdown();
                    })
                    .catch(function () {
                        $scope.error = 'Auction not found.';
                        $scope.loading = false;
                    });
            }

            // Load bid history
            function loadBids() {
                AuctionService.getBids($routeParams.id)
                    .then(function (res) {
                        $scope.bids = res.data.bids;
                    });
            }

            loadAuction();
            loadBids();

            // Live countdown timer
            function startCountdown() {
                $interval(function () {
                    if (!$scope.auction) return;
                    const diff = new Date($scope.auction.end_time) - new Date();
                    if (diff <= 0) {
                        $scope.countdown = 'Auction Ended';
                        return;
                    }
                    const d = Math.floor(diff / 86400000);
                    const h = Math.floor((diff % 86400000) / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    const s = Math.floor((diff % 60000) / 1000);
                    $scope.countdown = (d > 0 ? d + 'd ' : '') + h + 'h ' + m + 'm ' + s + 's';
                }, 1000);
            }

            // Place a bid
            $scope.placeBid = function () {
                $scope.bidMsg = '';
                $scope.bidError = '';
                $scope.bidding = true;

                if (!AuthService.isLoggedIn()) {
                    $scope.bidError = 'Please login to place a bid.';
                    $scope.bidding = false;
                    return;
                }
                
                const valErr = ValidationService.placeBid($scope.bidAmount, $scope.auction.current_price);
                if (valErr) {
                    $scope.bidError = valErr;
                    $scope.bidding = false;
                    return;
                }

                AuctionService.placeBid({
                    auction_id: $scope.auction.id,
                    amount: CurrencyService.toUSD(parseFloat($scope.bidAmount))
                })
                    .then(function (res) {
                        $scope.bidMsg = res.data.message;
                        $scope.bidAmount = '';
                        $scope.bidding = false;
                        // Single Source of Truth: we let the global socket emitted event mutate our local $scope models.
                    })
                    .catch(function (err) {
                        $scope.bidError = err.data.error || 'Failed to place bid.';
                        $scope.bidding = false;
                    });
            };

            $scope.isLoggedIn = function () { return AuthService.isLoggedIn(); };
            $scope.currentUser = function () { return AuthService.getUser(); };

        }]);


// ══════════════════════════════════════════════
//  CreateAuctionController — /create-auction
// ══════════════════════════════════════════════
angular.module('auctionApp')
    .controller('CreateAuctionController', ['$scope', '$location', 'AuctionService', 'CurrencyService', 'ValidationService',
        function ($scope, $location, AuctionService, CurrencyService, ValidationService) {

            $scope.currency = CurrencyService;

            $scope.formData = { status: 'active' };
            $scope.error = '';
            $scope.success = '';
            $scope.loading = false;

            $scope.categories = [
                { id: 1, name: 'Electronics' },
                { id: 2, name: 'Vehicles' },
                { id: 3, name: 'Furniture' },
                { id: 4, name: 'Art & Antiques' },
                { id: 5, name: 'Clothing' },
                { id: 6, name: 'Books' }
            ];

            $scope.submit = function () {
                $scope.error = '';
                $scope.success = '';
                $scope.loading = true;

                // Set start_time to now if not provided
                if (!$scope.formData.start_time) {
                    $scope.formData.start_time = new Date().toISOString().slice(0, 16);
                }
                
                const valErr = ValidationService.createAuction($scope.formData);
                if (valErr) {
                    $scope.error = valErr;
                    $scope.loading = false;
                    return;
                }

                const payload = angular.copy($scope.formData);
                payload.starting_price = CurrencyService.toUSD(payload.starting_price);
                if (payload.buy_now_price) {
                    payload.buy_now_price = CurrencyService.toUSD(payload.buy_now_price);
                }

                AuctionService.create(payload)
                    .then(function (res) {
                        $scope.success = 'Auction created! Redirecting...';
                        $scope.loading = false;
                        setTimeout(function () {
                            $location.path('/auctions/' + res.data.auction_id);
                            $scope.$apply();
                        }, 1500);
                    })
                    .catch(function (err) {
                        $scope.error = err.data.error || 'Failed to create auction.';
                        $scope.loading = false;
                    });
            };

        }]);

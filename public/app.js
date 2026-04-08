// ══════════════════════════════════════════════
//  BidVault — AngularJS App & Router
// ══════════════════════════════════════════════

angular.module('auctionApp', ['ngRoute'])

    .config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {

        $routeProvider

            .when('/', {
                templateUrl: 'views/home.html',
                controller: 'HomeController'
            })

            .when('/auctions', {
                templateUrl: 'views/auctions.html',
                controller: 'AuctionListController'
            })

            .when('/auctions/:id', {
                templateUrl: 'views/auction-detail.html',
                controller: 'AuctionDetailController'
            })

            .when('/login', {
                templateUrl: 'views/login.html',
                controller: 'AuthController'
            })

            .when('/register', {
                templateUrl: 'views/register.html',
                controller: 'AuthController'
            })

            .when('/create-auction', {
                templateUrl: 'views/create-auction.html',
                controller: 'CreateAuctionController'
            })

            .when('/dashboard', {
                templateUrl: 'views/dashboard.html',
                controller: 'DashboardController'
            })

            .when('/profile', {
                templateUrl: 'views/profile.html',
                controller: 'ProfileController'
            })

            .otherwise({ redirectTo: '/' });

    }])

    // ── Run block: redirect to login if route needs auth ──
    .run(['$rootScope', '$location', 'AuthService', function ($rootScope, $location, AuthService) {

        const protectedRoutes = ['/create-auction', '/dashboard', '/profile'];

        $rootScope.isLoggedIn = AuthService.isLoggedIn;
        $rootScope.currentUser = AuthService.getUser;

        $rootScope.$on('$routeChangeStart', function (event, next, current) {
            const path = $location.path();
            if (protectedRoutes.includes(path) && !AuthService.isLoggedIn()) {
                $location.path('/login');
            }
        });

    }])

    .directive('fileModel', ['$parse', function ($parse) {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                const model = $parse(attrs.fileModel);
                const modelSetter = model.assign;
                
                element.bind('change', function() {
                    scope.$apply(function() {
                        modelSetter(scope, element[0].files[0]);
                    });
                });
            }
        };
    }]);

// ══════════════════════════════════════════════
//  CurrencyService — Fixed to Indian Rupee (INR)
// ══════════════════════════════════════════════
angular.module('auctionApp')
    .factory('CurrencyService', ['$rootScope', function ($rootScope) {

        const state = {
            target: 'INR',
            rate: 1, // 1:1 mapping (DB stores INR natively)
            symbol: '₹',
            ready: true
        };

        // Emit ready immediately since it is synchronous now
        setTimeout(() => $rootScope.$broadcast('currencyReady'), 0);

        return {
            convert: function (dbAmount) {
                if (dbAmount === undefined || dbAmount === null) return '';
                // Format using Indian numbering system
                return new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: state.target,
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                }).format(dbAmount);
            },
            toUSD: function (localAmount) {
                // In this case, 'USD' functionally just means "database base currency"
                if (!localAmount) return 0;
                return parseFloat(localAmount);
            },
            toLocal: function (dbAmount) {
                if (!dbAmount) return 0;
                return parseFloat(dbAmount);
            },
            getSymbol: function () { return state.symbol; },
            getCode: function () { return state.target; },
            getRate: function () { return state.rate; },
            isReady: function () { return state.ready; }
        };

    }])
    .filter('localCurrency', ['CurrencyService', function (CurrencyService) {
        function filter(amount) {
            return CurrencyService.convert(amount);
        }
        filter.$stateful = false; // No longer needs to poll state since it's synchronous
        return filter;
    }]);

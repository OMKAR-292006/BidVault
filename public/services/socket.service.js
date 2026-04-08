// ══════════════════════════════════════════════
//  SocketService — wraps Socket.io for AngularJS
//  Handles real-time bid events
// ══════════════════════════════════════════════

angular.module('auctionApp')

    .service('SocketService', ['$rootScope', function ($rootScope) {

        // Connect to the Socket.io server
        // The URL is blank because frontend is served from the same server
        let socket = null;

        this.connect = function () {
            if (!socket) {
                socket = io();   // connects to window.location automatically
                console.log('⚡ Socket.io connected');
            }
            return socket;
        };

        this.disconnect = function () {
            if (socket) {
                socket.disconnect();
                socket = null;
            }
        };

        // Join an auction room — call when user opens an auction page
        this.joinAuction = function (auctionId) {
            if (socket) {
                socket.emit('join-auction', auctionId);
                console.log('Joined auction room:', auctionId);
            }
        };

        // Leave an auction room — call when user navigates away
        this.leaveAuction = function (auctionId) {
            if (socket) {
                socket.emit('leave-auction', auctionId);
                console.log('Left auction room:', auctionId);
            }
        };

        // Listen for a socket event and run a callback inside Angular's digest cycle
        // (needed so AngularJS knows the scope changed and updates the view)
        this.on = function (eventName, callback) {
            if (socket) {
                socket.on(eventName, function (data) {
                    // $rootScope.$apply wraps the callback so AngularJS re-renders
                    $rootScope.$apply(function () {
                        callback(data);
                    });
                });
            }
        };

        // Remove a listener (cleanup when controller is destroyed)
        this.off = function (eventName) {
            if (socket) {
                socket.off(eventName);
            }
        };

        // Emit an event to the server
        this.emit = function (eventName, data) {
            if (socket) {
                socket.emit(eventName, data);
            }
        };

    }]);

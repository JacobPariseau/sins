angular
  .module('HandCtrl', [])
  .controller('HandController', [
    '$scope',
    '$mdBottomSheet',
    'Socket',
    'DialogService',
    'GameManager',
    HandController
  ])
  .directive('handsheet', HandDirective);

function HandController($scope, $mdBottomSheet, Socket, DialogService, GameManager) {
  const hm = this;
  hm.hand = hand;
  hm.handCards = 0;
  hm.table = table;
  hm.tableCards = 0;
  hm.handClick = handClick;
  $scope._ = _;
  $scope.logscope = function() {
    console.log($scope);
    return true;
  };

  console.log($scope);
  $scope.game = GameManager;

  $scope.$watch('$parent.vm.selectedPlayer', function(delta, prime) {
    hand();
    table();
  });

  Socket.on('player:updated', function() {
    console.log('Hand Controller Player Updated');
    hand();
    table();
  });

  function hand() {
    // Should display all status and trap cards of current player
    const player = $scope.$parent.vm.selectedPlayer;
    const hand = GameManager.getHandByPlayer(player);

    if(hand) {
      hm.handCards = hand.length;
    }
    // console.log(hand);
    return hand;
  }

  function table() {
    const player = $scope.$parent.vm.selectedPlayer;
    const table = GameManager.getTableByPlayer(player);

    if(table) {

      hm.tableCards = table.length;
    }

    return table;
  }

  function handClick(item) {
    console.log(item);
    DialogService.showHandInput($scope.$parent.vm.selectedPlayer, item);
  }
}

function HandDirective() {
  return {
    templateUrl: 'game/hand/hand.template.html',
    controller: 'HandController',
    controllerAs: 'hm',
    scope: {
      selectedPlayer: '@',
      turn: '@'
    }
  };
}

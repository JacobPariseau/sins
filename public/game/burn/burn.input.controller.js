angular
  .module('Game')
  .controller('BurnInputController', [
    '$scope',
    '$mdDialog',
    'Socket',
    'DialogService',
    'GameManager',
    BurnInputController
  ]);

function BurnInputController($scope, $mdDialog, Socket, DialogService, GameManager) {
  const sm = this;
  $scope.game = GameManager;
  sm.selectPlayer = selectPlayer;
  sm.selection = [$scope.vm.selectedPlayer];
  sm.cancel = $mdDialog.cancel;
  sm.burnPlayer = burnPlayer;
  console.log($scope);
  function selectPlayer(player) {
    const id = sm.selection.indexOf(player);

    if(id > -1) {sm.selection.splice(id, 1);}

    else {sm.selection.push(player);}
  }

  function cancel() {
    console.log(card);
    $mdDialog.cancel();
  }

  function burnPlayer() {
    Socket.emit('player:burn', {
      'room': GameManager.session.title,
      'players': sm.selection
    });
    $mdDialog.cancel();
  }
}

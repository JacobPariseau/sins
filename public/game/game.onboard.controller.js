angular
  .module('Game')
  .controller('OnboardController', [
    '$scope',
    '$state',
    'Socket',
    'Facebook',
    'FBService',
    'DialogService',
    'GameManager',
    OnboardController
  ]);

function OnboardController($scope, $state, Socket, Facebook, FBService, DialogService, GameManager) {
  const vm = this;
  $scope.Facebook = Facebook;
  vm.facebook = {
    fbLogin: false,
    name: 'friend!',
    id: 0,
    picture: ''
  };

  vm.logout = logout;
  vm.login = login;
  vm.title = $state.params.title;
  (function() {
    checkLoginStatus();
  })();

  function checkLoginStatus() {
    console.log('Check login status');
    return new Promise(function(resolve) {
      Facebook.getLoginStatus(resolve);
    })
    .then(function(response) {
      if(response.status !== 'connected') {
        console.log('not connected');
        vm.facebook = {
          fbLogin: false,
          name: 'friend!',
          id: 0,
          picture: ''
        };
        $scope.$apply();
        return Promise.reject();
      }

      vm.facebook.fbLogin = true;
      return Promise.all([
        FBService.getUser(),
        FBService.getProfilePicture()
      ])
      .then(function(results) {
        console.log(results);
        vm.facebook.name = results[0].name;
        vm.facebook.id = results[0].id;
        vm.facebook.picture = results[1].data.url;

        FS.identify(results[0].id, {
          displayName: results[0].name
        });
        $scope.$apply();
      });
    });
  }
  function logout() {
    Facebook.logout(function(response) {
      checkLoginStatus();
    });
  }

  function login() {
    Facebook.login(function(response) {
      checkLoginStatus();
    });
  }
}

angular
  .module('Game', [])

  .controller('GameController', [
    '$scope',
    '$q',
    '$mdDialog',
    '$mdBottomSheet',
    '$mdMedia',
    '$state',
    '$timeout',
    'Socket',
    'GameManager',
    'DeckService',
    'DialogService',
    'Facebook',
    'FBService',
    'Analytics',
    GameController
  ]);

function GameController($scope, $q, $mdDialog, $mdBottomSheet, $mdMedia, $state, $timeout, Socket, GameManager, DeckService, DialogService, Facebook, FBService, Analytics) {
  Analytics.trackPage('/game');
  // Lock scrolling hack
//  angular.element(document.body).addClass("noscroll");
  $scope.$mdMedia = $mdMedia;
  $scope.game = GameManager;
  $scope._ = _;
  $scope.log = function(log) {
    console.log(log);
    return true;
  };
  $scope.options = {
    modalTitle: 'Give Developer Feedback',
    takeScreenshotButtonText: 'Take screenshot',
    submitButtonText: 'Submit',
    sendFeedbackButtonText: 'Send Feedback',
    cancelScreenshotOptionsButtonText: 'Cancel',
    takeScreenshotOptionsButtonText: 'Take Screenshot',
    submitButtonPressed: submitFeedback
  };
  const vm = this;
  /* Properties **/
  vm.selectedPlayer = 0;
  vm.eventCard = {};
  vm.burnCard = [];
  vm.dialOpen = false;
  vm.showHand = showHand;

  vm.click = {x: 0, y: 0};
  vm.switchDecks = switchDecks;
  vm.otherDeck = 'BURN';
  vm.deckId = 0;

  vm.drawEvent = drawEvent;
  vm.drawBurn = drawBurn;

  vm.turnChange = turnChange;
  vm.alertTurn = alertTurn;
  vm.startGame = activate;
  vm.startEh = false;
  vm.playerIsMe = playerIsMe;
  vm.facebook = {
    fbLogin: false,
    name: 'friend!',
    id: 0,
    picture: ''
  };

  vm.login = login;
  vm.logout = logout;

  function checkLoginStatus() {
    console.log('Check login status');
    return new Promise(function(resolve) {
      Facebook.getLoginStatus(resolve);
    })
    .then(function(response) {
      if(response.status !== 'connected') {
        vm.fbLogin = false;
        return Promise.resolve();
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
      });
    });
  }
  function logout() {
    Facebook.logout(function(response) {
      checkLoginStatus()
      .then(loadPlayers)
      .then(console.log);
    });
  }

  function login() {
    Facebook.login(function(response) {
      checkLoginStatus()
      .then(loadPlayers)
      .then(console.log);
    });
  }

  function playerIsMe(player) {
    // Player is an object
    if(typeof player === 'number') {
      player = GameManager.session.players[player];
    }

    if(player.facebook && player.facebook.id === vm.facebook.id) {
      return true;
    }

    if(player.deviceToken === GameManager.session.deviceToken) {
      return true;
    }

    return false;
  }

  Socket.on('client:joined', function(data) {
    console.log('User joined');
  });

  activate();

  function activate() {
    vm.startEh = false;
    // Am I in the game already? If not, send me to settings
    joinGame()
    .then(checkLoginStatus)
    .then(directMe)
    .then(setupParser)
    .then(firstDeal)
    .then(function() {
      vm.startEh = true;
      $scope.thisDevice = function(index) {
        if(index === -1) {return false;}
        if(!vm.startEh) {return false;}
        if(!GameManager.session.players.length) {return false;}
        return playerIsMe(GameManager.session.players[index]);
      };

      const deck = _.find(GameManager.session.settings.decks, {'visible': true});
      vm.deckChoice = deck ? deck.type : '';
      console.log('Game Start!');
    });

    function directMe() {
      // If there are already players, see if I'm one of them
      console.log(GameManager.session.players);
      console.log(vm.facebook.id);
      console.log(GameManager.session.deviceToken);
      GameManager.session.title = GameManager.session.title || $state.params.title;
      if(GameManager.session.players && GameManager.session.players.length) {
        if(vm.facebook.id && _.find(GameManager.session.players, {'facebook': {id: vm.facebook.id}})) {
          // I am already in the list
          return Promise.resolve();
        }

        if(_.find(GameManager.session.players, {'deviceToken': GameManager.session.deviceToken})) {
          // I am already in the list
          return Promise.resolve();
        }
      }
      $state.go('gameSettings', {title: GameManager.session.title.toUpperCase()});
      return Promise.reject();
    }

    function joinGame() {
      GameManager.session.title = GameManager.session.title.toUpperCase() || $state.params.title.toUpperCase();

      Socket.emit('client:join', {
        room: GameManager.session.title
      });

      return GameManager.getRoom()
      .then(function(room) {
        console.log(room);
        GameManager.session.mode = room.mode;
        GameManager.session.players = room.players;
        GameManager.session.title = GameManager.session.title || room.title;

        GameManager.session.settings = room.settings;
        GameManager.session.eventDeck = room.eventDeck;
        GameManager.session.totalTurns = room.totalTurns;
        GameManager.session.turn = vm.selectedPlayer = room.turn;

        const token = getCookie(GameManager.session.title);
        if (token !== '') {
          GameManager.session.deviceToken = token;
          console.log('Loaded token ' + GameManager.session.deviceToken + ' from memory');
        }
        else {
          GameManager.session.deviceToken = Math.random().toString(36).substr(2);
          setCookie(GameManager.session.title, GameManager.session.deviceToken);
          console.log('Saved token ' + GameManager.session.deviceToken + ' to memory');
        }

      });

      // Set device token cookie
      // Check cookies for device tokens
      function setCookie(cname, cvalue) {
        const d = new Date();
        d.setTime(d.getTime() + 43200000);
        const expires = 'expires=' + d.toUTCString();
        document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
      }

      function getCookie(cname) {
        const name = cname.toUpperCase() + '=';
        console.log(name);
        const ca = document.cookie.split(';');
        console.log(ca);
        for(let i = 0; i < ca.length; i++) {
          let c = ca[i];
          while (c.charAt(0) == ' ') {
            c = c.substring(1);
          }
          if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
          }
        }
        return '';
      }

    }

    function setupParser() {
      console.log('SETUP PARSER');
      vm.parser = new Parser();
      vm.parser.addRule('RANDOM', function(tag, history, source) {
        console.log(source);
        if(!source.data) {return false;}
        return _.sample(source.data, 1);
      });
      vm.parser.addRule('PLAYERA', function(tag, history, source) {
        console.log(source);
        // Return PLAYERA if already used
        const existing = _.find(history, function(record) {
          return record.match === 'PLAYERA';
        });

        if (existing && existing.text) {
          return existing.text;
        }

        const me = (source && source.player) ? source.player : GameManager.session.turn;
        const myName = GameManager.session.players[me].name;
        let playerName = myName;
        while(playerName === myName) {
          playerName = GameManager.session.players[randomIndex(GameManager.session.players)].name;
        }
        return playerName;
      });

      vm.parser.addRule('PLAYERB', function(tag, history, source) {
        console.log(source);
        // Return tag if already used
        const existing = _.find(history, function(record) {
          return record.match === 'PLAYERB';
        });

        if(existing && existing.text) {
          return existing.text;
        }

        // Return random that is not used
        let blacklist = _.filter(history, function(record) {
          return record.match === 'PLAYERA';
        });

        if(blacklist.length === 0) {
          blacklist = [{text: ''}];
        }

        const me = (source && source.player) ? source.player : GameManager.session.turn;
        const myName = GameManager.session.players[me].name;
        const numPlayers = GameManager.session.players.length * 2;

        let name = blacklist[0].text;
        let i = 0;
        while((name === blacklist[0].text || name === myName) && i < numPlayers) {
          name = GameManager.session.players[randomIndex(GameManager.session.players)].name;
          i = i + 1;
        }
        return name;
      });

      vm.parser.addRule('ME', function(tag, history, source) {
        console.log(source);
        const me = (source && source.player) ? source.player : GameManager.session.turn;
        return GameManager.session.players[me].name;
      });

      vm.parser.addRule('NEXTPLAYER', function(tag, history, source) {
        console.log(source);
        const me = (source && source.player) ? source.player : GameManager.session.turn;
        const len = GameManager.session.players.length;
        return GameManager.session.players[(me + 1) % len].name;
      });

      vm.parser.addRule('PREVPLAYER', function(tag, history, source) {
        const me = (source && source.player) ? source.player : GameManager.session.turn;
        const len = GameManager.session.players.length;
        return GameManager.session.players[(me + len - 1) % len].name;
      });
    }
    function firstDeal() {
      console.log(GameManager);
      console.log($scope);
      Socket.emit('player:ready', {
        'room': GameManager.session.title
      }, function(room) {
        console.log(room);
        // Bind data to local client
        GameManager.session.players = room.players;
        GameManager.session.eventDeck = room.eventDeck;
        GameManager.session.settings = room.settings;
        GameManager.session.mode = room.mode;
        GameManager.session.turn = room.turn;
        GameManager.session.facedown = true;

        if(_.find(room.settings.hands, {type: 'status'})) {
          GameManager.session.ui.status = true;
        }

        if(_.find(room.settings.hands, {type: 'traps'})) {
          GameManager.session.ui.traps = true;
        }

        if(GameManager.session.settings.takeTurns) {
          return DialogService.showAlert({
            'title': 'Choose your actions carefully.',
            'text': GameManager.session.players[GameManager.session.turn].name + '\'s turn is starting'
          })
          .then(function() {
            vm.selectedPlayer = room.turn;

          });
        }

        // If game has no turns, tab to me at start
        return Promise.resolve()
        .then(function() {
          vm.selectedPlayer = _.find(GameManager.session.players, {'deviceToken': GameManager.session.deviceToken}).index;
        });
      });

    }
  }

  function showHand() {
    if($mdMedia('gt-xs') || !playerIsMe(GameManager.session.turn)) {
      // Should already have hand visible
      return;
    }
    $mdBottomSheet.show({
      templateUrl: 'game/hand/hand.template.html',
      controller: 'HandController',
      controllerAs: 'hm',
      scope: $scope.$new()
    });
  }

  function switchDecks(id) {
    const decks = _.filter(GameManager.session.settings.decks, {'visible': true});
    vm.deckId = id || (vm.deckId + 1) % decks.length || 0;
    console.log(vm.deckId);
    vm.deckChoice = decks[vm.deckId].type;
    vm.otherDeck = vm.deckId ? 'EVENT' : 'BURN'; // TODO make dynamic
  }

  /* External functions **/

  function drawEvent() {
    console.log('Draw Event');

    const card = GameManager.session.eventDeck[GameManager.session.totalTurns];
    if (GameManager.session.facedown) {
      // Parse card contents
      vm.eventCard.primary = card.primary;
      vm.eventCard.secondary = vm.parser.render(card.secondary, card);
      vm.eventCard.tertiary = card.tertiary;
      vm.eventCard.type = card.type;

        // Flip card up
      GameManager.session.facedown = false;
      return;

    }
    // Take status and trap cards
    if (card.type === 'trap') {
      const player = {
        index: GameManager.session.turn,
        pushCard: angular.toJson(card)
      };

      if(GameManager.session.fb
      && GameManager.session.fb === GameManager.session.players[GameManager.session.turn].facebook) {
        player.facebook = GameManager.session.fb;
      }

      Socket.emit('player:update', {
        room: GameManager.session.title,
        player: player
      });

      vm.eventCard.flyDown = true;
      _.delay(function() {
        vm.eventCard.flyDown = false;
        turnChange(GameManager.session.turn);
      }, 500);
    }
    else {

      // Is regular card, flipped up. Continue to next player
      vm.eventCard.flyLeft = true;
      _.delay(function() {
        vm.eventCard.flyLeft = false;
        turnChange();
      }, 500);
    }
  }

  function drawBurn() {
    // Burning someone else
    if(!vm.burnCard.length) {
      // We can burn multiples now, so reset to the event deck automagically
      DialogService.showBurnInput($scope)
      .then(function() {
        switchDecks(0);
      }, function() {
        switchDecks(0);
      });
      return;
    }

    // Handling own burn card

    // Flip face up
    if (vm.burnCard[0].facedown) {
      vm.burnCard[0].facedown = false;
      return;
    }

    // Take status and trap cards
    if (vm.burnCard[0].type === 'status') {
      const player = {
        index: vm.burnCard[0].player,
        pushCard: angular.toJson(vm.burnCard[0])
      };

      if(GameManager.session.fb
      && GameManager.session.fb === GameManager.session.players[vm.burnCard[0].player].facebook) {
        player.facebook = GameManager.session.fb;
      }

      Socket.emit('player:update', {
        room: GameManager.session.title,
        player: player
      });
    }

    // Remove top card

    console.log(vm.burnCard.length);
    if($mdMedia('xs') && vm.burnCard.length <= 1) {
      console.log('NO WAIT');
      vm.burnCard.splice(0, 1);
    }
    else {
      vm.burnCard[0].flyDown = true;
      _.delay(function() {
        vm.burnCard.splice(0, 1);
        // Bring up dialog if there's another card waiting
        if(vm.burnCard.length) {
          DialogService.showAlert({
            'text': GameManager.session.players[vm.burnCard[0].player].name + ' has been burned!'
          });
        }
      }, 500);

    }

  }

  function alertTurn() {
    return DialogService.showAlert({
      'text': 'It is ' + GameManager.session.players[GameManager.session.turn].name + '\'s turn.'
    });
  }
  function turnChange(index) {
    // If index is not set, select next player automagically
    console.log(index);
    index = index || (GameManager.session.turn + 1) % GameManager.session.players.length;
    Socket.emit('turn:set', {
      room: GameManager.session.title,
      index: index
    });
  }

  Socket.on('turn:changed', function(data) {
    console.log('on turn changed');
    vm.dialOpen = false;
    vm.selectedPlayer = data.turn;
    GameManager.session.totalTurns = data.totalTurns;
    GameManager.session.facedown = true;
    // this account is ON MY DEVICE and it's NOT ALREADY MY TURN
    if(playerIsMe(data.turn) && GameManager.session.turn !== data.turn) {
      GameManager.session.turn = data.turn;
      alertTurn();
    }
    GameManager.session.turn = data.turn;

  });

  Socket.on('player:burned', function(obj) {
    console.log('On Player Burned');

    // Update player stats
    _.each(obj.players, function(player) {
      GameManager.session.players[player.index] = Object.assign(GameManager.session.players[player.index], player);
    });

    vm.burnCard = [];
    _.each(obj.cards, function(card) {
      if(playerIsMe(card.player)) {
        // Target Player is on this device
        vm.burnCard.push(card);
        if(!vm.parser) {
          console.log(vm);
        }
        _.last(vm.burnCard).secondary = vm.parser.render(card.secondary, card);

        if(!card.empty) {
          _.last(vm.burnCard).facedown = true;
        }
      }
    });

    // TODO make empty cards work for multiple players
    if(vm.burnCard.length) {
      vm.selectedPlayer = vm.burnCard[0].player;
      DialogService.showAlert({
        'text': GameManager.session.players[vm.burnCard[0].player].name + ' has been burned!'
      })
      .then(function() {
        if(vm.burnCard[0].empty) {
          vm.burnCard.splice(0, 1);
        }
      });
    }
  });

  Socket.on('player:updated', function(data) {
    console.log('Update Player');
    console.log(data);

    let player = GameManager.session.players[data.index];
    player = Object.assign(player, data);

    // If YOUR TURN and YOU HAVE STARTED THE GAME
    if(playerIsMe(player) && vm.startEh) {
      // Check hand and table lengths
      // The hand (trap cards) should be no more than default 6
      if(GameManager.session.ui.trap) {
        const hand = GameManager.getHandByPlayer(data.index);
        if(hand.length > _.find(GameManager.session.settings.hands, {'type': 'trap'}).max) {
          DialogService.showAlert({
            'text': player.name + ' has more than ' + _.find(GameManager.session.settings.hands, {'type': 'trap'}).max + ' trap cards! Please discard one.'
          }).then(function() {
            vm.selectedPlayer = data.index;
            showHand();
          });
        }
      }

      // The table (status cards) should be no more than default 3
      if (GameManager.session.ui.status) {
        const table = GameManager.getTableByPlayer(data.index);
        if(GameManager.session.ui.trap && table.length > _.find(GameManager.session.settings.hands, {'type': 'status'}).max) {
          DialogService.showAlert({
            'text': player.name + ' has more than ' + _.find(GameManager.session.settings.hands, {'type': 'status'}).max + ' status cards! Please discard one.'
          }).then(function() {
            vm.selectedPlayer = data.index;
            showHand();
          });
        }
      }
    }
  });

  function submitFeedback(result) {
    console.log(result);
    Socket.emit('feedback:submit', result);
  }
}

function randomIndex(array) {
  return Math.floor(Math.random() * (array.length));
}

Friends = new Mongo.Collection("friends");

var isFBinit = false;

currentUserData = {
  name: null,
  userID: null,
  userAccessToken: null,
  loginStatus: false,
  proPicURL: null
}

var currentUserDep = new Tracker.Dependency();

if (Meteor.isServer) {
  // This code only runs on the server
  // Only publish tasks that are public or belong to the current user
  Meteor.publish("friends", function () {
    return Friends.find();
  });
}

if (Meteor.isClient) {
  // This code only runs on the client

  Meteor.subscribe("friends");

  window.fbAsyncInit = function() {
    console.log("fb initializing...");
    FB.init({
      appId : '510841125734589',
      status : true,
      xfbml : true
    });
    isFBinit = true;
    console.log("fb initialized");

    // triggered on fbLogin and fbLogout
    FB.Event.subscribe('auth.authResponseChange', function(response) {
      if (response.status === 'connected') {
        currentUserData.userID = response.authResponse.userID;
        currentUserData.userAccessToken = response.authResponse.accessToken;

        FB.api('/', 'POST', {
            batch: [
              { method: 'GET', relative_url: 'me/friends'},
              { method: "GET", relative_url: currentUserData.userID},
            ]
          },
            function (response) {
              if (response && !response.error) {
                var friendsData = JSON.parse(response[0].body).data;                  
                for (var key in friendsData) {
                  var friend = friendsData[key];
                  Friends.insert({
                    name: friend.name,
                    id: friend.id,
                    proPicURL: "https://graph.facebook.com/" + friend.id + "/picture"
                  });
                }

                currentUserData.proPicURL = "https://graph.facebook.com/" + currentUserData.userID + "/picture";
                currentUserData.name = JSON.parse(response[1].body).name;

                currentUserDep.changed();
              }
            }
        );

        currentUserData.loginStatus = true;
        currentUserDep.changed();
      }
    });
  };

  Template.login.helpers({

    currentUserName: function() {
      currentUserDep.depend();
      return currentUserData.name;
    },

    // returns src for user profile picture to <img>
    currentUserProPic: function() {
      currentUserDep.depend();
      return currentUserData.proPicURL;
    }
  });

  Template.login.events({
    'click .login-button': function (e) {
      e.preventDefault();
      Meteor.call('fbLogin');
    },

    'click .logout-button': function (e) {
      e.preventDefault();
      Meteor.call('fbLogout');
    }
  });

  Template.registerHelper('isUserLoggedIn', function() {
    currentUserDep.depend();
    return currentUserData.loginStatus;
  });

  Template.body.helpers({
    friends: function () {
      return Friends.find({});
    }
  });

  Template.body.events({

  });

  Template.friendList.helpers({
    isOwner: function () {
      return this.owner === Meteor.userId();
    },
  });

  Template.friendList.events({

  });

  Accounts.ui.config({
  });
}

Meteor.methods({
  // fbLogin: function() {
  //   console.log('test');
  // }

  fbLogin: function() {
    if (isFBinit){
      FB.login();
    }
  },

  fbLogout: function() {
    if (isFBinit){

      // var allFriends = Friends.find().fetch();

      // // Friends.remove({});
      // // for (var eachObj in allFriends) {
      // //   Friends.remove({_id: allFriends[eachObj]._id});
      // //   // console.log(allFriends[eachObj]);
      // //   console.log(Friends.find().fetch());

      // // }

      FB.logout();
      currentUserData.loginStatus = false;
      currentUserDep.changed();
      console.log('logged out');
    }
  }

});
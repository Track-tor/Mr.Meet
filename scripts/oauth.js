'use strict';

window.onload = function() {
  document.querySelector('#check').addEventListener('click', function() {
    if (document.querySelector('#check').checked) {
      chrome.identity.getAuthToken({interactive: true}, function(token) {
        chrome.storage.sync.set({token: token}, function() {
          console.log("Token value is set to " + token);
        });
      });
    }
  });
};
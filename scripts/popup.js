// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

// Runs setup script
document.addEventListener("DOMContentLoaded", () => {
  restore_options();
  attachCheckboxHandlers();
});


// Saves options to chrome.storage
function save_options() {
  let featureState = document.getElementById("check").checked;
  chrome.storage.sync.set({key: featureState}, function() {
    console.log("Value is set to " + featureState);
  });
}

// Restores switch state using the preferences stored in chrome.storage.
function restore_options() {
  chrome.storage.sync.get(['key'], function (result) {
    console.log('Value currently is ' + result.key);
    document.getElementById("check").checked = result.key;
  });
}

// Saves the updated status when the switch state changes
function attachCheckboxHandlers() {
  const element = document.getElementById("check");
  element.addEventListener("change", () => {startExtension(element);});
}

//calls the content script to start/stop the extension and saves the state of the activation
function startExtension(switchButton){
  if(switchButton.checked){
    //send the start message to the content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {msg: "start"});
    });
  }
  else{
    //send the stop message to the content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {msg: "stop"});
    });
  }
  save_options();
}
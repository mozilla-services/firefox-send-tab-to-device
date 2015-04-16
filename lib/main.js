/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {Cc,Ci,Cr,Cu} = require("chrome");

Cu.import("resource://services-sync/main.js");

const contextMenu = require("sdk/context-menu");
const tabs        = require("sdk/tabs");
const xulApp      = require("sdk/system/xul-app");

function promptAndSendURIToDevice(uri, title) {
  let clientsEngine = Weave.Service.clientsEngine || // for Firefox 19+
                      Weave.Clients;                 // for Firefox up-to 18
  let remoteClients = clientsEngine._store._remoteClients;
  let promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"]
                      .getService(Ci.nsIPromptService);

  // get a list of the remote client name and its id.
  let labels = [];
  let ids = [];
  for (let id in remoteClients) {
    labels.push(remoteClients[id].name);
    ids.push(id);
  }
  labels.push("All devices");
  ids.push(undefined);

  if (labels.length > 1) {
    let selected = {};
    let result = promptService.select(null, "Send to device...", "Send \""+title+"\" to device:",
                                      labels.length, labels, selected);
    if (result) {
      clientsEngine.sendURIToClientForDisplay(uri, ids[selected.value], title);
      clientsEngine.sync();
    }
  } else {
    promptService.alert(null, "Send to device...", "You need to configure Firefox Sync.");
  }
}

let sendUri = null;
let sendPage = null;

function setupContextMenus() {
  if (sendUri == null) {
    sendUri = contextMenu.Item({
      label:         "Send this link to device...",
      context:       contextMenu.SelectorContext("a[href]"),
      contentScript: 'self.on("click", function(node) {' +
                     '  let title = document.title;' +
                     '  let uri = node.href;' +
                     '  self.postMessage([uri, title]);' +
                     '});',
      onMessage:     function onMessage(data) {
        promptAndSendURIToDevice(data[0], data[1]);
      }
    });
  }

  if (sendPage == null) {
    sendPage = contextMenu.Item({
      label:         "Send this page to device...",
      context:       contextMenu.PageContext(),
      contentScript: 'self.on("click", function(node) {' +
                     '  let title = document.title;' +
                     '  let uri = document.URL;' +
                     '  self.postMessage([uri, title]);' +
                     '});',
      onMessage:     function onMessage(data) {
        promptAndSendURIToDevice(data[0], data[1]);
      }
    });
  }
}

function releaseContextMenus() {
  if (sendUri != null) {
    sendUri.destroy();
    sendUri = null;
  }
  if (sendPage != null) {
    sendPage.destroy();
    sendPage = null;
  }
}

function handleDisplayURI(subject, topic, data) {
  console.log("Received a URI for display!");
  tabs.open(subject['uri']);
}

let handleReceived = false;

exports.main = function main(options, callbacks) {
  console.log("Starting send tab to device add-on");
  setupContextMenus();

  if (xulApp.versionInRange(xulApp.version, "1", "15")) {
    console.info("Application does not yet support displaying tabs. " +
                 "Installing handler.");
    handleReceived = true;
    Svc.Obs.add("weave:engine:clients:display-uri", handleDisplayURI);
  }
};

exports.onUnload = function onUnload(reason) {
  if (handleReceived) {
    Svc.Obs.remove("weave:engine:clients:display-uri", handleDisplayURI);
  }
  releaseContextMenus();
};

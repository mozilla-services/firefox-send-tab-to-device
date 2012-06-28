/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

Cu.import("resource://services-sync/engines/clients.js");
Cu.import("resource://services-sync/util.js");

const contextMenu = require("context-menu");
const tabs        = require("tabs");
const xulApp      = require("xul-app");

let getTargetLabels = function() {
  let items = [];

  console.log(JSON.stringify(Clients._store._remoteClients));

  let remoteClients = Clients._store._remoteClients;
  for (let id in remoteClients) {
    let client = remoteClients[id];

    let item = contextMenu.Item({
      label: client['name'],
      data:  JSON.stringify(client)
    });

    items.push(item);
  }

  if (!items.length) {
    items.push(contextMenu.Item({
      label: "Set up Sync to send between devices",
      data:  false,
    }));
  }

  return items;
};

let weaveObsStart = function(subject, topic, data) {
  Svc.Obs.remove("weave:service:sync:finish", weaveObsStart);

  let sendUri = contextMenu.Menu({
    label:         "Send this link to device...",
    context:       contextMenu.SelectorContext("a[href]"),
    items:         getTargetLabels(),
    contentScript: 'self.on("click", function(node, data) {' +
                   '  let title = document.title;' +
                   '  let uri = node.href;' +
                   '  self.postMessage([uri, JSON.parse(data), title]);' +
                   '});',
    onMessage:     function(data) {
      Clients.sendURIToClientForDisplay(data[0], data[1].id, data[2]);
    }
  });

  let sendPage = contextMenu.Menu({
    label:         "Send this page to device...",
    context:       contextMenu.PageContext(),
    items:         getTargetLabels(),
    contentScript: 'self.on("click", function(node, data) {' +
                   '  let title = document.title;' +
                   '  let uri = document.URL;' +
                   '  self.postMessage([uri, JSON.parse(data), title]);' +
                   '});',
    onMessage:     function(data) {
      Clients.sendURIToClientForDisplay(data[0], data[1].id, data[2]);
    }
  });
};

let handleDisplayUri = function(subject, topic, data) {
  console.log("Received a URI for display!");
  tabs.open(subject['uri']);  
};

exports.main = function(options, callbacks) {
  console.log("Starting send tab to device add-on");
  Svc.Obs.add("weave:service:sync:finish", weaveObsStart);

  if (xulApp.versionInRange(xulApp.version, "1", "15")) {
    console.info("Application does not yet support displaying tabs. " +
                 "Installing handler.");
    Svc.Obs.add("weave:engine:clients:display-uri", handleDisplayUri);
  }
};

exports.onUnload = function(reason) {
  Svc.Obs.remove("weave:engine:clients:display-uri", handleDisplayUri);
  Svc.Obs.remove("weave:service:sync:finish", weaveObsStart);
};

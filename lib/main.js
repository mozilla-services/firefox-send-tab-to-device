/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is send tab to device add-on.
 *
 * The Initial Developer of the Original Code is gps@mozilla.com
 * 
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

Cu.import("resource://services-sync/engines/clients.js");
Cu.import("resource://services-sync/util.js");

const contextMenu = require("context-menu");
const tabs        = require("tabs");

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
                   '  let uri = node.href;' +
                   '  self.postMessage([uri, JSON.parse(data)]);' +
                   '});',
    onMessage:     function(data) {
      Clients.sendURIToClientForDisplay(data[0], data[1].id);
    }
  });  

  let sendPage = contextMenu.Menu({
    label:         "Send this page to device...",
    context:       contextMenu.PageContext(),
    items:         getTargetLabels(),
    contentScript: 'self.on("click", function(node, data) {' +
                   '  let uri = document.URL;' +
                   '  self.postMessage([uri, JSON.parse(data)]);' +
                   '});',
    onMessage:     function(data) {
      Clients.sendURIToClientForDisplay(data[0], data[1].id);
    }
  });
};

let handleDisplayUri = function(subject, topic, data) {
  console.log("Received a URI for display!");
  tabs.open(subject['uri']);  
};

exports.main = function(options, callbacks) {
  console.log("Starting push to tab add-on");
  Svc.Obs.add("weave:service:sync:finish", weaveObsStart);    
  Svc.Obs.add("weave:engine:clients:display-uri", handleDisplayUri);
};

exports.onUnload = function(reason) {
  Svc.Obs.remove("weave:engine:clients:display-uri", handleDisplayUri);
  Svc.Obs.remove("weave:service:sync:finish", weaveObsStart);
};

console.log("The add-on is running.");

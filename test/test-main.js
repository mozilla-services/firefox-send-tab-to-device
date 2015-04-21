
const main = require("../lib/main");
const self = require("sdk/self");

exports["test main and onUnload"] = function(test) {
  let options = {
    id: self.id,
    name: self.name,
    version: self.version,
  };

  options.loadReason = "install";
  main.main(options, null);
  main.onUnload("disable");

  main.main(options, null);
  main.onUnload("disable");

  test.pass();
};

require("sdk/test").run(exports);

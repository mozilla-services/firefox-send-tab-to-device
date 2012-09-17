const main = require("main");

exports["test main and onUnload"] = function(test) {
  let options = {
    id: require("self").id,
    name: require("self").name,
    version: require("self").version,
  };

  options.loadReason = "install";
  main.main(options, null);
  main.onUnload("disable");

  main.main(options, null);
  main.onUnload("disable");

  test.pass();
};

require("test").run(exports);

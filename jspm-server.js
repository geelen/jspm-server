#!/usr/bin/env node
var liveServer = require("./index");

var opts = {
	proxyServer: null,
	port: process.env.PORT,
	open: true,
	logLevel: 2,
	inclExtensions: [],
	exclExtensions: []
};

for (var i = process.argv.length-1; i >= 2; --i) {
	var arg = process.argv[i];
	if (arg.indexOf("--port=") > -1) {
		var portString = arg.substring(7);
		var portNumber = parseInt(portString, 10);
		if (portNumber == portString) {
			opts.port = portNumber;
			process.argv.splice(i, 1);
		}
	}

	else if (arg.indexOf("--proxy=") > -1) {
		opts.proxyServer = arg.substring(8);
		process.argv.splice(i, 1);
	}

	else if (arg.indexOf("--open=") > -1) {
		var path = arg.substring(7);
		if (path.indexOf('/') != 0) {
			path = '/' + path;
		}
		opts.open = path;
		process.argv.splice(i, 1);
	}
	else if (arg.indexOf("--only-exts=") > -1) {
		var extensions = [];
		var extArgs = arg.substring(12);
		extArgs = extArgs.replace(/\./g, '');
		if(extArgs) {
			extensions = extArgs.split(/,\s?/);
		}
		if(extensions.length) {
			opts.inclExtensions = extensions;
			process.argv.splice(i, 1);
		}
	}
	else if (arg.indexOf("--ignore-exts=") > -1) {
		var extensions = [];
		var extArgs = arg.substring(14);
		extArgs = extArgs.replace(/\./g, '');
		if(extArgs) {
			extensions = extArgs.split(/,\s?/);
		}
		if(extensions.length) {
			opts.exclExtensions = extensions;
			process.argv.splice(i, 1);
		}
	}
	else if (arg.indexOf("--ignore=") > -1) {
		opts.ignore = arg.substring(9).split(",");
		process.argv.splice(i, 1);
	}
	else if (arg == "--no-browser") {
		opts.open = false;
		process.argv.splice(i, 1);
	} else if (arg == "--quiet" || arg == "-q") {
		opts.logLevel = 0;
		process.argv.splice(i, 1);
	} else if (arg == "--help" || arg == "-h") {
		console.log('Usage: jspm-server [-h|--help] [-q|--quiet] [--port=PORT] [--open=PATH] [--only-exts=EXTENSIONS] [--ignore-exts=EXTENSIONS] [--ignore=PATH] [--proxy=PROXY_PATH] [--no-browser] [PATH]');
		process.exit();
	}
}

if (process.argv[2]) {
	process.chdir(process.argv[2]);
}

if (opts.ignore) {
	var cwd = process.cwd();
	opts.ignore = opts.ignore.map(function(relativePath) {
		return path.join(cwd, relativePath);
	});
}

liveServer.start(opts);

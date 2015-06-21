#!/usr/bin/env node
var fs = require('fs'),
  connect = require('connect'),
  colors = require('colors'),
  WebSocket = require('faye-websocket'),
  path = require('path'),
  url = require('url'),
  http = require('http'),
  send = require('send'),
  open = require('open'),
  es = require("event-stream"),
  watchr = require('watchr'),
  chokidar = require('chokidar'),
  httpProxy = require('http-proxy'),
  zlib = require('zlib'),
  ws,
  clients = [];

var INJECTED_CODE = "<script>" + fs.readFileSync(__dirname + "/injected.js", "utf8") + "</script>";

var LiveServer = {};

function escape(html) {
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Based on connect.static(), but streamlined and with added code injecter
function staticServer(root, html5mode) {
  return function (req, res, next) {
    if ('GET' != req.method && 'HEAD' != req.method) return next();
    var reqpath = url.parse(req.url).pathname;
    if (html5mode && !reqpath.match(/\./)) {
      req.url = reqpath = "/200.html"
    }
    var hasNoOrigin = !req.headers.origin;
    var doInject = false;

    function directory() {
      var pathname = url.parse(req.originalUrl).pathname;
      res.statusCode = 301;
      res.setHeader('Location', pathname + '/');
      res.end('Redirecting to ' + escape(pathname) + '/');
    }

    function file(filepath, stat) {
      var x = path.extname(filepath);
      if (hasNoOrigin && (x === "" || x == ".html" || x == ".htm" || x == ".xhtml" || x == ".php")) {
        // TODO: Sync file read here is not nice, but we need to determine if the html should be injected or not
        var contents = fs.readFileSync(filepath, "utf8");
        doInject = contents.indexOf("</body>") > -1;
      }
    }

    function error(err) {
      if (404 == err.status) return next();
      next(err);
    }

    function inject(stream) {
      if (doInject) {
        // We need to modify the length given to browser
        var len = INJECTED_CODE.length + res.getHeader('Content-Length');
        res.setHeader('Content-Length', len);
        var originalPipe = stream.pipe;
        stream.pipe = function (res) {
          originalPipe.call(stream, es.replace(new RegExp("</body>", "i"), INJECTED_CODE + "</body>")).pipe(res);
        };
      }
    }

    send(req, reqpath, {root: root})
      .on('error', error)
      .on('directory', directory)
      .on('file', file)
      .on('stream', inject)
      .pipe(res);
  };
}

/**
 * Start a live server with parameters given as an object
 * @param host {string} Address to bind to (default: 0.0.0.0)
 * @param port {number} Port number (default: 8080)
 * @param root {string} Path to root directory (default: cwd)
 * @param open {string} Subpath to open in browser, use false to suppress launch (default: server root)
 * @param logLevel {number} 0 = errors only, 1 = some, 2 = lots
 */
LiveServer.start = function (options) {
  options = options || {};
  var host = options.host || '0.0.0.0';
  var port = options.port || 8080;
  var root = options.root || process.cwd();
  var inclExtensions = options.inclExtensions || []
  var exclExtensions = options.exclExtensions || []
  var logLevel = options.logLevel === undefined ? 2 : options.logLevel;
  var openPath = (options.open === undefined || options.open === true) ?
    "" : ((options.open === null || options.open === false) ? null : options.open);
  if (options.noBrowser) openPath = null; // Backwards compatibility with 0.7.0
  var html5mode = fs.existsSync(root + "/200.html")
  if (html5mode) {
    console.log(("200.html detected, serving it for all URLs that have no '.' (html5mode)").yellow)
  }

  var server;
  // Setup a web server
  if (!options.proxyServer) {
    var app = connect()
      .use(staticServer(root, html5mode)) // Custom static server
      .use(connect.directory(root, {icons: true}));
    if (logLevel >= 2)
      app.use(connect.logger('dev'));
    server = http.createServer(app).listen(port, host);
  } else {
    // set up the proxy server
    var proxy = httpProxy.createProxyServer({
      target: options.proxyServer
    });

    // set up a connect server to install middleware, which will be used by the proxy server
	server = connect()
      .use(function(req, res, next) {
        var _write = res.write;
        var _writeHead = res.writeHead;

        var isHTML;

        // disable any compression
        req.headers['accept-encoding'] = 'identity';

        // set up the headers so that injection works correctly
        res.writeHead = function(code, headers) {
          var cEnc = res.getHeader('content-encoding');
          var cType = res.getHeader('content-type');
          var cLen = res.getHeader('content-length');
          isHTML = cType && cType.match('text/html');

          if (isHTML) {
			res.setHeader('content-length', parseInt(cLen) + INJECTED_CODE.length);
          }

          _writeHead.apply(this, arguments);
        }

        // perform the actual injection if the chunk is html
        res.write = function(chunk) {
          function inject(body) {
            return body.toString().replace(new RegExp('</body>', 'i'), INJECTED_CODE + '</body>');
          }

          _write.call(res, isHTML ? inject(chunk) : chunk);
        }

        next();
      })
      .use(function(req, res) {
        proxy.web(req, res);
      })
      .listen(options.port || 8080)
      .on('error', console.log.bind(console));
  }

  // WebSocket
  server.addListener('upgrade', function (request, socket, head) {
    var ws = new WebSocket(request, socket, head);
    ws.onopen = function () {
      ws.send(JSON.stringify({type: 'connected'}));
    };
    clients.push(ws)
  });

  // Setup file watcher
  chokidar.watch(root, {
    ignored: /([\/\\]\.)|(node_modules)/,
    ignoreInitial: true,
    ignorePermissionErrors: true
  }).on('all', function (event, filePathOrErr) {
    if (event == 'error') {
      console.log("ERROR:".red, filePathOrErr);
    } else {
      var relativePath = path.relative(root, filePathOrErr);
      if (logLevel >= 1) console.log(("Change detected: " + relativePath).cyan);

      if(exclExtensions.length > 0 && exclExtensions.indexOf(path.extname(relativePath).replace(/\./g, '')) > -1) {
        return false
      }

      if(inclExtensions.length > 0 && inclExtensions.indexOf(path.extname(relativePath).replace(/\./g, '')) < 0) {
        return false
      }

      clients.forEach( function ( ws ) {
        ws.send(JSON.stringify({type: 'change', path: relativePath}))
      })
    }
  });

  // Output
  if (logLevel >= 1) {
    if (!options.proxyServer) {
      var serveURL = "http://127.0.0.1:" + port;
      console.log(('Serving "' + root + '" at ' + serveURL).green);
    } else {
      console.log(('Starting a proxy server for ' + options.proxyServer + ' at ' + 'http://localhost:' + options.port).green);
    }
  }

  // Launch browser
  if (openPath !== null)
    open(serveURL + openPath);
};

module.exports = LiveServer;

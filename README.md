[![view on npm](http://img.shields.io/npm/v/jspm-server.svg)](https://www.npmjs.org/package/jspm-server)
[![npm module downloads per month](http://img.shields.io/npm/dm/jspm-server.svg)](https://www.npmjs.org/package/jspm-server)

# JSPM Server

This is a development server for JSPM static sites. It's based on @tapio's excellent [live-server](https://github.com/tapio/live-server), which I used for a long time very happily.


## Installation

You'll need NodeJS and NPM, then to install the `jspm-server` command-line utility globally:

	npm install -g jspm-server

## Usage from command line

Run `jspm-server` from your project's directory.

Additional parameters:

* `--no-browser` - suppress automatic web browser launching
* `--quiet` - suppress logging
* `--open=PATH` - launch browser to PATH instead of server root
* `--port=8081` - open with port
* `--proxy=http://localhost:8080` - proxy a running server
* `--only-exts=""` - watch only files with the specified extensions
* `--ignore-exts=""` - exclude files with the specified extensions

## How it works

**Note:** you must have `System.trace = true` set in your HTML or config.js file for live-reloading to work.

You can mark any ES6 file as being live-reloadable by adding the following line:

```js
export let __hotReload = true
```

This is a short hand for exporting `__hotReload` as a named export (the full version is `let __hotReload = true; export { __hotReload };`)

Setting `__hotReload = true` indicates the following:

- This file can be safely reloaded (the new file will be simply executed)
- On reload:
  - if the new file changes its exports (using `===`), the reload event will *propagate*
  - if the new file's exports are equal, the reload will stop

If your file exports something new on each execution (such as a `class`, `function` or nested data structure), setting `__hotReload = true` will cause *all dependents of this file* to be reloaded as well. To override that behaviour, you can declare `__hotReload` as a function:

```js
export function __hotReload() {
  // return true has the same meaning as above - propagate if and when the exports change
  // return false halts propagation
}
```

This function runs directly after the new module is executed, allowing you to clean up any state in this file that is no longer relevant. That might be removing event listeners, canceling any future-scheduled work, that sort of thing.

## Loaders

Loaders can inject a `__hotReload` export by appending to the source in a `fetch`. The [css](https://github.com/geelen/jspm-loader-css) loader does this, so all CSS files are live-reloadable.

## Proxying

When proxying a server, be sure to either start `jspm-server` from your static assets directory, or utilize the root directory argument, e.g. `jspm-server --proxy=http://localhost:8000 --port=8001 public/src`

## Include only extensions

To make `jspm-server` only react to wanted extensions, use the `--only-exts` option. This is useful, for example, while writing Sass, as `jspm-server` will do a hard reload when it encounters an `scss` file.

Usage example: `jspm-server --only-exts=".js, .jsx, .html, .css"`

Note that you do not have to include a space after the delimiting comma. The periods in the extension names are likewise optional.

## Ignore extensions

This is a reverse of the `--only-exts` option. To make `jspm-server` exclude certain extensions from the reloading, use `--ignore-exts=""` and specify the extensions you want to ignore.

Usage example: Usage example: `jspm-server --ignore-exts=".scss, .less"`

The ignore filter is executed before the include filter, so if you specify an identical extension in both filters, it will be excluded.

## Version history

* v0.1.6
  - Supports multiple browsers to be connected and live-reloaded simultaneously.
* v0.1.5
  - Support for `--only-exts` and `--ignore-exts` added. Thanks @danieldunderfelt!
* v0.1.4
  - Proxying support is added. Thanks @kevrom!
* v0.1.3
  - Ensured System.baseURL is taken into consideration.
* **v0.1.0**
  - Changed the format of live-reloading, from requiring the plugin to define a `hotReload` handler to deciding on a per-file basis. Propagation is now far more powerful and predictable. `System.trace = true` is now required.
* v0.0.3
	- Added dependency-tracking, once a file has been live-reloaded, attempt to live-reload all of its dependents.
	  Note: requires `System.trace = true` to be in your project ahead of your initial `System.import` to take effect.
* v0.0.2
	- Added a `html5mode`, where if a `200.html` is present in the root directory, any url that doesn't contain a `.` will serve it instead. Enables single-page apps nicely.
* v0.0.1
	- Forked from v0.7.1 of [live-server](https://github.com/tapio/live-server)

## Development

Friends, come and hack and make things better!

- Check out this project
- `npm install` to fetch the dependencies
- `npm run build` to rebuild the injected file
- `./jspm-server.js` to run your local dev copy

Because the injected file needs to be rebuilt and the server restarted for every change, a useful command is:

```sh
npm run build && ./jspm-server.js ~/path/to/project --no-browser
```

Note: You'll need to hard-refresh (⌘⇧R) your browser for the injected file to be definitely picked up.

## License

Uses MIT licensed code from [live-server](https://github.com/tapio/live-server), [Connect](https://github.com/senchalabs/connect/) and  [Roots](https://github.com/jenius/roots).

(MIT License)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

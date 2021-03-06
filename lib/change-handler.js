import ModuleDiffer from './module-differ'
import url from 'url'

export default class ChangeHandler {
  constructor(System, responder) {
    this.System = System
    this.responder = responder
    this.moduleMap = new Map()
    this.depMap = new Map()
    this.updateModuleMap()
    this.updateDepMap()
  }

  updateModuleMap() {
    let modules = Object.keys(this.System.loads || {})
    if (modules.length != this.moduleMap.size) {
      this.moduleMap.clear()
      modules.forEach(moduleName => {
        let meta = this.System.loads[moduleName].metadata,
          path = this.System.loads[moduleName].address || meta.pluginArgument || meta.loaderArgument || moduleName
        this.moduleMap.set(path, {moduleName, loader: meta.plugin || meta.loaderModule})
      })
    }
  }

  updateDepMap() {
    let modules = Object.keys(this.System.loads || {})
    if (modules.length != this.depMap.size) {
      this.depMap.clear()
      modules.forEach(m => {
        let meta = this.System.loads[m].metadata,
          path = meta.pluginArgument || meta.loaderArgument || m
        this.depMap.set(path, [])
      })
      modules.forEach(m => {
        let deps = this.System.loads[m].depMap
        Object.keys(deps).forEach(dep => {
          let [path, loader] = deps[dep].split('!')
          let map = this.depMap.get(path)
          if (map) map.push(m.split('!')[0])
        })
      })
    }
  }

  fileChanged(_path) {
    this.System.normalize(_path).then(path => {
      // Make sure our knowledge of the modules is up to date
      this.updateModuleMap()
      this.updateDepMap()
      window.moduleMap = this.moduleMap
      window.depMap = this.depMap

      // If the change occurs to a file we don't have a record of
      // e.g. a HTML file, reload the browser window
      if (!this.moduleMap.has(path)) {
        if (this.moduleMap.has(path.replace(/.js$/,''))) {
          path = path.replace(/.js$/,'')
        } else {
          this.reload(path, "Change occurred to a file outside SystemJS loading")
          return
        }
      }

      // Import our existing copy of the file that just changed, to inspect it
      let moduleInfo = this.moduleMap.get(path)
      return this.System.import(moduleInfo.moduleName).then(oldModule => {
        // If __hotReload is false or undefined, bail out immediately
        if (!oldModule.__hotReload) {
          return Promise.reject(`${path} is not hot reloadable!`)
        }

        // Grab the loader if there is one for this file
        let loader = moduleInfo.loader && (moduleInfo.loader.default || moduleInfo.loader)

        // Remove the module from the registry and call import again.
        // The changed file will be fetched and reinterpreted
        this.System.delete(moduleInfo.moduleName)
        this.System.import(moduleInfo.moduleName).then(newModule => {
          this.responder({type: 'good', message: `🔁  Reloaded ${path}`})

          // Now the new module is loaded, we need to handle the old one and
          // potentially propagate the event up the dependency chain.
          let propagateIfNeeded;
          if (oldModule.__hotReload === true) {
            propagateIfNeeded = true;
          } else if (typeof oldModule.__hotReload === "function") {
            propagateIfNeeded = oldModule.__hotReload.call(oldModule, loader, newModule)
          }

          // Propagate if the exports from the old and new module differ, or if we've
          // returned false from our __hotReload handler.
          if (propagateIfNeeded && !ModuleDiffer.shallowEqual(oldModule, newModule)) {
            let deps = this.depMap.get(path)
            if (deps) deps.forEach(dep => this.fileChanged(dep))
          }
        })
      }).catch(reason => this.reload(path, reason))
    })
  }

  reload(path, reason) {
    this.responder({type: 'bad', message: `💥  Change to ${path} cannot be handled gracefully:\n👉  ${reason}`})
    //setTimeout( () => window.location.reload(), 100 )
  }
}

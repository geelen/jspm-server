import ModuleDiffer from './module-differ'
import url from 'url'

export default class ChangeHandler {
  constructor( System ) {
    this.System = System
    this.moduleMap = new Map()
    this.depMap = new Map()
    this.updateModuleMap()
    this.updateDepMap()
  }

  updateModuleMap() {
    let modules = Object.keys( this.System.loads || {} )
    if ( modules.length != this.moduleMap.size ) {
      this.moduleMap.clear()
      modules.forEach( moduleName => {
        let meta = this.System.loads[moduleName].metadata,
          path = meta.pluginArgument || meta.loaderArgument || moduleName
        this.moduleMap.set( path, { moduleName, loader: meta.plugin || meta.loaderModule } )
      } )
    }
  }

  updateDepMap() {
    let modules = Object.keys( this.System.loads || {} )
    if ( modules.length != this.depMap.size ) {
      this.depMap.clear()
      modules.forEach( m => {
        let meta = this.System.loads[m].metadata,
          path = meta.pluginArgument || meta.loaderArgument || m
        this.depMap.set( path, [] )
      } )
      modules.forEach( m => {
        let deps = this.System.loads[m].depMap
        Object.keys( deps ).forEach( dep => {
          let [path, loader] = deps[dep].split( '!' )
          let map = this.depMap.get( path )
          if ( map ) map.push( m.split( '!' )[0] )
        } )
      } )
    }
  }

  fileChanged( _path ) {
    let baseUrlPath = url.parse( System.baseURL ).pathname,
      path = ("/" + _path) // paths don't come with a preceding slash but URLs do
        .replace( new RegExp( "^" + baseUrlPath ), '' ) // match up file paths to System module names
        .replace( /^\//, '' ) // a leading slash may remain in some cases and should be removed
        .replace( /\.js$/, '' ) // .js extensions are implicit in 0.16.x

    // Make sure our knowledge of the modules is up to date
    this.updateModuleMap()
    this.updateDepMap()

    // If the change occurs to a file we don't have a record of
    // e.g. a HTML file, reload the browser window
    if ( !this.moduleMap.has( path ) ) {
      this.reload( path, "Change occurred to a file outside SystemJS loading" )
      return
    }

    // Import our existing copy of the file that just changed, to inspect it
    let moduleInfo = this.moduleMap.get( path )
    this.System.import( moduleInfo.moduleName ).then( oldModule => {
      // If __hotReload is false or undefined, bail out immediately
      if ( !oldModule.__hotReload ) {
        return Promise.reject( `${path} is not hot reloadable!` )
      }

      // Grab the loader if there is one for this file
      let loader = moduleInfo.loader && (moduleInfo.loader.default || moduleInfo.loader)

      // Remove the module from the registry and call import again.
      // The changed file will be fetched and reinterpreted
      this.System.delete( moduleInfo.moduleName )
      this.System.import( moduleInfo.moduleName ).then( newModule => {
        console.log( `Reloaded ${path}` )

        // Now the new module is loaded, we need to handle the old one and
        // potentially propagate the event up the dependency chain.
        let propagateIfNeeded;
        if ( oldModule.__hotReload === true ) {
          propagateIfNeeded = true;
        } else if ( typeof oldModule.__hotReload === "function" ) {
          propagateIfNeeded = oldModule.__hotReload.call( oldModule, loader, newModule )
        }

        // Propagate if the exports from the old and new module differ, or if we've
        // returned false from our __hotReload handler.
        if ( propagateIfNeeded && !ModuleDiffer.shallowEqual( oldModule, newModule ) ) {
          let deps = this.depMap.get( path )
          if ( deps ) deps.forEach( dep => this.fileChanged( dep ) )
        }
      } )
    } ).catch( reason => this.reload( path, reason ) )
  }

  reload( path, reason ) {
    console.info( `Change detected in ${path} that cannot be handled gracefully: ${reason}` )
    setTimeout( () => console.info( `Reloading in 2...` ), 1000 )
    setTimeout( () => console.info( `1...` ), 2000 )
    setTimeout( () => window.location.reload(), 3000 )
  }
}

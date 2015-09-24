import ChangeHandler from './change-handler'

let changeHandler;
export default message => {
  if (message.type == "connected") {
    console.log('JSPM watching enabled!');
  } else if (message.type == "change") {
    // Make sure SystemJS is fully loaded
    if (!changeHandler && window._System && window._System._loader && window._System._loader.loads) {
      console.log("ok smarty")
      changeHandler = new ChangeHandler(window._System)
    }
    if (changeHandler) changeHandler.fileChanged(message.path)
  } else {
    console.error(`Unknown message type! ${JSON.stringify(message)}`)
  }
}

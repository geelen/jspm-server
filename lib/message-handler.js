import ChangeHandler from './change-handler'

let changeHandler;
export default (message, responder) => {
  if (message.type == "connected") {
    responder({type: "good", message: "🤘  Client connected. JSPM watching enabled"})
  } else if (message.type == "change") {
    // Make sure SystemJS is fully loaded
    if (!changeHandler && window.System && window.System._loader && window.System._loader.loads) {
      responder({type: "good", message: "✅  SystemJS loaded. Initialising ChangeHandler"})
      changeHandler = new ChangeHandler(window.System, responder)
    }
    if (changeHandler) {
      changeHandler.fileChanged(message.path)
    } else {
      responder({type: "bad", message: "💥  SystemJS not yet loaded. Ignoring change."})
    }
  } else {
    console.error(`Unknown message type! ${JSON.stringify(message)}`)
  }
}

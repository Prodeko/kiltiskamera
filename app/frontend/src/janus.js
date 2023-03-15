import { Janus } from 'janus-gateway'

Janus.init({
  debug: true,
  // eslint-disable-next-line react-hooks/rules-of-hooks
  dependencies: Janus.useDefaultDependencies(),
  callback: function() {
    console.log("Janus callback")
  }
})

const janus = new Janus({
  server: "http://192.168.164.77:8088/janus",
  success: function() { console.log("JANUS success")},
  error: function() { console.log("JANUS virhe")}
})

export default janus
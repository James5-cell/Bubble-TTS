try {
  importScripts(
    "js/rxjs.umd.min.js",
    "js/defaults.js",
    "js/lang-detect.js",
    "js/gemini-tts.js",
    "js/events.js"
  )
}
catch (err) {
  console.error(err)
}

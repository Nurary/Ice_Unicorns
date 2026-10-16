// ===== Ice Unicorns – értesítések (OneSignal) service workere =====
//
// A meccs előtti push-értesítéseket a OneSignal kézbesíti; ez a fájl az ő
// service workerüket tölti be. Szándékosan külön mappában (/push/onesignal/)
// van, hogy ne akadjon össze az oldal saját sw.js-ével (offline mód), ami a
// gyökérben fut. Az útvonalat NE változtasd meg: a feliratkozott böngészők
// ehhez a címhez kötődnek.
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

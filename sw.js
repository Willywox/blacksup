// =========================================================
// Service worker : permet de jouer sans connexion.
// Quand vous modifiez le site, augmentez le numéro de VERSION
// pour que tous les téléphones récupèrent la nouvelle version.
// =========================================================

const VERSION = "blacksup-v10"

const FICHIERS = [
    "./",
    "./index.html",
    "./regles.html",
    "./CAJOUE.html",
    "./styles.css",
    "./manifest.json",
    "./scripts/animations.js",
    "./scripts/app.js",
    "./scripts/jeu.js",
    "./scripts/passe-mot.js",
    "./scripts/infiltre-paires.js",
    "./scripts/infiltre.js",
    "./scripts/apparence.js",
    "./scripts/mots.js",
    "./scripts/sons.js",
    "./sons/clic.mp3",
    "./sons/tic.mp3",
    "./sons/lancer.mp3",
    "./sons/trouve.mp3",
    "./sons/erreur.mp3",
    "./sons/temps-ecoule.mp3",
    "./sons/fin-manche.mp3",
    "./sons/victoire.mp3",
    "./sons/ambiance.wav",
    "./icones/icone.svg",
    "./icones/icone-192.png",
    "./icones/icone-512.png",
    "./icones/apple-touch-icon.png",
    "./icones/favicon-32.png"
]

// Installation : on met tout le site de côté
self.addEventListener("install", function (e) {
    e.waitUntil(
        caches.open(VERSION)
            .then(function (cache) { return cache.addAll(FICHIERS) })
            .then(function () { return self.skipWaiting() })
    )
})

// Activation : on supprime les anciennes versions
self.addEventListener("activate", function (e) {
    e.waitUntil(
        caches.keys().then(function (cles) {
            return Promise.all(cles.filter(function (c) { return c !== VERSION }).map(function (c) { return caches.delete(c) }))
        }).then(function () { return self.clients.claim() })
    )
})

self.addEventListener("fetch", function (e) {
    const req = e.request
    if (req.method !== "GET") return
    const url = new URL(req.url)

    // Polices Google : on les garde une fois téléchargées
    if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
        e.respondWith(
            caches.open(VERSION).then(function (cache) {
                return cache.match(req).then(function (enCache) {
                    return enCache || fetch(req).then(function (rep) {
                        cache.put(req, rep.clone())
                        return rep
                    })
                })
            })
        )
        return
    }

    if (url.origin !== self.location.origin) return

    // Fichiers du site : le réseau d'abord (pour avoir la dernière version),
    // et la copie gardée de côté si on n'a pas de connexion
    // ou si le réseau est trop lent (plus de 3 secondes).
    e.respondWith(
        caches.match(req, { ignoreSearch: true }).then(function (enCache) {
            const reseau = fetch(req).then(function (rep) {
                if (rep.ok) {
                    const copie = rep.clone()
                    caches.open(VERSION).then(function (cache) { cache.put(req, copie) })
                }
                return rep
            })
            if (!enCache) {
                return reseau.catch(function () { return caches.match("./index.html") })
            }
            const delai = new Promise(function (ok) { setTimeout(function () { ok(enCache) }, 3000) })
            return Promise.race([reseau.catch(function () { return enCache }), delai])
        })
    )
})

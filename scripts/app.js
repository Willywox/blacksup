// =========================================================
// Tout ce qui donne l'impression d'une vraie application :
// - mode hors connexion (service worker)
// - écran qui reste allumé pendant une partie
// - pas de menu « copier » à l'appui long
// - petit message pour ajouter le jeu à l'écran d'accueil
// =========================================================

// ---------- Mode hors connexion ----------
if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").catch(function () {})
    })
}

// ---------- Mode « app installée » ? ----------
const estInstallee = window.navigator.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
if (estInstallee) document.documentElement.classList.add("installee")

// ---------- Pas de menu contextuel à l'appui long (sauf dans les champs texte) ----------
document.addEventListener("contextmenu", function (e) {
    if (!e.target.closest("input, textarea")) e.preventDefault()
})

// ---------- Garder l'écran allumé pendant une partie ----------
let verrouEcran = null
let ecranVoulu = false

async function demanderEcranAllume() {
    if (!("wakeLock" in navigator) || verrouEcran) return
    try {
        verrouEcran = await navigator.wakeLock.request("screen")
        verrouEcran.addEventListener("release", function () { verrouEcran = null })
    } catch (err) { verrouEcran = null }
}

window.garderEcranAllume = function (oui) {
    ecranVoulu = oui
    if (oui) demanderEcranAllume()
    else if (verrouEcran) { verrouEcran.release().catch(function () {}); verrouEcran = null }
}

// Le téléphone relâche le verrou quand on change d'app : on le reprend au retour
document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && ecranVoulu) demanderEcranAllume()
})

// ---------- Message d'aide à l'installation (page d'accueil seulement) ----------
const CLE_AIDE = "blacksup-aide-installation-vue"

function memoire(cle, valeur) {
    try {
        if (valeur === undefined) return localStorage.getItem(cle)
        localStorage.setItem(cle, valeur)
    } catch (e) { return null }
}

function afficherAide(contenu, actionInstaller) {
    if (document.querySelector(".aide-install")) return
    const boite = document.createElement("div")
    boite.className = "aide-install"
    boite.setAttribute("role", "dialog")
    boite.setAttribute("aria-label", "Installer Black's Up!")

    const icone = document.createElement("img")
    icone.src = "icones/apple-touch-icon.png"
    icone.alt = ""
    icone.width = 44
    icone.height = 44

    const texte = document.createElement("p")
    texte.innerHTML = contenu

    const fermer = document.createElement("button")
    fermer.type = "button"
    fermer.className = "aide-fermer"
    fermer.setAttribute("aria-label", "Fermer")
    fermer.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>'

    function cacher() {
        memoire(CLE_AIDE, "1")
        boite.classList.add("part")
        document.body.classList.remove("avec-aide")
        setTimeout(function () { boite.remove() }, 400)
    }
    fermer.addEventListener("click", cacher)

    boite.appendChild(icone)
    boite.appendChild(texte)
    if (actionInstaller) {
        const bouton = document.createElement("button")
        bouton.type = "button"
        bouton.className = "aide-installer"
        bouton.textContent = "Installer"
        bouton.addEventListener("click", function () { actionInstaller(); cacher() })
        boite.appendChild(bouton)
    }
    boite.appendChild(fermer)
    document.body.appendChild(boite)
    document.body.classList.add("avec-aide")
}

// Seulement si on arrive sur l'accueil (pas directement sur les règles ou le jeu)
const surAccueil = !location.hash || location.hash === "#"
const dejaVue = memoire(CLE_AIDE) === "1"

if (surAccueil && !estInstallee && !dejaVue) {
    const ua = navigator.userAgent
    const iOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)

    if (iOS) {
        const partage = '<svg class="icone-partage" width="15" height="18" viewBox="0 0 15 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-label="Partager"><path d="M7.5 1v10M4 4.5L7.5 1 11 4.5"></path><path d="M5 7H2.5A1.5 1.5 0 0 0 1 8.5v7A1.5 1.5 0 0 0 2.5 17h10a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 12.5 7H10"></path></svg>'
        setTimeout(function () {
            afficherAide("<b>Jouez en plein écran&#160;:</b> touchez " + partage + " puis «&#160;Sur l'écran d'accueil&#160;».")
        }, 2200)
    }

    // Android / Chrome : le navigateur propose lui-même l'installation
    window.addEventListener("beforeinstallprompt", function (e) {
        e.preventDefault()
        const invitation = e
        afficherAide("<b>Installez Black's Up!</b> pour jouer en plein écran, même sans réseau.", function () {
            invitation.prompt()
        })
    })
}

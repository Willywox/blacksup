// =========================================================
// APPARENCES — change toute l'esthétique de l'appli
// Les couleurs et polices de chaque apparence sont dans styles.css
// ([data-theme="..."]). Ici : le panneau de choix et la mémoire.
// =========================================================

;(function () {

    const CLE = "blacksup-apparence"
    const APPARENCES = [
        { id: "black",      nom: "Black and Beautiful" },
        { id: "manga",      nom: "Manga" },
        { id: "icespice",   nom: "Ice Spice" },
        { id: "brooklyn",   nom: "Brooklyn" },
        { id: "yeezus",     nom: "Yeezus" },
        { id: "astroworld", nom: "Astroworld" }
    ]

    function actuelle() { return document.documentElement.getAttribute("data-theme") || "black" }

    function lireCouleur(nom) {
        return getComputedStyle(document.documentElement).getPropertyValue("--" + nom).trim()
    }

    // La barre du téléphone (en haut) prend la couleur de fond de l'apparence
    function majBarre() {
        const meta = document.getElementById("couleur-barre")
        if (meta) meta.setAttribute("content", lireCouleur("fond") || "#0E0D0C")
    }

    function appliquer(id, anime) {
        const racine = document.documentElement
        if (anime && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            racine.classList.add("change-apparence")
            clearTimeout(appliquer.minuterie)
            appliquer.minuterie = setTimeout(function () { racine.classList.remove("change-apparence") }, 600)
        }
        if (id === "black") racine.removeAttribute("data-theme")
        else racine.setAttribute("data-theme", id)
        try { localStorage.setItem(CLE, id) } catch (e) {}
        majBarre()
        document.querySelectorAll(".apercu-theme").forEach(function (b) {
            b.setAttribute("aria-pressed", b.dataset.choix === id ? "true" : "false")
        })
    }

    // ---------- Le panneau ----------
    function construireGrille() {
        const grille = document.getElementById("grille-apparences")
        grille.textContent = ""
        APPARENCES.forEach(function (a, k) {
            const b = document.createElement("button")
            b.type = "button"
            b.className = "apercu-theme"
            b.dataset.choix = a.id
            b.setAttribute("data-theme", a.id)      // la carte s'affiche avec les couleurs de son apparence
            b.setAttribute("aria-pressed", a.id === actuelle() ? "true" : "false")
            b.style.animationDelay = (0.12 + k * 0.05) + "s"
            b.innerHTML =
                '<span class="apercu-coche" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg></span>' +
                '<span class="apercu-aa" aria-hidden="true">Aa!</span>' +
                '<span class="apercu-nom"></span>' +
                '<span class="apercu-pastilles" aria-hidden="true"><i style="background: var(--or)"></i><i style="background: var(--corail)"></i><span class="apercu-bouton"></span></span>'
            b.querySelector(".apercu-nom").textContent = a.nom
            b.addEventListener("click", function () { appliquer(a.id, true) })
            grille.appendChild(b)
        })
    }

    function ouvrir() {
        construireGrille()
        const p = document.getElementById("apparence")
        p.classList.remove("part")
        p.hidden = false
        const choisie = p.querySelector('.apercu-theme[aria-pressed="true"]')
        if (choisie) choisie.focus({ preventScroll: true })
    }

    function fermer() {
        const p = document.getElementById("apparence")
        if (p.hidden) return
        p.classList.add("part")
        setTimeout(function () { p.hidden = true; p.classList.remove("part") }, 230)
        const b = document.getElementById("btn-apparence")
        if (b) b.focus({ preventScroll: true })
    }

    document.getElementById("btn-apparence").addEventListener("click", ouvrir)
    document.getElementById("apparence-fermer").addEventListener("click", fermer)
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") fermer() })
    // Quitter l'accueil (bouton retour...) ferme le panneau
    window.addEventListener("hashchange", fermer)

    majBarre()
})()

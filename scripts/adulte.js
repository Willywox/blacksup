// =========================================================
// MODE ADULTE (18+) — le passage secret
//
// Sur l'accueil uniquement : 5 appuis rapides sur le haut-parleur.
// Une fenêtre demande si l'on a 18 ans ou plus.
// Le mode n'est jamais mémorisé : chaque ouverture de l'appli repart en mode normal.
// =========================================================

;(function () {

    const APPUIS_NECESSAIRES = 5
    const ECART_MAX = 700        // ms entre deux appuis
    let appuis = []

    function surAccueil() {
        const accueil = document.getElementById("ecran-accueil")
        return accueil && accueil.classList.contains("actif")
    }

    // Compte les appuis rapides sur le haut-parleur.
    // Écoute en « capture » : on compte avant que le bouton ne redessine son icône
    // (sinon l'élément touché a déjà disparu et l'appui n'est pas reconnu).
    document.addEventListener("click", function (e) {
        if (!e.target.closest(".btn-son") || !surAccueil() || modeAdulte) return
        const t = performance.now()
        if (appuis.length && t - appuis[appuis.length - 1] > ECART_MAX) appuis = []
        appuis.push(t)
        if (appuis.length >= APPUIS_NECESSAIRES) {
            appuis = []
            // 5 appuis = le son a basculé 5 fois : on le remet comme avant
            if (typeof Sons !== "undefined") Sons.basculerMuet()
            setTimeout(ouvrir, 150)
        }
    }, true)

    function ouvrir() {
        const f = document.getElementById("adulte")
        f.classList.remove("part")
        f.hidden = false
        document.getElementById("adulte-non").focus({ preventScroll: true })
    }

    function fermer() {
        const f = document.getElementById("adulte")
        if (f.hidden) return
        f.classList.add("part")
        setTimeout(function () { f.hidden = true; f.classList.remove("part") }, 230)
    }

    function activer() {
        modeAdulte = true
        document.documentElement.classList.add("mode-adulte")
        document.getElementById("accueil-surtitre").textContent = "Strictement 18+"
        fermer()
    }

    function desactiver() {
        modeAdulte = false
        document.documentElement.classList.remove("mode-adulte")
        document.getElementById("accueil-surtitre").textContent = "Tiens tiens tiens..."
    }

    document.getElementById("adulte-oui").addEventListener("click", activer)
    document.getElementById("adulte-non").addEventListener("click", fermer)
    document.getElementById("quitter-adulte").addEventListener("click", desactiver)
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") fermer() })
})()

// =========================================================
// Outils communs aux jeux « chacun pour soi » : liste de joueurs en puces,
// carte secrète à maintenir appuyée, classement individuel.
// Utilise $, son, animer, iconeCroix, memoire (jeu.js)
// =========================================================

function listeJoueurs(o) {
    // o : { puces, champ, bouton, aide, min, max, cle, auChangement }
    function noms() {
        return Array.from(o.puces.querySelectorAll(".puce-texte")).map(function (t) { return t.textContent })
    }
    function aide(texte, alerte) {
        o.aide.textContent = texte
        o.aide.classList.toggle("alerte", !!alerte)
    }
    function maj() {
        const n = noms().length
        if (n < o.min) aide("Il faut au moins " + o.min + " joueurs (encore " + (o.min - n) + ").", false)
        else aide(n + " joueurs, c'est parti quand vous voulez.", false)
        if (o.auChangement) o.auChangement(n)
    }
    function sauver() {
        let r = {}
        try { r = JSON.parse(memoire(o.cle) || "{}") || {} } catch (e) { r = {} }
        r.joueurs = noms()
        memoire(o.cle, JSON.stringify(r))
    }
    function ajouter(nom, anime) {
        nom = String(nom || "").trim().slice(0, 15)
        if (!nom) return false
        const existants = noms().map(function (n) { return n.toLowerCase() })
        if (existants.length >= o.max) { aide(o.max + " joueurs maximum.", true); return false }
        if (existants.indexOf(nom.toLowerCase()) !== -1) { aide("« " + nom + " » est déjà dans la liste.", true); return false }
        const puce = document.createElement("span")
        puce.className = "puce"
        const texte = document.createElement("span")
        texte.className = "puce-texte"
        texte.textContent = nom
        const retirer = document.createElement("button")
        retirer.type = "button"
        retirer.className = "puce-retirer"
        retirer.setAttribute("aria-label", "Retirer " + nom)
        retirer.innerHTML = iconeCroix(12)
        retirer.addEventListener("click", function () {
            son("clic")
            animer(puce, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.8)" }],
                { duration: 180, easing: "ease-in" }).then(function () { puce.remove(); maj(); sauver() })
        })
        puce.appendChild(texte)
        puce.appendChild(retirer)
        o.puces.appendChild(puce)
        if (anime) animer(puce, [{ opacity: 0, transform: "scale(.7)" }, { opacity: 1, transform: "none" }],
            { duration: 320, easing: "cubic-bezier(.34,1.56,.64,1)" })
        maj()
        return true
    }
    function valider() {
        if (ajouter(o.champ.value, true)) { son("clic"); o.champ.value = ""; sauver() }
        o.champ.focus({ preventScroll: true })
    }
    o.bouton.addEventListener("click", valider)
    o.champ.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); valider() } })

    // Joueurs sauvegardés, sinon ceux du dernier autre jeu
    const CLES = [o.cle, "blacksup-songs-up", "blacksup-mytho", "blacksup-dieux", "blacksup-infiltre"]
    function remplir() {
        let liste = null
        CLES.some(function (cle) {
            try {
                const r = JSON.parse(memoire(cle) || "null")
                if (r && Array.isArray(r.joueurs) && r.joueurs.length) { liste = r.joueurs; return true }
            } catch (e) {}
            return false
        })
        ;(liste || []).slice(0, o.max).forEach(function (n) { ajouter(n, false) })
        maj()
    }
    remplir()
    // En arrivant sur l'écran avec une liste vide, on reprend les joueurs d'un autre jeu
    const ecran = o.puces.closest(".ecran")
    if (ecran) new MutationObserver(function () {
        if (ecran.classList.contains("actif") && !noms().length) remplir()
    }).observe(ecran, { attributes: true, attributeFilter: ["class"] })

    return { noms: noms, sauver: sauver }
}

// Carte à maintenir appuyée : visible tant qu'on appuie ; auVu() après la première fois
function carteAMaintenir(carte, auVu) {
    function montrer(e) {
        if (e) e.preventDefault()
        if (!carte.classList.contains("visible")) son("clic")
        carte.classList.add("visible")
    }
    function cacher() {
        if (carte.classList.contains("visible")) { carte.classList.add("vu"); if (auVu) auVu() }
        carte.classList.remove("visible")
    }
    carte.addEventListener("pointerdown", montrer)
    carte.addEventListener("pointerup", cacher)
    carte.addEventListener("pointerleave", cacher)
    carte.addEventListener("pointercancel", cacher)
    carte.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "Enter") montrer(e) })
    carte.addEventListener("keyup", cacher)
    carte.addEventListener("blur", cacher)
}

// Classement individuel : joueurs = [{ nom, points, detail }]
function rendreClassementJoueurs(ol, joueurs, mettreEnAvant) {
    ol.textContent = ""
    const ordre = joueurs.map(function (_, i) { return i })
        .sort(function (a, b) { return joueurs[b].points - joueurs[a].points || a - b })
    const rangs = []
    ordre.forEach(function (i, pos) {
        rangs[i] = pos > 0 && joueurs[i].points === joueurs[ordre[pos - 1]].points ? rangs[ordre[pos - 1]] : pos + 1
    })
    ordre.forEach(function (i) {
        const j = joueurs[i]
        const li = document.createElement("li")
        li.className = "carte-equipe" + (rangs[i] === 1 && j.points > 0 ? " premier" : "")
        if (mettreEnAvant && rangs[i] === 1) li.classList.add("vainqueur")
        const rang = document.createElement("p"); rang.className = "rang"; rang.textContent = rangs[i]
        const milieu = document.createElement("div"); milieu.style.minWidth = "0"
        const nom = document.createElement("p"); nom.className = "nom"; nom.textContent = j.nom
        milieu.appendChild(nom)
        if (j.detail) { const d = document.createElement("p"); d.className = "detail"; d.textContent = j.detail; milieu.appendChild(d) }
        const tot = document.createElement("p"); tot.className = "total"; tot.textContent = j.points
        li.appendChild(rang); li.appendChild(milieu); li.appendChild(tot)
        ol.appendChild(li)
    })
    return ordre.filter(function (i) { return rangs[i] === 1 })
}

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

    function remplacer(liste) {
        o.puces.textContent = ""
        liste.slice(0, o.max).forEach(function (n) { ajouter(n, false) })
        maj(); sauver()
    }

    function ajouterUn(nom) { if (ajouter(nom, true)) sauver() }

    return { noms: noms, sauver: sauver, remplacer: remplacer, ajouter: ajouterUn }
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

// En ligne : scores individuels triés, avec rang (égalités comprises)
function scoresIndividuels(joueurs) {
    const l = joueurs.map(function (j) { return { nom: j.nom, points: j.points } }).sort(function (a, b) { return b.points - a.points })
    let rang = 0, prec = null
    l.forEach(function (x, i) { if (x.points !== prec) { rang = i + 1; prec = x.points } x.rang = rang; x.premier = rang === 1 && x.points > 0 })
    return l
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

// =========================================================
// EN LIGNE — outils partagés par L'Infiltré et Les Dieux
// =========================================================

// Écran « qui a vu son mot / son rôle » : une coche par joueur, l'hôte lance quand tout le monde a vu
function suiviVus(o) {
    // o : { prefixe: "inf" | "dx", quoi: "son mot" | "son rôle", suite: fn }
    const st = { joueurs: [], vus: {}, partie: 0 }
    function tousVus() { return st.joueurs.every(function (n) { return st.vus[n] }) }
    function rendre() {
        const ul = $(o.prefixe + "-vus-liste")
        ul.textContent = ""
        st.joueurs.forEach(function (n) {
            const li = document.createElement("li")
            li.className = st.vus[n] ? "vu" : ""
            const c = document.createElement("span"); c.className = "vus-coche"; c.setAttribute("aria-hidden", "true")
            c.innerHTML = st.vus[n] ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>' : ""
            li.appendChild(c)
            li.appendChild(document.createTextNode(n))
            const etat = document.createElement("small")
            etat.textContent = st.vus[n] ? "a vu " + o.quoi : "regarde " + o.quoi + "…"
            li.appendChild(etat)
            ul.appendChild(li)
        })
        const manque = st.joueurs.filter(function (n) { return !st.vus[n] }).length
        const b = $(o.prefixe + "-vus-ok")
        b.disabled = manque > 0
        b.textContent = manque ? "En attente de " + manque + (manque > 1 ? " joueurs" : " joueur") : "Tout le monde a vu, on lance !"
        $(o.prefixe + "-vus-forcer").hidden = manque === 0
    }
    $(o.prefixe + "-vus-ok").addEventListener("click", function () { if (tousVus()) o.suite() })
    $(o.prefixe + "-vus-forcer").addEventListener("click", function () {
        if (this.classList.contains("confirmer")) { this.classList.remove("confirmer"); o.suite(); return }
        this.classList.add("confirmer"); this.textContent = "Toucher encore pour lancer sans attendre"
        const b = this
        setTimeout(function () { b.classList.remove("confirmer"); b.textContent = "Lancer sans attendre" }, 3000)
    })
    return {
        // joueurs : tous ; dejaVus : ceux qui ont vu sur le téléphone de l'hôte
        ouvrir: function (joueurs, dejaVus) {
            st.joueurs = joueurs.slice()
            st.vus = {}
            st.partie = Date.now() % 100000000
            ;(dejaVus || []).forEach(function (n) { st.vus[n] = true })
            $(o.prefixe + "-vus-forcer").textContent = "Lancer sans attendre"
            rendre()
            afficher("ecran-" + o.prefixe + "-vus")
        },
        recevoir: function (de, donnees) {
            if (!donnees || donnees.partie !== st.partie) return
            const nom = st.joueurs.filter(function (n) { return n.toLowerCase() === String(de).toLowerCase() })[0]
            if (!nom || st.vus[nom]) return
            st.vus[nom] = true
            son("clic")
            rendre()
            if (window.diffuserJeu) diffuserJeu()
        },
        public: function () { return { partie: st.partie, vus: st.joueurs.filter(function (n) { return st.vus[n] }), joueurs: st.joueurs } }
    }
}

// Vote d'élimination sur les téléphones : chacun vote quand il veut (définitif),
// les joueurs sans téléphone votent sur celui de l'hôte, l'appli élimine le plus voté
function voteEnLigne(o) {
    // o : { conteneur, bouton, forcer, vivants: fn -> [noms], surResultat: fn(nom, decompte) }
    const st = { votes: {}, candidats: null, etape: 1, cle: null, message: "", votantLocal: null, choixLocal: null, historique: [], tour: 0 }
    function vivants() { return o.vivants() }
    function candidats() { return st.candidats || vivants() }
    function trouver(liste, nom) { return liste.filter(function (n) { return n.toLowerCase() === String(nom).toLowerCase() })[0] }
    function actif() { return !!(window.Salle && Salle.actif() && vivants().some(estEnLigne)) }
    function manquants() { return vivants().filter(function (n) { return !st.votes[n] }) }
    function nouveauTour(cle) {
        if (st.cle === cle) return
        st.cle = cle; st.votes = {}; st.candidats = null; st.etape++; st.message = ""; st.votantLocal = null
    }
    function voter(votant, pour) {
        const v = trouver(vivants(), votant), p = trouver(candidats(), pour)
        if (!v || !p || v === p || st.votes[v]) return false
        st.votes[v] = p
        son("clic")
        if (o.conteneur.isConnected) rendre()
        if (o.surChangement) o.surChangement()
        if (window.diffuserJeu) diffuserJeu()
        return true
    }
    function decompte() {
        const c = {}
        Object.keys(st.votes).forEach(function (v) { c[st.votes[v]] = (c[st.votes[v]] || 0) + 1 })
        return Object.keys(c).sort(function (a, b) { return c[b] - c[a] }).map(function (n) { return { nom: n, voix: c[n] } })
    }
    function reveler() {
        const d = decompte()
        if (!d.length) return
        const max = d[0].voix
        const ex = d.filter(function (x) { return x.voix === max }).map(function (x) { return x.nom })
        if (ex.length > 1) {
            st.historique.push({ tour: st.cle, votes: Object.assign({}, st.votes), elimine: null, egalite: ex.slice() })
            st.message = "Égalité entre " + ex.join(" et ") + " : nouveau vote, seulement entre eux !"
            st.candidats = ex; st.votes = {}; st.etape++; st.votantLocal = null
            son("erreur")
            rendre()
            if (window.diffuserJeu) diffuserJeu()
            return
        }
        st.dernierDecompte = d
        st.historique.push({ tour: st.cle, votes: Object.assign({}, st.votes), elimine: ex[0], egalite: null })
        o.surResultat(ex[0], d)
    }
    function texteDecompte(d) { return (d || []).map(function (x) { return x.nom + " " + x.voix }).join(" · ") }
    function rendre() {
        const c = o.conteneur
        c.textContent = ""
        if (st.message) { const m = document.createElement("p"); m.className = "vote-message"; m.textContent = st.message; c.appendChild(m) }
        if (st.votantLocal) {
            // Un joueur sans téléphone vote ici
            const t = document.createElement("p"); t.className = "consigne"; t.innerHTML = "<b>" + st.votantLocal + "</b>, pour qui votes-tu ? (définitif)"
            c.appendChild(t)
            const g = document.createElement("div"); g.className = "grille-vote"
            candidats().filter(function (n) { return n !== st.votantLocal }).forEach(function (n) {
                const b = document.createElement("button"); b.type = "button"; b.className = "choix-vote"; b.textContent = n
                b.setAttribute("aria-pressed", st.choixLocal === n ? "true" : "false")
                b.addEventListener("click", function () { st.choixLocal = n; rendre() })
                g.appendChild(b)
            })
            c.appendChild(g)
            const ok = document.createElement("button"); ok.type = "button"; ok.className = "btn btn-or"
            ok.disabled = !st.choixLocal
            ok.textContent = st.choixLocal ? "Voter pour " + st.choixLocal : "Choisis un joueur"
            ok.addEventListener("click", function () { const v = st.votantLocal; st.votantLocal = null; voter(v, st.choixLocal); st.choixLocal = null; rendre() })
            const an = document.createElement("button"); an.type = "button"; an.className = "lien-discret"; an.textContent = "Annuler"
            an.style.cssText = "background:none;border:0;cursor:pointer"
            an.addEventListener("click", function () { st.votantLocal = null; st.choixLocal = null; rendre() })
            c.appendChild(ok); c.appendChild(an)
        } else {
            const ul = document.createElement("ul"); ul.className = "vus-liste"
            vivants().forEach(function (n) {
                const li = document.createElement("li"); li.className = st.votes[n] ? "vu" : ""
                const k = document.createElement("span"); k.className = "vus-coche"
                k.innerHTML = st.votes[n] ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>' : ""
                li.appendChild(k); li.appendChild(document.createTextNode(n))
                if (st.votes[n]) { const s = document.createElement("small"); s.textContent = "a voté"; li.appendChild(s) }
                else if (estEnLigne(n)) { const s = document.createElement("small"); s.textContent = "vote sur son téléphone…"; li.appendChild(s) }
                else if (window.Salle && Salle.statut && Salle.statut(n) === "horsligne") {
                    const s = document.createElement("small"); s.className = "hors-ligne"; s.textContent = "téléphone en veille · "
                    const b = document.createElement("button"); b.type = "button"; b.className = "so-bandeau-btn"; b.textContent = "Voter ici"
                    b.addEventListener("click", function () { st.votantLocal = n; st.choixLocal = null; rendre() })
                    li.appendChild(s); li.appendChild(b)
                }
                else {
                    const b = document.createElement("button"); b.type = "button"; b.className = "so-bandeau-btn"; b.textContent = "Voter ici"
                    b.addEventListener("click", function () { st.votantLocal = n; st.choixLocal = null; rendre() })
                    li.appendChild(b)
                }
                ul.appendChild(li)
            })
            c.appendChild(ul)
        }
        const manque = manquants().length
        o.bouton.disabled = manque > 0
        o.bouton.textContent = manque ? "En attente de " + manque + (manque > 1 ? " votes" : " vote") : "Révéler le résultat"
        o.forcer.hidden = manque === 0 || !Object.keys(st.votes).length
    }
    o.bouton.addEventListener("click", function () { if (actif() && !manquants().length) reveler() })
    o.forcer.addEventListener("click", function () {
        if (this.classList.contains("confirmer")) { this.classList.remove("confirmer"); reveler(); return }
        this.classList.add("confirmer"); this.textContent = "Toucher encore : révéler avec les votes reçus"
        const b = this
        setTimeout(function () { b.classList.remove("confirmer"); b.textContent = "Révéler sans attendre" }, 3000)
    })
    return {
        actif: actif,
        nouveauTour: nouveauTour,
        rendre: rendre,
        recevoir: function (de, donnees) { if (donnees && donnees.etape === st.etape) voter(de, donnees.pour) },
        compte: function () { return Object.keys(st.votes).length + " / " + vivants().length },
        texteDecompte: texteDecompte,
        public: function () {
            return { etape: st.etape, candidats: candidats(), votants: Object.keys(st.votes), message: st.message, decompte: st.dernierDecompte ? texteDecompte(st.dernierDecompte) : null }
        },
        oublierDecompte: function () { st.dernierDecompte = null },
        nouvellePartie: function () { st.historique = []; st.cle = null },
        // Les coulisses : qui a voté contre qui, et qui a bien voté (camp : fn(nom) -> "A" | "B", libelle : fn(nom) -> rôle)
        coulisses: function (camp, libelle) {
            if (!st.historique.length) return null
            const tours = [], stats = {}
            let numero = 0, derniereCle = null
            st.historique.forEach(function (h) {
                if (h.tour !== derniereCle) { numero++; derniereCle = h.tour }
                const votes = Object.keys(h.votes).map(function (de) {
                    const pour = h.votes[de]
                    const bon = camp(de) !== camp(pour)
                    stats[de] = stats[de] || { nom: de, bons: 0, total: 0, contreCamp: 0 }
                    stats[de].total++
                    if (bon) stats[de].bons++; else stats[de].contreCamp++
                    return { de: de, pour: pour, bon: bon }
                })
                tours.push({ titre: "Tour " + numero + (h.egalite ? " · égalité" : ""), elimine: h.elimine ? h.elimine + " (" + libelle(h.elimine) + ")" : "Égalité entre " + h.egalite.join(" et "), votes: votes })
            })
            const bilan = Object.keys(stats).map(function (n) { return stats[n] }).sort(function (a, b) { return (b.bons / b.total) - (a.bons / a.total) || b.bons - a.bons })
            bilan.forEach(function (b) {
                const cache = camp(b.nom) === "B"   // infiltrés, Mister White, dieux
                if (b.contreCamp === 0) b.verdict = cache ? "Stratège" : "Flair de détective"
                else if (b.bons === 0) b.verdict = cache ? "A vendu les siens" : "Traître malgré lui"
                else b.verdict = b.contreCamp > b.bons ? "Complètement perdu" : "Pas mal"
            })
            return { tours: tours, bilan: bilan }
        }
    }
}

// Affiche « les coulisses du vote » (fin de L'Infiltré / des Dieux)
function rendreCoulisses(boite, c) {
    boite.textContent = ""
    boite.hidden = !c
    if (!c) return
    const t = document.createElement("p"); t.className = "etiquette"; t.textContent = "Les coulisses du vote"
    boite.appendChild(t)
    c.tours.forEach(function (tour) {
        const d = document.createElement("div"); d.className = "coulisses-tour"
        const h = document.createElement("p"); h.className = "coulisses-titre"; h.innerHTML = "<b></b> · <span></span>"
        h.querySelector("b").textContent = tour.titre; h.querySelector("span").textContent = tour.elimine
        d.appendChild(h)
        const ul = document.createElement("ul"); ul.className = "coulisses-votes"
        tour.votes.forEach(function (v) {
            const li = document.createElement("li"); li.className = v.bon ? "bon" : "rate"
            li.textContent = v.de + " → " + v.pour
            ul.appendChild(li)
        })
        d.appendChild(ul)
        boite.appendChild(d)
    })
    const ul = document.createElement("ul"); ul.className = "coulisses-bilan"
    c.bilan.forEach(function (b) {
        const li = document.createElement("li")
        const n = document.createElement("span"); n.className = "coulisses-nom"; n.textContent = b.nom
        const v = document.createElement("span"); v.className = "coulisses-verdict"; v.textContent = b.verdict
        const s = document.createElement("span"); s.className = "coulisses-score"; s.textContent = b.bons + " / " + b.total + " bons votes" + (b.contreCamp ? " · " + b.contreCamp + " contre son camp" : "")
        li.appendChild(n); li.appendChild(v); li.appendChild(s)
        ul.appendChild(li)
    })
    boite.appendChild(ul)
}

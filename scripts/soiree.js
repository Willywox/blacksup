// =========================================================
// MODE SOIRÉE — on enchaîne les jeux, chaque jeu rapporte des points GOAT,
// des titres sont décernés, puis vote du GOAT du cœur et cérémonie.
//
// Les jeux déclarent JEUX_SOIREE[id].remplir(...) et appellent finSoiree(...)
// (voir jeu.js). Ici : l'état de la soirée, ses écrans, l'historique.
// =========================================================

;(function () {

    const CLE_SOIREE = "blacksup-soiree"
    const CLE_HISTO = "blacksup-soirees"
    const JOUEURS_MIN = 3, JOUEURS_MAX = 16
    const HISTO_MAX = 15

    const JEUX = [
        { id: "blacksup",    nom: "Black's Up",   route: "#jouer",       ecran: "ecran-parametres", min: 4, max: 60, equipes: true },
        { id: "passe-mot",   nom: "Passe-Mot",    route: "#passe-mot",   ecran: "ecran-pm-config",  min: 4, max: 60, equipes: true },
        { id: "infiltre",    nom: "L'Infiltré",   route: "#infiltre",    ecran: "ecran-inf-config", min: 4, max: 12 },
        { id: "crea-mime",   nom: "Créa'Mime",    route: "#crea-mime",   ecran: "ecran-cm-config",  min: 4, max: 20, equipes: true },
        { id: "dieux",       nom: "Les Dieux",    route: "#dieux",       ecran: "ecran-dx-config",  min: 5, max: 16 },
        { id: "songs-up",    nom: "Songs Up",     route: "#songs-up",    ecran: "ecran-su-config",  min: 3, max: 12 },
        { id: "mytho",       nom: "Le Mytho",     route: "#mytho",       ecran: "ecran-my-config",  min: 3, max: 12 },
        { id: "qui-de-nous", nom: "Qui de nous ?", route: "#qui-de-nous", ecran: "ecran-qdn-jeu",   min: 1, max: 99, entracte: true }
    ]
    function infoJeu(id) { return JEUX.filter(function (j) { return j.id === id })[0] }

    let S = null            // la soirée en cours
    let bilanCourant = null // la soirée affichée dans le bilan

    // ---------- Sauvegarde ----------
    function charger() {
        try { S = JSON.parse(localStorage.getItem(CLE_SOIREE) || "null") } catch (e) { S = null }
        if (S && (!Array.isArray(S.joueurs) || S.terminee)) S = null
    }
    function sauver() {
        try {
            if (S) localStorage.setItem(CLE_SOIREE, JSON.stringify(S))
            else localStorage.removeItem(CLE_SOIREE)
        } catch (e) {}
        majAmbiance()
    }
    function historique() {
        try { const h = JSON.parse(localStorage.getItem(CLE_HISTO) || "[]"); return Array.isArray(h) ? h : [] } catch (e) { return [] }
    }
    function sauverHistorique(h) {
        h = h.slice(0, HISTO_MAX)
        for (let essai = 0; essai < 4; essai++) {
            try { localStorage.setItem(CLE_HISTO, JSON.stringify(h)); return } catch (e) {
                // Mémoire pleine : on retire les photos des plus anciennes soirées
                const garder = [5, 2, 0][essai] || 0
                h.forEach(function (s, i) { if (i >= garder) s.joueurs.forEach(function (j) { delete j.photo }) })
            }
        }
    }

    function enCours() { return !!S && !S.terminee }
    function joueur(nom) {
        if (!S || !nom) return null
        const n = String(nom).trim().toLowerCase()
        return S.joueurs.filter(function (j) { return j.nom.toLowerCase() === n })[0] || null
    }
    function noms() { return S.joueurs.map(function (j) { return j.nom }) }

    window.Soiree = { enCours: enCours, finDeJeu: finDeJeu }

    // ---------- Ambiance festive ----------
    function majAmbiance() {
        document.documentElement.classList.toggle("mode-soiree", enCours())
        const sur = $("carte-soiree-sur"), titre = $("carte-soiree-titre"), desc = $("carte-soiree-desc")
        if (enCours()) {
            const tete = classement(S.joueurs)[0]
            sur.textContent = "Soirée en cours"
            titre.textContent = "Reprendre la soirée"
            desc.textContent = S.joueurs.length + " joueurs · " + S.jeux.length + (S.jeux.length > 1 ? " jeux joués" : " jeu joué") +
                (tete && tete.points > 0 ? " · en tête : " + tete.nom : "")
        } else {
            sur.textContent = "Mode soirée"
            titre.textContent = "Qui sera le GOAT ?"
            desc.textContent = "Enchaînez les jeux, cumulez les points, couronnez le GOAT de la soirée."
        }
        $("lien-historique").hidden = historique().length === 0
    }
    $("carte-soiree").addEventListener("click", function () {
        location.hash = enCours() ? "#soiree" : "#soiree-joueurs"
    })

    // ---------- Avatars ----------
    function avatar(j, classe) {
        const a = document.createElement("span")
        a.className = "avatar" + (classe ? " " + classe : "")
        if (j && j.photo) {
            const img = document.createElement("img")
            img.src = j.photo
            img.alt = ""
            a.appendChild(img)
        } else {
            a.textContent = j && j.nom ? j.nom.charAt(0).toUpperCase() : "?"
        }
        return a
    }
    function avatars(liste, classe) {
        const g = document.createElement("span")
        g.className = "avatars" + (liste.length > 1 ? " plusieurs" : "")
        liste.slice(0, 5).forEach(function (j) { g.appendChild(avatar(j, classe)) })
        return g
    }
    function listeNoms(l) {
        return l.length > 1 ? l.slice(0, -1).join(", ") + " et " + l[l.length - 1] : (l[0] || "")
    }

    // Photo carrée, compressée (pour tenir dans la mémoire du téléphone)
    function lirePhoto(fichier) {
        return new Promise(function (ok, ko) {
            const url = URL.createObjectURL(fichier)
            const img = new Image()
            img.onload = function () {
                const T = 160
                const c = document.createElement("canvas")
                c.width = c.height = T
                const cote = Math.min(img.naturalWidth, img.naturalHeight)
                c.getContext("2d").drawImage(img, (img.naturalWidth - cote) / 2, (img.naturalHeight - cote) / 2, cote, cote, 0, 0, T, T)
                URL.revokeObjectURL(url)
                ok(c.toDataURL("image/jpeg", .74))
            }
            img.onerror = function () { URL.revokeObjectURL(url); ko() }
            img.src = url
        })
    }

    // ---------- Écran des joueurs ----------
    let brouillon = []        // [{ nom, photo }]
    let photoNouveau = null
    let cible = null          // index du joueur dont on prend la photo, ou "nouveau"

    function preparerJoueurs() {
        brouillon = S ? S.joueurs.map(function (j) { return { nom: j.nom, photo: j.photo || null } }) : []
        photoNouveau = null
        majPhotoNouveau()
        $("so-lancer").textContent = S ? "Retour à la soirée" : "Lancer la soirée"
        rendreJoueurs()
    }
    function aideJ(texte, alerte) { const a = $("so-aide"); a.textContent = texte; a.classList.toggle("alerte", !!alerte) }
    function rendreJoueurs() {
        const ul = $("so-joueurs")
        ul.textContent = ""
        brouillon.forEach(function (j, i) {
            const li = document.createElement("li")
            const b = document.createElement("button")
            b.type = "button"
            b.className = "so-photo-btn"
            b.dataset.son = "aucun"
            b.setAttribute("aria-label", "Photo de " + j.nom)
            b.appendChild(avatar(j, "avatar-moyen"))
            const badge = document.createElement("span"); badge.className = "so-badge-apn"; badge.setAttribute("aria-hidden", "true")
            badge.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"></path><circle cx="12" cy="13" r="3.5"></circle></svg>'
            b.appendChild(badge)
            b.addEventListener("click", function () { cible = i; $("so-fichier").click() })
            const nom = document.createElement("span"); nom.className = "so-nom"; nom.textContent = j.nom
            const pts = S && joueur(j.nom) ? joueur(j.nom).points : null
            const r = document.createElement("button")
            r.type = "button"; r.className = "puce-retirer"; r.setAttribute("aria-label", "Retirer " + j.nom)
            r.innerHTML = iconeCroix(14)
            r.addEventListener("click", function () { son("clic"); brouillon.splice(i, 1); rendreJoueurs() })
            li.appendChild(b); li.appendChild(nom)
            if (pts) { const p = document.createElement("span"); p.className = "so-pts-mini"; p.textContent = pts + " pts"; li.appendChild(p) }
            li.appendChild(r)
            ul.appendChild(li)
        })
        const n = brouillon.length
        if (n < JOUEURS_MIN) aideJ("Il faut au moins " + JOUEURS_MIN + " joueurs (encore " + (JOUEURS_MIN - n) + ").")
        else aideJ(n + " joueurs. Que le meilleur gagne.")
        $("so-lancer").disabled = n < JOUEURS_MIN
    }
    function majPhotoNouveau() {
        const b = $("so-photo-nouveau")
        if (photoNouveau) { b.innerHTML = ""; const img = document.createElement("img"); img.src = photoNouveau; img.alt = ""; b.appendChild(img); b.classList.add("a-photo") }
        else if (b.classList.contains("a-photo")) {
            b.classList.remove("a-photo")
            b.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"></path><circle cx="12" cy="13" r="3.5"></circle></svg>'
        }
    }
    function ajouterBrouillon() {
        const champ = $("so-champ")
        const nom = champ.value.trim().slice(0, 15)
        if (!nom) return
        if (brouillon.length >= JOUEURS_MAX) { aideJ(JOUEURS_MAX + " joueurs maximum.", true); return }
        if (brouillon.some(function (j) { return j.nom.toLowerCase() === nom.toLowerCase() })) { aideJ("« " + nom + " » est déjà là.", true); return }
        son("clic")
        brouillon.push({ nom: nom, photo: photoNouveau })
        photoNouveau = null
        majPhotoNouveau()
        champ.value = ""
        rendreJoueurs()
        const dernier = $("so-joueurs").lastElementChild
        if (dernier) animer(dernier, [{ opacity: 0, transform: "translateY(-6px)" }, { opacity: 1, transform: "none" }], { duration: 320, easing: "cubic-bezier(.2,.7,.2,1)" })
        champ.focus({ preventScroll: true })
    }
    $("so-ajouter").addEventListener("click", ajouterBrouillon)
    $("so-champ").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); ajouterBrouillon() } })
    $("so-photo-nouveau").addEventListener("click", function () { cible = "nouveau"; $("so-fichier").click() })
    $("so-fichier").addEventListener("change", function () {
        const f = this.files && this.files[0]
        this.value = ""
        if (!f) return
        lirePhoto(f).then(function (photo) {
            son("trouve")
            if (cible === "nouveau") { photoNouveau = photo; majPhotoNouveau() }
            else if (brouillon[cible]) { brouillon[cible].photo = photo; rendreJoueurs() }
        }).catch(function () { aideJ("Impossible de lire cette photo.", true) })
    })

    $("so-lancer").addEventListener("click", function () {
        // Un prénom tapé mais pas encore ajouté compte aussi
        if ($("so-champ").value.trim()) ajouterBrouillon()
        if (brouillon.length < JOUEURS_MIN) return
        if (!S) {
            S = {
                id: Date.now(),
                debut: new Date().toISOString(),
                joueurs: [],
                jeux: [],
                ensemble: {},
                arbitres: {},
                finaleArmee: false,
                finaleJouee: false,
                votes: {},
                terminee: false
            }
        }
        S.joueurs = brouillon.map(function (b) {
            const ancien = joueur(b.nom)
            return ancien ? Object.assign(ancien, { photo: b.photo }) : { nom: b.nom, photo: b.photo, points: 0, coeur: 0, titres: [] }
        })
        sauver()
        location.hash = "#soiree"
    })

    // ---------- Classement ----------
    function classement(liste) {
        const tries = liste.slice().sort(function (a, b) { return b.points - a.points || a.nom.localeCompare(b.nom) })
        let rang = 0, prec = null
        tries.forEach(function (j, i) { if (j.points !== prec) { rang = i + 1; prec = j.points } j._rang = rang })
        return tries
    }
    function resumeTitres(titres) {
        const compte = {}
        ;(titres || []).forEach(function (t) { compte[t.titre] = (compte[t.titre] || 0) + 1 })
        return Object.keys(compte).map(function (t) { return compte[t] > 1 ? t + " ×" + compte[t] : t })
    }
    function rendreClassement(ol, liste) {
        ol.textContent = ""
        const personne = liste.every(function (j) { return !j.points })
        classement(liste).forEach(function (j) {
            const li = document.createElement("li")
            li.className = "so-ligne" + (j._rang === 1 && j.points > 0 ? " premier" : "")
            const rang = document.createElement("span"); rang.className = "so-rang"; rang.textContent = personne ? "–" : j._rang
            const mil = document.createElement("div"); mil.className = "so-milieu"
            const nom = document.createElement("p"); nom.className = "so-nom"; nom.textContent = j.nom
            mil.appendChild(nom)
            const t = resumeTitres(j.titres)
            if (j.mentions) t.unshift.apply(t, j.mentions)
            if (t.length) {
                const tt = document.createElement("p"); tt.className = "so-titres-ligne"
                t.forEach(function (x) { const c = document.createElement("span"); c.className = "so-puce-titre"; c.textContent = x; tt.appendChild(c) })
                mil.appendChild(tt)
            }
            const pts = document.createElement("span"); pts.className = "so-points"; pts.textContent = j.points
            li.appendChild(rang); li.appendChild(avatar(j, "avatar-petit")); li.appendChild(mil); li.appendChild(pts)
            ol.appendChild(li)
        })
    }

    // ---------- Écran central ----------
    function preparerHub() {
        if (!S) { location.replace("#soiree-joueurs"); return }
        if (S.finaleJouee) { lancerVote(); return }
        S.jeuEnCours = null
        sauver()
        const n = S.jeux.length
        $("so-surtitre").textContent = n ? "Soirée · " + n + (n > 1 ? " jeux joués" : " jeu joué") : "Soirée · c'est parti"
        $("so-titre").textContent = n ? "Le classement" : "Que la fête commence"
        rendreClassement($("so-classement"), S.joueurs)
        rendreJeux()
        majFinale()
        desarmer()
    }

    function iconeDe(j) {
        const a = document.querySelector('.carte-jeu a[href="' + j.route + '"] .icone-jeu')
        return a ? a.innerHTML : ""
    }
    function jouable(j) { const n = S.joueurs.length; return n >= j.min && n <= j.max }

    function rendreJeux() {
        const g = $("so-jeux")
        g.textContent = ""
        JEUX.forEach(function (j) {
            const b = document.createElement("button")
            b.type = "button"
            b.className = "so-jeu" + (j.entracte ? " entracte" : "")
            b.dataset.jeu = j.id
            const ok = jouable(j)
            b.disabled = !ok
            const ic = document.createElement("span"); ic.className = "so-jeu-icone"; ic.innerHTML = iconeDe(j)
            const nm = document.createElement("span"); nm.className = "so-jeu-nom"; nm.textContent = j.nom
            const sous = document.createElement("span"); sous.className = "so-jeu-sous"
            const fois = S.jeux.filter(function (x) { return x.jeu === j.id }).length
            sous.textContent = !ok ? (S.joueurs.length < j.min ? "dès " + j.min + " joueurs" : j.max + " joueurs max")
                : j.entracte ? "Entracte · sans points" : (fois ? "joué " + fois + (fois > 1 ? " fois" : " fois") : "jamais joué")
            b.appendChild(ic); b.appendChild(nm); b.appendChild(sous)
            b.addEventListener("click", function () { if (!rouletteEnCours) lancerJeu(j.id) })
            g.appendChild(b)
        })
    }

    // Roulette : la lumière tourne entre les jeux puis s'arrête sur l'un d'eux
    let rouletteEnCours = false
    $("so-roulette").addEventListener("click", function () {
        if (rouletteEnCours) return
        const tuiles = Array.from(document.querySelectorAll("#so-jeux .so-jeu")).filter(function (b) {
            return !b.disabled && !b.classList.contains("entracte")
        })
        if (!tuiles.length) return
        rouletteEnCours = true
        const gagnante = Math.floor(Math.random() * tuiles.length)
        const pas = tuiles.length * 3 + gagnante
        let i = 0, delai = 60
        function etape() {
            tuiles.forEach(function (t) { t.classList.remove("roulette") })
            tuiles[i % tuiles.length].classList.add("roulette")
            son("tic")
            if (i >= pas) {
                const t = tuiles[i % tuiles.length]
                t.classList.add("elu")
                son("lancer")
                setTimeout(function () {
                    t.classList.remove("roulette", "elu")
                    rouletteEnCours = false
                    lancerJeu(t.dataset.jeu)
                }, reduit ? 300 : 1300)
                return
            }
            i++
            delai = i > pas - 6 ? delai * 1.45 : delai * 1.04
            setTimeout(etape, delai)
        }
        etape()
    })

    // Finale : le prochain jeu compte double
    function majFinale() {
        const b = $("so-finale")
        b.textContent = S.finaleArmee ? "Annuler la finale" : "Lancer la finale (points ×2)"
        b.classList.toggle("btn-or", !S.finaleArmee)
        b.classList.toggle("btn-contour", S.finaleArmee)
        $("so-finale-bandeau").hidden = !S.finaleArmee
    }
    $("so-finale").addEventListener("click", function () {
        S.finaleArmee = !S.finaleArmee
        sauver()
        son(S.finaleArmee ? "lancer" : "clic")
        majFinale()
        if (S.finaleArmee) animer($("so-finale-bandeau"), [{ opacity: 0, transform: "scale(.9)" }, { opacity: 1, transform: "none" }], { duration: 420, easing: "cubic-bezier(.34,1.56,.64,1)" })
    })

    // Boutons à double appui (terminer / abandonner)
    let arme = null, minuterieArme = null
    function desarmer() {
        clearTimeout(minuterieArme); arme = null
        $("so-terminer").textContent = "Terminer la soirée"
        $("so-abandonner").textContent = "Abandonner la soirée"
        $("so-terminer").classList.remove("confirmer"); $("so-abandonner").classList.remove("confirmer")
    }
    function armer(id, texte) {
        if (arme === id) { desarmer(); return true }
        desarmer()
        arme = id
        $(id).textContent = texte
        $(id).classList.add("confirmer")
        son("clic")
        minuterieArme = setTimeout(desarmer, 3500)
        return false
    }
    $("so-terminer").addEventListener("click", function () {
        if (!armer("so-terminer", "Toucher encore : place au vote")) return
        lancerVote()
    })
    $("so-abandonner").addEventListener("click", function () {
        if (!armer("so-abandonner", "Toucher encore pour tout effacer")) return
        S = null
        sauver()
        location.hash = ""
    })

    // ---------- Lancer un jeu ----------
    function cle(a, b) { return [a, b].sort().join("|") }
    // Répartit les joueurs en k groupes en évitant de remettre les mêmes ensemble
    function tirage(liste, k) {
        let meilleur = null, cout = Infinity
        for (let essai = 0; essai < 250; essai++) {
            const m = melanger(liste.slice())
            const groupes = []
            for (let g = 0; g < k; g++) groupes.push([])
            m.forEach(function (n, i) { groupes[i % k].push(n) })
            let c = 0
            groupes.forEach(function (g) {
                for (let a = 0; a < g.length; a++) for (let b = a + 1; b < g.length; b++) c += (S.ensemble[cle(g[a], g[b])] || 0)
            })
            if (c < cout) { cout = c; meilleur = groupes; if (c === 0) break }
        }
        return meilleur
    }
    function donnees(id) {
        const tous = noms()
        const n = tous.length
        if (id === "blacksup") return tirage(tous, 2)
        if (id === "crea-mime") return tirage(tous, 2)
        if (id === "passe-mot") {
            const duos = Math.min(4, Math.floor(n / 2))
            const reste = n - duos * 2
            // Les arbitres : ceux qui ont le moins arbitré
            const ordre = melanger(tous.slice()).sort(function (a, b) { return (S.arbitres[a] || 0) - (S.arbitres[b] || 0) })
            const arbitres = ordre.slice(0, reste)
            arbitres.forEach(function (a) { S.arbitres[a] = (S.arbitres[a] || 0) + 1 })
            S.arbitresDuJeu = arbitres
            return tirage(tous.filter(function (x) { return arbitres.indexOf(x) === -1 }), duos)
        }
        return melanger(tous.slice())
    }

    function lancerJeu(id) {
        const j = infoJeu(id)
        if (!j) return
        son("lancer")
        S.jeuEnCours = id
        S.arbitresDuJeu = []
        if (!j.entracte && JEUX_SOIREE[id]) JEUX_SOIREE[id].remplir(donnees(id))
        sauver()
        location.hash = j.route
    }

    // Bandeau « mode soirée » sur l'écran de préparation du jeu
    function bandeau(j) {
        const ecran = $(j.ecran)
        let b = ecran.querySelector(".so-bandeau")
        if (!b) {
            b = document.createElement("div")
            b.className = "so-bandeau"
            const t = document.createElement("span"); t.className = "so-bandeau-texte"
            b.appendChild(t)
            if (j.equipes) {
                const r = document.createElement("button")
                r.type = "button"; r.className = "so-bandeau-btn"; r.textContent = "Nouveau tirage"
                r.addEventListener("click", function () {
                    son("clic")
                    JEUX_SOIREE[j.id].remplir(donnees(j.id))
                    majBandeau(j)
                    animer(ecran.querySelector(".champ.groupe") || ecran, [{ opacity: .3 }, { opacity: 1 }], { duration: 380, easing: "ease-out" })
                })
                b.appendChild(r)
            }
            const barre = ecran.querySelector(".barre-haut")
            if (barre) barre.after(b); else ecran.prepend(b)
            // Les joueurs de la soirée absents de ce jeu, à ajouter d'un toucher
            if (!j.entracte && JEUX_SOIREE[j.id] && JEUX_SOIREE[j.id].presents) {
                const r = document.createElement("div")
                r.className = "so-absents"
                b.after(r)
            }
            if (!j.entracte && JEUX_SOIREE[j.id] && JEUX_SOIREE[j.id].presents && !ecran.dataset.suiviAbsents) {
                ecran.dataset.suiviAbsents = "1"
                let attente = null
                new MutationObserver(function () {
                    clearTimeout(attente)
                    attente = setTimeout(function () { majAbsents(j) }, 60)
                }).observe(ecran, { childList: true, subtree: true })
                ecran.addEventListener("change", function () { clearTimeout(attente); attente = setTimeout(function () { majAbsents(j) }, 100) })
                ecran.addEventListener("input", function () { clearTimeout(attente); attente = setTimeout(function () { majAbsents(j) }, 200) })
            }
        }
        majBandeau(j)
        majAbsents(j)
    }
    function majAbsents(j) {
        const r = $(j.ecran).querySelector(".so-absents")
        if (!r || !S) return
        const presents = JEUX_SOIREE[j.id].presents().map(function (n) { return n.toLowerCase() })
        const absents = S.joueurs.filter(function (x) { return presents.indexOf(x.nom.toLowerCase()) === -1 })
        const cle = absents.map(function (x) { return x.nom }).join("|")
        if (r.dataset.cle === cle) return
        r.dataset.cle = cle
        r.textContent = ""
        r.hidden = !absents.length
        if (!absents.length) return
        const t = document.createElement("span")
        t.className = "so-absents-titre"
        t.textContent = j.equipes ? "Ajouter (dans l'équipe la plus petite) :" : "Ajouter :"
        r.appendChild(t)
        absents.forEach(function (x) {
            const b = document.createElement("button")
            b.type = "button"
            b.className = "so-absent"
            b.dataset.son = "aucun"
            b.appendChild(avatar(x, "avatar-mini"))
            const n = document.createElement("span"); n.textContent = x.nom
            b.appendChild(n)
            const plus = document.createElement("span"); plus.className = "so-absent-plus"; plus.textContent = "+"
            b.appendChild(plus)
            b.addEventListener("click", function () { son("clic"); JEUX_SOIREE[j.id].ajouter(x.nom); setTimeout(function () { majAbsents(j) }, 50) })
            r.appendChild(b)
        })
    }
    function majBandeau(j) {
        const b = $(j.ecran).querySelector(".so-bandeau")
        if (!b) return
        let t = j.entracte ? "Entracte · aucun point en jeu" : (j.equipes ? "Mode soirée · équipes tirées au sort" : "Mode soirée · joueurs de la soirée")
        if (S.arbitresDuJeu && S.arbitresDuJeu.length) t += " · arbitre : " + listeNoms(S.arbitresDuJeu)
        if (S.finaleArmee && !j.entracte) t += " · FINALE ×2"
        b.querySelector(".so-bandeau-texte").textContent = t
        b.classList.toggle("finale", !!S.finaleArmee && !j.entracte)
    }
    function retirerBandeaux() {
        document.querySelectorAll(".so-bandeau, .so-absents").forEach(function (b) { b.remove() })
        document.querySelectorAll(".btn-suite-soiree").forEach(function (b) { b.remove() })
        document.querySelectorAll(".fin-en-soiree").forEach(function (e) { e.classList.remove("fin-en-soiree") })
    }

    // ---------- Fin d'un jeu : calcul des points GOAT ----------
    let dernier = null

    function gainsDe(res) {
        const g = {}
        function donner(nom, p) { const j = joueur(nom); if (j && p > 0) g[j.nom] = (g[j.nom] || 0) + p }
        if (!res) return g
        if (res.type === "individuel") {
            const l = res.classement.slice().sort(function (a, b) { return b.points - a.points })
            if (!l.length || l[0].points <= 0) return g
            let rang = 0, prec = null
            l.forEach(function (x, i) {
                if (x.points !== prec) { rang = i + 1; prec = x.points }
                if (x.points > 0) donner(x.nom, [0, 3, 2, 1][rang] || 0)
            })
        } else if (res.type === "equipes") {
            const tousPremiers = res.equipes.every(function (e) { return e.rang === 1 })
            res.equipes.forEach(function (e) {
                const p = tousPremiers ? 2 : (e.rang === 1 ? 3 : (e.rang === 2 ? 1 : 0))
                e.noms.forEach(function (n) { donner(n, p) })
            })
        } else if (res.type === "camps") {
            res.gagnants.forEach(function (n) { donner(n, res.points) })
        }
        return g
    }

    function finDeJeu(id, res, ecranFin) {
        if (!enCours()) return
        const j = infoJeu(id)
        const mult = S.finaleArmee ? 2 : 1
        const gains = gainsDe(res)
        Object.keys(gains).forEach(function (n) { gains[n] *= mult; joueur(n).points += gains[n] })
        const titres = ((res && res.titres) || []).map(function (t) {
            const ok = t.noms.filter(function (n) { return joueur(n) }).map(function (n) { return joueur(n).nom })
            ok.forEach(function (n) { joueur(n).titres.push({ titre: t.titre, jeu: j.nom }) })
            return { titre: t.titre, noms: ok, detail: t.detail || "" }
        }).filter(function (t) { return t.noms.length })
        // On retient qui a joué avec qui pour varier les prochaines équipes
        if (res && res.type === "equipes") res.equipes.forEach(function (e) {
            for (let a = 0; a < e.noms.length; a++) for (let b = a + 1; b < e.noms.length; b++) {
                const k = cle(e.noms[a], e.noms[b]); S.ensemble[k] = (S.ensemble[k] || 0) + 1
            }
        })
        dernier = { jeu: id, nom: j ? j.nom : id, finale: mult === 2, gains: gains, titres: titres, sansPoints: !res, date: new Date().toISOString() }
        S.jeux.push(dernier)
        if (mult === 2) { S.finaleArmee = false; S.finaleJouee = true }
        S.jeuEnCours = null
        sauver()

        // Sur l'écran de fin du jeu : un seul bouton, vers les points de la soirée
        const ecran = $(ecranFin)
        if (ecran) {
            ecran.classList.add("fin-en-soiree")
            let b = ecran.querySelector(".btn-suite-soiree")
            if (!b) {
                b = document.createElement("button")
                b.type = "button"
                b.className = "btn btn-or btn-fete btn-suite-soiree"
                b.addEventListener("click", afficherGains)
                ecran.appendChild(b)
            }
            b.textContent = "Voir les points de la soirée"
        }
    }

    function afficherGains() {
        const d = dernier
        retirerBandeaux()
        if (!d) { location.hash = "#soiree"; return }
        $("so-gains-jeu").textContent = d.nom
        $("so-gains-x2").hidden = !d.finale
        const ul = $("so-gains")
        ul.textContent = ""
        const gagnants = Object.keys(d.gains).sort(function (a, b) { return d.gains[b] - d.gains[a] })
        $("so-gains-titre").textContent = gagnants.length ? "Les points tombent" : (d.sansPoints ? "Pas de points ce coup-ci" : "Personne ne marque")
        gagnants.forEach(function (n, i) {
            const j = joueur(n)
            const li = document.createElement("li")
            li.style.animationDelay = (0.15 + i * 0.08) + "s"
            li.appendChild(avatar(j, "avatar-petit"))
            const nm = document.createElement("span"); nm.className = "so-nom"; nm.textContent = n
            const p = document.createElement("span"); p.className = "so-plus"; p.textContent = "+" + d.gains[n]
            const t = document.createElement("span"); t.className = "so-total"; t.textContent = j.points + " pts"
            li.appendChild(nm); li.appendChild(t); li.appendChild(p)
            ul.appendChild(li)
        })
        const tt = $("so-gains-titres")
        tt.textContent = ""
        d.titres.forEach(function (t, i) {
            const c = document.createElement("div")
            c.className = "so-titre-gagne"
            c.style.animationDelay = (0.4 + gagnants.length * 0.08 + i * 0.12) + "s"
            c.appendChild(avatars(t.noms.map(joueur), "avatar-petit"))
            const txt = document.createElement("div")
            const a = document.createElement("p"); a.className = "so-titre-nom"; a.textContent = t.titre
            const b = document.createElement("p"); b.className = "so-titre-qui"; b.textContent = listeNoms(t.noms) + (t.detail ? " · " + t.detail : "")
            txt.appendChild(a); txt.appendChild(b)
            c.appendChild(txt)
            tt.appendChild(c)
        })
        $("so-gains-suite").textContent = S.finaleJouee ? "Place au vote du GOAT du cœur" : "Retour à la soirée"
        afficher("ecran-soiree-gains")
        setTimeout(function () { if (gagnants.length) son("fin-manche") }, reduit ? 0 : 350)
    }
    $("so-gains-suite").addEventListener("click", function () {
        if (S && S.finaleJouee) lancerVote()
        else location.hash = "#soiree"
    })

    // ---------- GOAT du cœur ----------
    let vote = null
    function lancerVote() {
        if (!S) return
        if (S.coeurApplique) { lancerCeremonie(); return }
        retirerBandeaux()
        musique(false)
        vote = { ordre: melanger(noms()), i: 0, choix: null }
        S.votes = {}
        preparerVotant()
    }
    function preparerVotant() {
        const v = joueur(vote.ordre[vote.i])
        vote.choix = null
        $("so-vote-progres").textContent = "Vote " + (vote.i + 1) + " sur " + vote.ordre.length
        const av = $("so-vote-avatar")
        av.replaceWith(avatar(v, "avatar-grand"))
        $("ecran-soiree-vote").querySelector(".so-votant .avatar").id = "so-vote-avatar"
        $("so-vote-nom").textContent = v.nom
        const g = $("so-vote-grille")
        g.textContent = ""
        S.joueurs.forEach(function (j) {
            if (j.nom === v.nom) return
            const b = document.createElement("button")
            b.type = "button"
            b.className = "so-choix-avatar"
            b.setAttribute("aria-pressed", "false")
            b.appendChild(avatar(j, "avatar-moyen"))
            const n = document.createElement("span"); n.textContent = j.nom
            b.appendChild(n)
            b.addEventListener("click", function () {
                vote.choix = j.nom
                g.querySelectorAll(".so-choix-avatar").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false") })
                const ok = $("so-vote-ok")
                ok.disabled = false
                ok.textContent = "Voter pour " + j.nom
            })
            g.appendChild(b)
        })
        const ok = $("so-vote-ok")
        ok.disabled = true
        ok.textContent = "Choisis ton GOAT du cœur"
        if (document.getElementById("ecran-soiree-vote").classList.contains("actif")) {
            animer($("ecran-soiree-vote"), [{ opacity: 0 }, { opacity: 1 }], { duration: 350, easing: "ease-out" })
        } else afficher("ecran-soiree-vote")
    }
    $("so-vote-ok").addEventListener("click", function () {
        if (!vote || !vote.choix) return
        son("trouve")
        S.votes[vote.ordre[vote.i]] = vote.choix
        vote.i++
        if (vote.i < vote.ordre.length) { preparerVotant(); return }
        // Tous les votes sont là : 1 point par vote reçu
        S.joueurs.forEach(function (j) { j.coeur = 0 })
        Object.keys(S.votes).forEach(function (v) { const c = joueur(S.votes[v]); if (c) { c.coeur++; c.points++ } })
        S.coeurApplique = true
        S.finaleJouee = true
        sauver()
        lancerCeremonie()
    })

    // ---------- Cérémonie ----------
    let etapes = [], etape = 0
    function lancerCeremonie() {
        const tries = classement(S.joueurs)
        const groupes = []
        tries.forEach(function (j) {
            const g = groupes[groupes.length - 1]
            if (g && g[0].points === j.points) g.push(j); else groupes.push([j])
        })
        etapes = []
        if (S.joueurs.length >= 4 && groupes.length >= 4) etapes.push({ titre: "Le Nullard", etiquette: "Le titre que personne ne veut", gens: groupes[groupes.length - 1], detail: "Avec " + groupes[groupes.length - 1][0].points + " points. Il fallait bien quelqu'un.", son: "erreur" })
        let maxCoeur = 0
        S.joueurs.forEach(function (j) { maxCoeur = Math.max(maxCoeur, j.coeur || 0) })
        if (maxCoeur > 0) etapes.push({ titre: "Le Chouchou des nanas", etiquette: "GOAT du cœur", gens: S.joueurs.filter(function (j) { return j.coeur === maxCoeur }), detail: maxCoeur + (maxCoeur > 1 ? " votes du cœur" : " vote du cœur"), son: "trouve", coeur: true })
        if (groupes[2]) etapes.push({ titre: "Le Bronze", etiquette: "Troisième place", gens: groupes[2], detail: groupes[2][0].points + " points", son: "fin-manche" })
        if (groupes[1]) etapes.push({ titre: "Le Dauphin", etiquette: "Deuxième place", gens: groupes[1], detail: groupes[1][0].points + " points", son: "fin-manche" })
        etapes.push({ titre: groupes[0].length > 1 ? "Les GOAT" : "Le GOAT", etiquette: "Le GOAT de la soirée est…", gens: groupes[0], detail: groupes[0][0].points + " points. Respect éternel.", son: "victoire", goat: true })
        etape = 0
        // Les mentions spéciales restent dans le bilan
        S.joueurs.forEach(function (j) { j.mentions = [] })
        etapes.forEach(function (e) {
            if (e.goat || e.titre === "Le Nullard" || e.coeur) e.gens.forEach(function (j) { j.mentions.push(e.titre.replace("Les GOAT", "Le GOAT")) })
        })
        sauver()
        afficher("ecran-soiree-ceremonie")
        montrerEtape()
    }
    function montrerEtape() {
        const e = etapes[etape]
        const sc = $("so-cer-scene")
        sc.classList.toggle("goat", !!e.goat)
        $("so-cer-surtitre").textContent = "La cérémonie · " + (etape + 1) + " / " + etapes.length
        $("so-cer-etiquette").textContent = e.etiquette
        const av = $("so-cer-avatar")
        const nouveau = avatars(e.gens, "avatar-geant")
        nouveau.id = "so-cer-avatar"
        av.replaceWith(nouveau)
        $("so-cer-nom").textContent = listeNoms(e.gens.map(function (j) { return j.nom }))
        $("so-cer-titre").textContent = e.titre
        $("so-cer-detail").textContent = e.detail
        $("so-cer-couronne").hidden = !e.goat
        $("so-cer-suite").textContent = etape === etapes.length - 1 ? "Voir le bilan de la soirée" : "Suivant"
        sc.classList.remove("revele"); void sc.offsetWidth; sc.classList.add("revele")
        setTimeout(function () {
            if (e.goat) { confettis(); setTimeout(confettis, 700); son("victoire", { ensuite: function () { musique(true) } }) }
            else son(e.son)
        }, reduit ? 0 : 450)
    }
    $("so-cer-suite").addEventListener("click", function () {
        etape++
        if (etape < etapes.length) { montrerEtape(); return }
        terminerSoiree()
    })

    function terminerSoiree() {
        const entree = {
            id: S.id,
            debut: S.debut,
            fin: new Date().toISOString(),
            joueurs: S.joueurs.map(function (j) { return { nom: j.nom, photo: j.photo || null, points: j.points, coeur: j.coeur || 0, titres: j.titres || [], mentions: j.mentions || [] } }),
            jeux: S.jeux.map(function (x) { return { nom: x.nom, finale: x.finale, gains: x.gains, titres: x.titres } })
        }
        const h = historique().filter(function (x) { return x.id !== entree.id })
        h.unshift(entree)
        sauverHistorique(h)
        S = null
        sauver()
        bilanCourant = entree
        bilanDepuisCeremonie = true
        location.hash = "#soiree-bilan"
    }

    // ---------- Bilan ----------
    let bilanDepuisCeremonie = false
    function dateLisible(iso) {
        try { return new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) } catch (e) { return "" }
    }
    function preparerBilan() {
        const b = bilanCourant
        if (!b) { location.replace("#historique"); return }
        $("so-bilan-date").textContent = "Soirée du " + dateLisible(b.debut)
        $("so-bilan-retour").setAttribute("href", bilanDepuisCeremonie ? "#" : "#historique")
        if (bilanDepuisCeremonie) $("so-bilan-retour").setAttribute("data-accueil", "")
        else $("so-bilan-retour").removeAttribute("data-accueil")
        $("so-bilan-fin").hidden = !bilanDepuisCeremonie
        // Podium : 2e, 1er, 3e
        const tries = classement(b.joueurs)
        const p = $("so-podium")
        p.textContent = ""
        ;[2, 1, 3].forEach(function (r) {
            const gens = tries.filter(function (j) { return j._rang === r })
            const col = document.createElement("div")
            col.className = "so-marche r" + r
            if (gens.length) {
                if (r === 1) { const c = document.createElement("span"); c.className = "so-mini-couronne"; c.innerHTML = $("so-cer-couronne").innerHTML; col.appendChild(c) }
                col.appendChild(avatars(gens, r === 1 ? "avatar-grand" : "avatar-moyen"))
                const n = document.createElement("p"); n.className = "so-marche-nom"; n.textContent = listeNoms(gens.map(function (j) { return j.nom }))
                col.appendChild(n)
            }
            const socle = document.createElement("div"); socle.className = "so-socle"; socle.textContent = gens.length ? gens[0].points : ""
            col.appendChild(socle)
            p.appendChild(col)
        })
        rendreClassement($("so-bilan-classement"), b.joueurs)
        const ul = $("so-bilan-jeux")
        ul.textContent = ""
        b.jeux.forEach(function (x, i) {
            const li = document.createElement("li")
            const t = document.createElement("span"); t.className = "so-hj-nom"; t.textContent = (i + 1) + ". " + x.nom + (x.finale ? " · finale ×2" : "")
            const d = document.createElement("span"); d.className = "so-hj-detail"
            d.textContent = (x.titres || []).map(function (tt) { return tt.titre + " : " + listeNoms(tt.noms) }).join(" · ") || "Sans titre"
            li.appendChild(t); li.appendChild(d)
            ul.appendChild(li)
        })
        if (bilanDepuisCeremonie) setTimeout(confettis, reduit ? 0 : 600)
    }

    // ---------- Historique ----------
    function preparerHistorique() {
        const h = historique()
        const ul = $("so-historique")
        ul.textContent = ""
        $("so-historique-vide").hidden = h.length > 0
        $("so-effacer").hidden = h.length === 0
        h.forEach(function (s) {
            const li = document.createElement("li")
            const b = document.createElement("button")
            b.type = "button"
            b.className = "so-histo-ligne"
            const goats = classement(s.joueurs).filter(function (j) { return j._rang === 1 })
            b.appendChild(avatars(goats, "avatar-moyen"))
            const t = document.createElement("div"); t.className = "so-milieu"
            const a = document.createElement("p"); a.className = "so-nom"; a.textContent = "GOAT : " + listeNoms(goats.map(function (j) { return j.nom }))
            const d = document.createElement("p"); d.className = "so-titres-ligne"
            d.textContent = dateLisible(s.debut) + " · " + s.joueurs.length + " joueurs · " + s.jeux.length + (s.jeux.length > 1 ? " jeux" : " jeu")
            t.appendChild(a); t.appendChild(d)
            b.appendChild(t)
            b.addEventListener("click", function () { bilanCourant = s; bilanDepuisCeremonie = false; location.hash = "#soiree-bilan" })
            li.appendChild(b)
            ul.appendChild(li)
        })
        desarmerEffacer()
    }
    let effacerArme = null
    function desarmerEffacer() { clearTimeout(effacerArme); effacerArme = null; $("so-effacer").textContent = "Effacer l'historique"; $("so-effacer").classList.remove("confirmer") }
    $("so-effacer").addEventListener("click", function () {
        if (!effacerArme) {
            son("clic")
            $("so-effacer").textContent = "Toucher encore pour tout effacer"
            $("so-effacer").classList.add("confirmer")
            effacerArme = setTimeout(desarmerEffacer, 3500)
            return
        }
        try { localStorage.removeItem(CLE_HISTO) } catch (e) {}
        son("erreur")
        preparerHistorique()
        majAmbiance()
    })

    // ---------- Navigation ----------
    // Pendant une soirée, les boutons « retour à l'accueil » des jeux ramènent à la soirée
    document.addEventListener("click", function (e) {
        const a = e.target.closest && e.target.closest('a[href="#"]')
        if (!a || a.hasAttribute("data-accueil") || !enCours()) return
        e.preventDefault()
        location.hash = "#soiree"
    }, true)

    function surAdresse() {
        const h = location.hash
        if (h !== "#soiree-bilan") bilanDepuisCeremonie = bilanDepuisCeremonie && h === ""
        if (h === "#soiree") { retirerBandeaux(); preparerHub(); return }
        if (h === "#soiree-joueurs") { retirerBandeaux(); preparerJoueurs(); return }
        if (h === "#soiree-bilan") { preparerBilan(); return }
        if (h === "#historique") { preparerHistorique(); return }
        if (h === "") { retirerBandeaux(); majAmbiance(); return }
        // Un jeu lancé depuis la soirée : bandeau sur son écran de préparation
        const j = JEUX.filter(function (x) { return x.route === h })[0]
        if (j && enCours() && S.jeuEnCours === j.id) bandeau(j)
    }
    window.addEventListener("hashchange", surAdresse)

    charger()
    majAmbiance()
    surAdresse()
})()

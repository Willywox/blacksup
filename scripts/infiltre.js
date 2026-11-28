// =========================================================
// L'INFILTRÉ — tout le monde a le même mot… sauf un
//
// Utilise les outils communs de jeu.js ($, son, musique, afficher,
// animer, melanger, memoire, confettis, iconeCroix, reduit)
// et les paires de infiltre-paires.js (PAIRES_INFILTRE)
// =========================================================

;(function () {

    const JOUEURS_MIN = 4
    const JOUEURS_MAX = 12
    const WHITE_MIN = 5               // Mister White possible à partir de 5 joueurs
    const CLE_INF = "blacksup-infiltre"

    let inf = {
        joueurs: [],     // [{ nom, role: "civil" | "infiltre" | "white", mot, elimine }]
        motCivil: "",
        motInfiltre: "",
        distribue: 0,    // combien de joueurs ont vu leur mot
        tour: 1,
        premier: 0,      // qui parle en premier au tour 1
        choix: null      // joueur sélectionné au vote
    }
    let enJeuINF = false
    let derniereElimination = null
    let pairesRecentes = { normal: [], adulte: [] }

    // ---------- Préparation : les joueurs ----------
    function noms() {
        return Array.from(document.querySelectorAll("#inf-joueurs .puce-texte")).map(function (t) { return t.textContent })
    }

    function ajouterJoueur(nom, anime) {
        nom = String(nom || "").trim().slice(0, 15)
        if (!nom) return false
        const existants = noms().map(function (n) { return n.toLowerCase() })
        if (existants.length >= JOUEURS_MAX) { aide("12 joueurs maximum.", true); return false }
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
                { duration: 180, easing: "ease-in" }).then(function () {
                puce.remove()
                majReglages()
                sauver()
            })
        })
        puce.appendChild(texte)
        puce.appendChild(retirer)
        $("inf-joueurs").appendChild(puce)
        if (anime) animer(puce, [{ opacity: 0, transform: "scale(.7)" }, { opacity: 1, transform: "none" }],
            { duration: 320, easing: "cubic-bezier(.34,1.56,.64,1)" })
        majReglages()
        return true
    }

    function aide(texte, alerte) {
        const a = $("inf-aide")
        a.textContent = texte
        a.classList.toggle("alerte", !!alerte)
        if (alerte) animer(a, [
            { transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(5px)" }, { transform: "translateX(0)" }
        ], { duration: 300 })
    }

    function validerChamp() {
        const champ = $("inf-champ")
        if (ajouterJoueur(champ.value, true)) {
            son("clic")
            champ.value = ""
            sauver()
        }
        champ.focus({ preventScroll: true })
    }
    $("inf-ajouter").addEventListener("click", validerChamp)
    $("inf-champ").addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); validerChamp() }
    })

    // ---------- Nombre d'infiltrés et Mister White ----------
    let nbInfiltres = 1
    let infiltresChoisisAMain = false

    function maxInfiltres(n, white) {
        // Il doit toujours rester plus de civils que d'imposteurs
        return Math.max(1, Math.floor((n - (white ? 1 : 0) - 1) / 2))
    }
    function infiltresConseilles(n) { return n <= 6 ? 1 : (n <= 9 ? 2 : 3) }

    function majReglages() {
        const n = noms().length
        $("inf-compte").textContent = n ? "· " + n : ""
        const whitePossible = n >= WHITE_MIN
        const interrupteur = $("inf-white")
        if (!whitePossible) interrupteur.checked = false
        interrupteur.closest(".interrupteur").classList.toggle("desactive", !whitePossible)
        interrupteur.disabled = !whitePossible

        const max = maxInfiltres(Math.max(n, JOUEURS_MIN), interrupteur.checked)
        if (!infiltresChoisisAMain) nbInfiltres = Math.min(infiltresConseilles(n), max)
        nbInfiltres = Math.max(1, Math.min(nbInfiltres, max))
        $("inf-nb").textContent = nbInfiltres
        $("inf-nb-texte").textContent = nbInfiltres > 1 ? "infiltrés" : "infiltré"
        $("inf-moins").disabled = nbInfiltres <= 1
        $("inf-plus").disabled = nbInfiltres >= max

        if (n < JOUEURS_MIN) aide("Il faut au moins " + JOUEURS_MIN + " joueurs (encore " + (JOUEURS_MIN - n) + ").", false)
        else aide(n >= JOUEURS_MAX ? "C'est complet (12 joueurs)." : "", false)
        $("inf-lancer").disabled = n < JOUEURS_MIN
    }

    function changerInfiltres(pas) {
        infiltresChoisisAMain = true
        const avant = nbInfiltres
        nbInfiltres += pas
        majReglages()
        if (nbInfiltres !== avant) {
            son("clic")
            const b = $("inf-nb")
            if (!reduit) { b.classList.remove("bouge"); void b.offsetWidth; b.classList.add("bouge") }
        }
        sauver()
    }
    $("inf-moins").addEventListener("click", function () { changerInfiltres(-1) })
    $("inf-plus").addEventListener("click", function () { changerInfiltres(1) })
    $("inf-white").addEventListener("change", function () { majReglages(); sauver() })

    // ---------- Mémoire ----------
    function sauver() {
        memoire(CLE_INF, JSON.stringify({
            joueurs: noms(),
            white: $("inf-white").checked,
            infiltres: infiltresChoisisAMain ? nbInfiltres : null
        }))
    }
    function charger() {
        let r = null
        try { r = JSON.parse(memoire(CLE_INF) || "null") } catch (e) { r = null }
        if (r && Array.isArray(r.joueurs)) r.joueurs.slice(0, JOUEURS_MAX).forEach(function (n) { ajouterJoueur(n, false) })
        if (r && r.white) $("inf-white").checked = true
        if (r && r.infiltres) { infiltresChoisisAMain = true; nbInfiltres = r.infiltres }
        majReglages()
    }

    // ---------- Lancement : tirage des rôles ----------
    function tirerPaire() {
        // Évite de retomber sur une paire jouée récemment
        const paires = modeAdulte ? PAIRES_ADULTES : PAIRES_INFILTRE
        const recentes = pairesRecentes[modeAdulte ? "adulte" : "normal"]
        let candidates = paires.filter(function (p, i) { return recentes.indexOf(i) === -1 })
        if (!candidates.length) { recentes.length = 0; candidates = paires.slice() }
        const paire = candidates[Math.floor(Math.random() * candidates.length)]
        recentes.push(paires.indexOf(paire))
        if (recentes.length > Math.min(40, Math.floor(paires.length * .6))) recentes.shift()
        return Math.random() < .5 ? [paire[0], paire[1]] : [paire[1], paire[0]]
    }

    function lancerPartie() {
        const liste = noms()
        if (liste.length < JOUEURS_MIN) return
        sauver()
        const white = $("inf-white").checked && liste.length >= WHITE_MIN
        const mots = tirerPaire()
        inf.motCivil = mots[0]
        inf.motInfiltre = mots[1]

        // Rôles mélangés au hasard
        const roles = []
        for (let i = 0; i < nbInfiltres; i++) roles.push("infiltre")
        if (white) roles.push("white")
        while (roles.length < liste.length) roles.push("civil")
        melanger(roles)
        inf.joueurs = liste.map(function (nom, i) {
            return {
                nom: nom,
                role: roles[i],
                mot: roles[i] === "civil" ? inf.motCivil : (roles[i] === "infiltre" ? inf.motInfiltre : null),
                elimine: false
            }
        })
        // Celui qui parle en premier : n'importe qui, Mister White compris
        // (sinon le premier joueur serait forcément innocenté)
        inf.premier = Math.floor(Math.random() * inf.joueurs.length)
        inf.distribue = 0
        inf.tour = 1
        inf.whiteGagne = false
        inf.dernierOrdre = null
        inf.partie = Date.now()
        inf.decompte = null
        enJeuINF = true
        musique(false)
        if (window.garderEcranAllume) window.garderEcranAllume(true)
        preparerDistribution()
    }
    $("inf-lancer").addEventListener("click", lancerPartie)

    // ---------- Distribution : chacun voit son mot en secret ----------
    function preparerDistribution() {
        // Les joueurs connectés voient leur mot sur leur téléphone : on passe directement aux autres
        while (inf.distribue < inf.joueurs.length && estEnLigne(inf.joueurs[inf.distribue].nom)) inf.distribue++
        if (inf.distribue >= inf.joueurs.length) { finDistribution(); return }
        const j = inf.joueurs[inf.distribue]
        $("inf-dist-progres").textContent = "Joueur " + (inf.distribue + 1) + " sur " + inf.joueurs.length
        $("inf-dist-nom").textContent = j.nom
        const mot = $("inf-mot")
        mot.textContent = ""
        if (j.role === "white") {
            mot.innerHTML = '<span style="font-size: .55em; letter-spacing: .1em; text-transform: uppercase; color: var(--discret)">Tu es</span><br>Mister White<br><span style="font-size: .42em; font-family: var(--sans); color: var(--texte-2)">Tu n\'as pas de mot. Bluffe !</span>'
        } else {
            mot.textContent = j.mot
        }
        const carte = $("inf-carte")
        carte.classList.remove("visible", "vu")
        $("inf-vu").disabled = true
        $("inf-vu").textContent = inf.distribue === inf.joueurs.length - 1 ? "C'est vu, on commence" : "C'est vu, je passe"
        if (document.getElementById("ecran-inf-distribution").classList.contains("actif")) {
            animer($("inf-dist-nom"), [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }],
                { duration: 400, easing: "cubic-bezier(.2,.7,.2,1)" })
        } else {
            afficher("ecran-inf-distribution")
        }
    }

    // Appui long : le mot n'est visible que tant qu'on appuie
    ;(function () {
        const carte = $("inf-carte")
        function montrer(e) {
            if (e) e.preventDefault()
            if (!carte.classList.contains("visible")) son("clic")
            carte.classList.add("visible")
        }
        function cacher() {
            if (carte.classList.contains("visible")) {
                carte.classList.add("vu")
                $("inf-vu").disabled = false
            }
            carte.classList.remove("visible")
        }
        carte.addEventListener("pointerdown", montrer)
        carte.addEventListener("pointerup", cacher)
        carte.addEventListener("pointerleave", cacher)
        carte.addEventListener("pointercancel", cacher)
        carte.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "Enter") montrer(e) })
        carte.addEventListener("keyup", cacher)
        carte.addEventListener("blur", cacher)
    })()

    $("inf-vu").addEventListener("click", function () {
        inf.distribue++
        if (inf.distribue < inf.joueurs.length) preparerDistribution()
        else finDistribution()
    })

    // En ligne : écran commun « qui a vu son mot », puis on lance le tour
    const vusINF = suiviVus({ prefixe: "inf", quoi: "son mot", suite: function () { preparerTour() } })
    function finDistribution() {
        const enLigne = inf.joueurs.filter(function (j) { return estEnLigne(j.nom) }).map(function (j) { return j.nom })
        if (!enLigne.length) { preparerTour(); return }
        vusINF.ouvrir(inf.joueurs.map(function (j) { return j.nom }), inf.joueurs.map(function (j) { return j.nom }).filter(function (n) { return enLigne.indexOf(n) === -1 }))
    }

    // En ligne : chacun vote sur son téléphone, l'appli élimine le plus voté
    const voteINF = voteEnLigne({
        conteneur: $("inf-vote-ligne"), bouton: $("inf-reveler"), forcer: $("inf-reveler-forcer"),
        vivants: function () { return vivants().map(function (i) { return inf.joueurs[i].nom }) },
        surChangement: function () { majVotesTour() },
        surResultat: function (nom, d) {
            inf.choix = inf.joueurs.findIndex(function (j) { return j.nom === nom })
            inf.decompte = voteINF.texteDecompte(d)
            $("inf-eliminer").disabled = false
            $("inf-eliminer").click()
        }
    })
    function majVotesTour() {
        const p = $("inf-tour-votes")
        p.hidden = !voteINF.actif()
        p.textContent = "Votes reçus : " + voteINF.compte() + " · chacun peut voter sur son téléphone"
    }

    // ---------- Un tour de parole ----------
    function vivants() { return inf.joueurs.map(function (j, i) { return i }).filter(function (i) { return !inf.joueurs[i].elimine }) }

    function preparerTour() {
        $("inf-tour-numero").textContent = "Tour " + inf.tour
        // Nouvel ordre de parole à chaque tour (Mister White compris), différent du tour précédent
        const v = vivants()
        let ordre = melanger(v.slice())
        for (let essai = 0; essai < 10 && inf.dernierOrdre && v.length > 2 && ordre.join() === inf.dernierOrdre; essai++) ordre = melanger(v.slice())
        inf.dernierOrdre = ordre.join()
        inf.ordreNoms = ordre.map(function (i) { return inf.joueurs[i].nom })
        voteINF.nouveauTour(inf.partie + "-" + inf.tour)
        majVotesTour()
        const ol = $("inf-ordre")
        ol.textContent = ""
        ordre.forEach(function (i, k) {
            const li = document.createElement("li")
            li.textContent = inf.joueurs[i].nom
            li.style.animationDelay = (0.2 + k * 0.05) + "s"
            ol.appendChild(li)
        })
        afficher("ecran-inf-tour")
    }
    $("inf-vers-vote").addEventListener("click", preparerVote)

    // ---------- Le vote ----------
    function preparerVote() {
        inf.choix = null
        const enLigne = voteINF.actif()
        $("inf-vote").hidden = enLigne
        $("inf-eliminer").hidden = enLigne
        $("inf-vote-ligne").hidden = !enLigne
        $("inf-reveler").hidden = !enLigne
        $("inf-reveler-forcer").hidden = true
        if (enLigne) { voteINF.rendre(); afficher("ecran-inf-vote"); return }
        const grille = $("inf-vote")
        grille.textContent = ""
        vivants().forEach(function (i, k) {
            const b = document.createElement("button")
            b.type = "button"
            b.className = "choix-vote"
            b.textContent = inf.joueurs[i].nom
            b.setAttribute("aria-pressed", "false")
            b.style.animationDelay = (0.15 + k * 0.04) + "s"
            b.addEventListener("click", function () {
                inf.choix = i
                grille.querySelectorAll(".choix-vote").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false") })
                const e = $("inf-eliminer")
                e.disabled = false
                e.textContent = "Éliminer " + inf.joueurs[i].nom
            })
            grille.appendChild(b)
        })
        const e = $("inf-eliminer")
        e.disabled = true
        e.textContent = "Choisissez un joueur"
        afficher("ecran-inf-vote")
    }

    $("inf-eliminer").addEventListener("click", function () {
        if (inf.choix === null) return
        const j = inf.joueurs[inf.choix]
        j.elimine = true
        derniereElimination = inf.choix
        afficherRevelation(j)
        if (inf.decompte) { $("inf-rev-detail").textContent += " Votes : " + inf.decompte + "."; inf.derniersVotes = inf.decompte; inf.decompte = null }
        else inf.derniersVotes = null
    })

    // ---------- Révélation du rôle ----------
    const NOMS_ROLES = { civil: "Civil", infiltre: "Infiltré", white: "Mister White" }

    function afficherRevelation(j) {
        $("inf-rev-tour").textContent = "Tour " + inf.tour
        $("inf-rev-nom").textContent = j.nom
        const role = $("inf-rev-role")
        role.className = "role-revele " + j.role
        role.textContent = NOMS_ROLES[j.role]
        // relance l'animation
        role.style.animation = "none"; void role.offsetWidth; role.style.animation = ""
        const detail = $("inf-rev-detail")
        $("inf-white-devine").hidden = true
        $("inf-continuer").hidden = false

        if (j.role === "civil") {
            detail.textContent = "Aïe, un innocent est tombé. Son mot reste secret jusqu'à la fin."
            son("erreur")
        } else if (j.role === "infiltre") {
            detail.textContent = "Bien vu ! Son mot reste secret jusqu'à la fin de la partie."
            son("trouve")
        } else {
            detail.textContent = "Démasqué… mais il a encore une chance."
            son("trouve")
            $("inf-white-devine").hidden = false
            $("inf-white-consigne").innerHTML = estEnLigne(j.nom)
                ? j.nom + " tape sa réponse <b>sur son téléphone</b>… (ou ici, s'il préfère)"
                : "Mister White, prends le téléphone et tape <b>en secret</b> le mot des civils. Une seule chance&#160;!"
            $("inf-white-mot").value = ""
            $("inf-white-valider").disabled = true
            $("inf-continuer").hidden = true
        }
        const fin = verifierFin()
        $("inf-continuer").textContent = fin ? "Voir le résultat" : "Tour suivant"
        afficher("ecran-inf-revelation")
    }

    // Mister White tape sa réponse : l'app vérifie (accents, majuscules, article et petite faute tolérés)
    function normaliser(t) {
        return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[’']/g, " ").replace(/[^a-z0-9 ]/g, " ")
            .replace(/^\s*(le|la|les|l|un|une|des|du|de|d)\s+/, "")
            .replace(/\s+/g, " ").trim()
    }
    function distance(a, b) {
        const m = []
        for (let i = 0; i <= a.length; i++) { m[i] = [i]; for (let j = 1; j <= b.length; j++) m[i][j] = i ? Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) : j }
        return m[a.length][b.length]
    }
    function bonneReponse(prop, mot) {
        const p = normaliser(prop), m = normaliser(mot)
        if (!p) return false
        if (p === m || p.replace(/s$/, "") === m.replace(/s$/, "") || p.replace(/ /g, "") === m.replace(/ /g, "")) return true
        return m.length >= 5 && distance(p, m) <= 1
    }
    $("inf-white-mot").addEventListener("input", function () { $("inf-white-valider").disabled = !this.value.trim() })
    $("inf-white-mot").addEventListener("keydown", function (e) { if (e.key === "Enter" && this.value.trim()) { e.preventDefault(); $("inf-white-valider").click() } })
    $("inf-white-valider").addEventListener("click", function () {
        const champ = $("inf-white-mot")
        if (!champ.value.trim()) return
        champ.blur()
        const proposition = champ.value
        champ.value = ""   // on n'en garde aucune trace à l'écran
        const civil = inf.joueurs.filter(function (j) { return j.role === "civil" })[0]
        $("inf-white-devine").hidden = true
        if (civil && bonneReponse(proposition, civil.mot)) {
            son("lancer")
            $("inf-rev-detail").textContent = "Incroyable, il a trouvé ! Le mot était « " + civil.mot + " »."
            const c = $("inf-continuer")
            c.textContent = "Voir le résultat"
            c.hidden = false
            inf.whiteGagne = true
            return
        }
        son("erreur")
        $("inf-rev-detail").textContent = "Raté ! Le mot des civils reste secret."
        const fin = verifierFin()
        const c = $("inf-continuer")
        c.textContent = fin ? "Voir le résultat" : "Tour suivant"
        c.hidden = false
    })

    function verifierFin() {
        const v = vivants().map(function (i) { return inf.joueurs[i] })
        const imposteurs = v.filter(function (j) { return j.role !== "civil" }).length
        const civils = v.length - imposteurs
        if (imposteurs === 0) return "civils"
        if (civils <= 1) return "imposteurs"
        return null
    }

    $("inf-continuer").addEventListener("click", function () {
        if (inf.whiteGagne) { terminer("white"); return }
        const fin = verifierFin()
        if (fin) terminer(fin)
        else { inf.tour++; preparerTour() }
    })

    // ---------- Fin de partie ----------
    function terminer(gagnant) {
        enJeuINF = false
        if (window.garderEcranAllume) window.garderEcranAllume(false)
        const titre = $("inf-fin-titre")
        if (gagnant === "civils") titre.textContent = "Les civils gagnent"
        else if (gagnant === "white") titre.textContent = "Mister White gagne"
        else {
            const plusieurs = inf.joueurs.filter(function (j) { return j.role !== "civil" }).length > 1
            titre.textContent = plusieurs ? "Les imposteurs gagnent" : "L'imposteur gagne"
        }
        $("inf-fin-mots").textContent = "Civils : « " + inf.motCivil + " » · Infiltrés : « " + inf.motInfiltre + " »"

        const bilan = $("inf-fin-bilan")
        bilan.textContent = ""
        inf.joueurs.forEach(function (j) {
            const li = document.createElement("li")
            li.className = j.role + (j.elimine ? " elimine" : "")
            const gagne = (gagnant === "civils" && j.role === "civil") ||
                (gagnant === "imposteurs" && j.role !== "civil") ||
                (gagnant === "white" && j.role === "white")
            if (gagne) li.classList.add("gagnant")
            const nom = document.createElement("span"); nom.className = "bilan-nom"; nom.textContent = j.nom
            const role = document.createElement("span"); role.className = "bilan-role"
            role.textContent = NOMS_ROLES[j.role] + (gagne ? " · gagnant" : "")
            li.appendChild(nom); li.appendChild(role)
            bilan.appendChild(li)
        })
        const imposteurs = inf.joueurs.filter(function (j) { return j.role !== "civil" }).map(function (j) { return j.nom })
        const civils = inf.joueurs.filter(function (j) { return j.role === "civil" }).map(function (j) { return j.nom })
        const blancs = inf.joueurs.filter(function (j) { return j.role === "white" }).map(function (j) { return j.nom })
        finSoiree("infiltre", gagnant === "civils"
            ? { type: "camps", gagnants: civils, points: 2, titres: [{ titre: "Le Flic", noms: civils }] }
            : { type: "camps", gagnants: gagnant === "white" ? blancs : imposteurs, points: 4, titres: [{ titre: "Le Caméléon", noms: gagnant === "white" ? blancs : imposteurs }] },
            "ecran-inf-fin")
        afficher("ecran-inf-fin")
        setTimeout(function () {
            confettis()
            son("victoire", { ensuite: function () { musique(true) } })
        }, reduit ? 0 : 500)
    }

    $("inf-rejouer").addEventListener("click", function () { son("lancer"); lancerPartie() })

    JEUX_SOIREE.infiltre = {
        enLigne: function (ecran) {
            let phase = { "ecran-inf-vus": "vus", "ecran-inf-distribution": "distribution", "ecran-inf-tour": "tour", "ecran-inf-vote": "vote", "ecran-inf-revelation": "revelation", "ecran-inf-fin": "fin" }[ecran] || "preparation"
            if (phase !== "fin" && !enJeuINF) phase = "preparation"
            if (phase === "preparation") return { public: { phase: phase } }
            const whiteAttend = phase === "revelation" && !$("inf-white-devine").hidden
            if (whiteAttend) phase = "white"
            const der = derniereElimination !== null ? inf.joueurs[derniereElimination] : null
            const prives = {}
            inf.joueurs.forEach(function (j) {
                prives[j.nom] = j.role === "white" ? { white: true, deviner: whiteAttend && der === j } : { mot: j.mot }
            })
            return {
                public: {
                    phase: phase,
                    etape: inf.tour,
                    tour: inf.tour,
                    ordre: inf.ordreNoms || [],
                    vivants: inf.joueurs.filter(function (j) { return !j.elimine }).map(function (j) { return j.nom }),
                    elimines: inf.joueurs.filter(function (j) { return j.elimine }).map(function (j) { return { nom: j.nom, role: NOMS_ROLES[j.role], or: j.role !== "civil" } }),
                    revelation: der ? { nom: der.nom, role: NOMS_ROLES[der.role], detail: $("inf-rev-detail").textContent } : null,
                    vus: phase === "vus" ? vusINF.public() : null,
                    vote: (phase === "tour" || phase === "vote") && voteINF.actif() ? voteINF.public() : null,
                    fin: phase === "fin" ? {
                        titre: $("inf-fin-titre").textContent,
                        mots: $("inf-fin-mots").textContent,
                        roles: inf.joueurs.map(function (j) { return { nom: j.nom, role: NOMS_ROLES[j.role] + (j.mot ? " · " + j.mot : "") } })
                    } : null
                },
                prives: phase === "fin" ? {} : prives
            }
        },
        surMessage: function (type, de, donnees) {
            if (type === "vu") { vusINF.recevoir(de, donnees); return }
            if (type === "vote") { voteINF.recevoir(de, donnees); return }
            // Mister White a tapé sa réponse sur son téléphone
            if (type !== "white" || $("inf-white-devine").hidden || derniereElimination === null) return
            const w = inf.joueurs[derniereElimination]
            if (!w || w.role !== "white" || w.nom.toLowerCase() !== String(de).toLowerCase()) return
            $("inf-white-mot").value = String(donnees || "")
            $("inf-white-valider").disabled = false
            $("inf-white-valider").click()
        },
        remplir: function (joueurs) {
            $("inf-joueurs").textContent = ""
            joueurs.forEach(function (n) { ajouterJoueur(n, false) })
            majReglages()
            sauver()
        },
        presents: function () { return noms() },
        ajouter: function (nom) { if (ajouterJoueur(nom, true)) sauver() }
    }

    // ---------- Abandon ----------
    window.abandonnerInfiltre = function () {
        if (!enJeuINF) return
        enJeuINF = false
        if (window.garderEcranAllume) window.garderEcranAllume(false)
    }

    charger()
})()

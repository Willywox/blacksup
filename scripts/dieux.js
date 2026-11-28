// =========================================================
// LES DIEUX — des dieux se cachent parmi les humains et se connaissent.
// Pas de chrono, pas de règle de débat : la société s'organise comme elle veut.
// Fin : plus aucun dieu (humains) ou autant de dieux que d'humains (dieux).
//
// Utilise les outils communs de jeu.js ($, son, musique, afficher, animer,
// melanger, memoire, confettis, iconeCroix, enregistrerPause, reduit)
// =========================================================

;(function () {

    const JOUEURS_MIN = 5
    const JOUEURS_MAX = 16
    const CLE_DX = "blacksup-dieux"
    const SECONDES_RECONNAISSANCE = 8

    let dx = { joueurs: [], jour: 1 }   // joueurs : [{ nom, dieu, elimine }]
    let enJeuDX = false
    let choix = null

    // ---------- Préparation ----------
    function noms() {
        return Array.from(document.querySelectorAll("#dx-joueurs .puce-texte")).map(function (t) { return t.textContent })
    }
    function aide(texte, alerte) {
        const a = $("dx-aide")
        a.textContent = texte
        a.classList.toggle("alerte", !!alerte)
    }
    function ajouterJoueur(nom, anime) {
        nom = String(nom || "").trim().slice(0, 15)
        if (!nom) return false
        const existants = noms().map(function (n) { return n.toLowerCase() })
        if (existants.length >= JOUEURS_MAX) { aide(JOUEURS_MAX + " joueurs maximum.", true); return false }
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
                { duration: 180, easing: "ease-in" }).then(function () { puce.remove(); majReglages(); sauver() })
        })
        puce.appendChild(texte)
        puce.appendChild(retirer)
        $("dx-joueurs").appendChild(puce)
        if (anime) animer(puce, [{ opacity: 0, transform: "scale(.7)" }, { opacity: 1, transform: "none" }],
            { duration: 320, easing: "cubic-bezier(.34,1.56,.64,1)" })
        majReglages()
        return true
    }
    function validerChamp() {
        const champ = $("dx-champ")
        if (ajouterJoueur(champ.value, true)) { son("clic"); champ.value = ""; sauver() }
        champ.focus({ preventScroll: true })
    }
    $("dx-ajouter").addEventListener("click", validerChamp)
    $("dx-champ").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); validerChamp() } })

    // Nombre de dieux : conseillé selon le nombre de joueurs, réglable
    let nbDieux = 2, choisiAMain = false
    function conseille(n) { return n <= 7 ? 2 : (n <= 10 ? 3 : 4) }
    function maxDieux(n) { return Math.max(1, Math.floor((n - 1) / 2)) }   // toujours plus d'humains que de dieux au départ

    function majReglages() {
        const n = noms().length
        $("dx-compte").textContent = n ? "· " + n : ""
        const max = maxDieux(Math.max(n, JOUEURS_MIN))
        if (!choisiAMain) nbDieux = Math.min(conseille(n), max)
        nbDieux = Math.max(1, Math.min(nbDieux, max))
        $("dx-nb").textContent = nbDieux
        $("dx-nb-texte").textContent = nbDieux > 1 ? "dieux" : "dieu"
        $("dx-moins").disabled = nbDieux <= 1
        $("dx-plus").disabled = nbDieux >= max
        if (n < JOUEURS_MIN) aide("Il faut au moins " + JOUEURS_MIN + " joueurs (encore " + (JOUEURS_MIN - n) + ").", false)
        else aide(nbDieux + (nbDieux > 1 ? " dieux" : " dieu") + " parmi " + n + " joueurs.", false)
        $("dx-lancer").disabled = n < JOUEURS_MIN
    }
    function changer(pas) {
        choisiAMain = true
        const avant = nbDieux
        nbDieux += pas
        majReglages()
        if (nbDieux !== avant) {
            son("clic")
            const b = $("dx-nb")
            if (!reduit) { b.classList.remove("bouge"); void b.offsetWidth; b.classList.add("bouge") }
        }
        sauver()
    }
    $("dx-moins").addEventListener("click", function () { changer(-1) })
    $("dx-plus").addEventListener("click", function () { changer(1) })

    function sauver() {
        memoire(CLE_DX, JSON.stringify({ joueurs: noms(), dieux: choisiAMain ? nbDieux : null }))
    }
    function charger() {
        let r = null
        try { r = JSON.parse(memoire(CLE_DX) || "null") } catch (e) { r = null }
        let liste = r && Array.isArray(r.joueurs) ? r.joueurs : null
        // Première fois : on reprend les joueurs de L'Infiltré s'il y en a
        if (!liste) {
            try { const inf = JSON.parse(memoire("blacksup-infiltre") || "null"); if (inf && Array.isArray(inf.joueurs)) liste = inf.joueurs } catch (e) {}
        }
        ;(liste || []).slice(0, JOUEURS_MAX).forEach(function (n) { ajouterJoueur(n, false) })
        if (r && r.dieux) { choisiAMain = true; nbDieux = r.dieux }
        majReglages()
    }

    // ---------- Lancement ----------
    function lancer() {
        const liste = noms()
        if (liste.length < JOUEURS_MIN) return
        sauver()
        const roles = []
        for (let i = 0; i < liste.length; i++) roles.push(i < nbDieux)
        melanger(roles)
        dx.joueurs = liste.map(function (nom, i) { return { nom: nom, dieu: roles[i], elimine: false } })
        dx.jour = 1
        dx.distribue = 0
        dx.partie = Date.now()
        dx.dernier = null
        enJeuDX = true
        musique(false)
        if (window.garderEcranAllume) window.garderEcranAllume(true)
        preparerDistribution()
    }
    $("dx-lancer").addEventListener("click", lancer)

    // ---------- Distribution des rôles (en secret) ----------
    function preparerDistribution() {
        while (dx.distribue < dx.joueurs.length && estEnLigne(dx.joueurs[dx.distribue].nom)) dx.distribue++
        if (dx.distribue >= dx.joueurs.length) { finDistribution(); return }
        const j = dx.joueurs[dx.distribue]
        $("dx-dist-progres").textContent = "Joueur " + (dx.distribue + 1) + " sur " + dx.joueurs.length
        $("dx-dist-nom").textContent = j.nom
        const r = $("dx-role")
        r.textContent = ""
        const titre = document.createElement("span")
        const expl = document.createElement("small")
        if (j.dieu) {
            titre.className = "dieu"
            titre.textContent = "Tu es un Dieu"
            expl.textContent = "Pendant la nuit, tu ouvriras les yeux pour découvrir les autres dieux. Cache-toi parmi les humains."
        } else {
            titre.textContent = "Tu es Humain"
            expl.textContent = "Des dieux se cachent parmi vous. Démasque-les avant qu'il soit trop tard."
        }
        r.appendChild(titre)
        r.appendChild(expl)
        $("dx-carte").classList.remove("visible", "vu")
        $("dx-vu").disabled = true
        $("dx-vu").textContent = dx.distribue === dx.joueurs.length - 1 ? "C'est vu, place à la nuit" : "C'est vu, je passe"
        if (document.getElementById("ecran-dx-distribution").classList.contains("actif")) {
            animer($("dx-dist-nom"), [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }],
                { duration: 400, easing: "cubic-bezier(.2,.7,.2,1)" })
        } else {
            afficher("ecran-dx-distribution")
        }
    }
    ;(function () {
        const carte = $("dx-carte")
        function montrer(e) {
            if (e) e.preventDefault()
            if (!carte.classList.contains("visible")) son("clic")
            carte.classList.add("visible")
        }
        function cacher() {
            if (carte.classList.contains("visible")) { carte.classList.add("vu"); $("dx-vu").disabled = false }
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
    $("dx-vu").addEventListener("click", function () {
        dx.distribue++
        if (dx.distribue < dx.joueurs.length) preparerDistribution()
        else finDistribution()
    })

    // En ligne : écran commun « qui a vu son rôle », puis la nuit
    const vusDX = suiviVus({ prefixe: "dx", quoi: "son rôle", suite: function () { preparerNuit() } })
    function finDistribution() {
        const enLigne = dx.joueurs.filter(function (j) { return estEnLigne(j.nom) }).map(function (j) { return j.nom })
        if (!enLigne.length) { preparerNuit(); return }
        vusDX.ouvrir(dx.joueurs.map(function (j) { return j.nom }), dx.joueurs.map(function (j) { return j.nom }).filter(function (n) { return enLigne.indexOf(n) === -1 }))
    }

    // ---------- La voix ----------
    const synthese = window.speechSynthesis
    let voixFr = null
    function choisirVoix() {
        if (!synthese) return
        const voix = synthese.getVoices()
        voixFr = voix.filter(function (v) { return /^fr(-|_|$)/i.test(v.lang) })
            .sort(function (a, b) { return (b.lang === "fr-FR") - (a.lang === "fr-FR") || (b.localService - a.localService) })[0] || null
    }
    if (synthese) { choisirVoix(); synthese.onvoiceschanged = choisirVoix }

    // Dit une phrase ; la promesse se termine quand la phrase est dite
    // (ou après un délai estimé si la voix n'est pas disponible / le son coupé)
    function parler(texte) {
        return new Promise(function (fini) {
            const estimation = 900 + texte.length * 70
            let termine = false
            function finir() { if (!termine) { termine = true; fini() } }
            // La voix parle même si les bruitages sont coupés : la nuit se joue les yeux fermés
            if (!synthese) { setTimeout(finir, estimation); return }
            try {
                synthese.cancel()
                const u = new SpeechSynthesisUtterance(texte)
                u.lang = "fr-FR"
                if (voixFr) u.voice = voixFr
                u.rate = .92
                u.pitch = .9
                u.onend = finir
                u.onerror = finir
                synthese.speak(u)
                setTimeout(finir, estimation + 4000)   // sécurité si la voix ne prévient pas
            } catch (e) { setTimeout(finir, estimation) }
        })
    }
    function attendre(ms) { return new Promise(function (ok) { setTimeout(ok, ms) }) }

    // ---------- La nuit ----------
    let nuitId = 0
    function preparerNuit() {
        const ecran = $("ecran-dx-nuit")
        ecran.classList.remove("en-cours")
        $("dx-nuit-surtitre").textContent = "La nuit tombe"
        $("dx-nuit-texte").textContent = "Posez le téléphone au centre. Quand tout le monde est prêt, lancez la nuit."
        $("dx-nuit-son").textContent = synthese
            ? "Montez le volume : le téléphone va vous guider à voix haute."
            : "Ce téléphone ne sait pas parler : un joueur lira les consignes à voix haute."
        etapes(0)
        $("dx-nuit-debut").textContent = "Commencer la nuit"
        afficher("ecran-dx-nuit")
    }

    function etapes(n) {
        document.querySelectorAll(".dx-etapes span").forEach(function (s, i) { s.classList.toggle("faite", i < n) })
    }
    function consigne(texte, surtitre) {
        const el = $("dx-nuit-texte")
        el.textContent = texte
        el.classList.remove("change"); void el.offsetWidth; el.classList.add("change")
        if (surtitre) $("dx-nuit-surtitre").textContent = surtitre
    }

    function lancerNuit() {
        const id = ++nuitId
        const actif = function () { return id === nuitId && enJeuDX }
        $("ecran-dx-nuit").classList.add("en-cours")
        document.body.classList.add("nuit-dieux")
        son("tic")
        consigne("Tout le monde ferme les yeux.", "La nuit tombe")
        etapes(1)
        parler("La nuit tombe sur la Terre. Tout le monde ferme les yeux.")
            .then(function () { return actif() && attendre(3000) })
            .then(function () {
                if (!actif()) return
                son("tic")
                consigne("Dieux, ouvrez les yeux… et reconnaissez-vous.", "Les dieux se réveillent")
                etapes(2)
                return parler("Dieux, ouvrez les yeux. Et reconnaissez-vous.")
            })
            .then(function () { return actif() && attendre(SECONDES_RECONNAISSANCE * 1000) })
            .then(function () {
                if (!actif()) return
                son("tic")
                consigne("Dieux, fermez les yeux.", "Les dieux se rendorment")
                etapes(3)
                return parler("Dieux, fermez les yeux.")
            })
            .then(function () { return actif() && attendre(2500) })
            .then(function () {
                if (!actif()) return
                son("lancer")
                consigne("Tout le monde peut ouvrir les yeux.", "Le jour se lève")
                etapes(4)
                return parler("Tout le monde peut ouvrir les yeux. Le jour se lève.")
            })
            .then(function () { return actif() && attendre(600) })
            .then(function () {
                if (!actif()) return
                document.body.classList.remove("nuit-dieux")
                preparerJour()
            })
    }
    $("dx-nuit-debut").addEventListener("click", lancerNuit)

    function arreterNuit() {
        nuitId++
        if (synthese) try { synthese.cancel() } catch (e) {}
        document.body.classList.remove("nuit-dieux")
        $("ecran-dx-nuit").classList.remove("en-cours")
    }

    // La pause (bouton ou téléphone mis de côté) interrompt la nuit ; elle reprend depuis le début
    enregistrerPause({
        geler: function () {
            if (!$("ecran-dx-nuit").classList.contains("en-cours")) return null
            arreterNuit()
            return { message: "La nuit reprendra depuis le début. Gardez les yeux fermés en attendant !" }
        },
        relancer: function () { lancerNuit() }
    })

    // ---------- Le jour ----------
    function vivants() { return dx.joueurs.filter(function (j) { return !j.elimine }) }

    // En ligne : chacun vote sur son téléphone, l'appli élimine le plus voté
    const voteDX = voteEnLigne({
        conteneur: $("dx-vote-ligne"), bouton: $("dx-reveler"), forcer: $("dx-reveler-forcer"),
        vivants: function () { return vivants().map(function (j) { return j.nom }) },
        surChangement: function () { majVotesJour() },
        surResultat: function (nom, d) {
            choix = dx.joueurs.findIndex(function (j) { return j.nom === nom })
            dx.decompte = voteDX.texteDecompte(d)
            $("dx-eliminer").disabled = false
            $("dx-eliminer").click()
        }
    })
    function majVotesJour() {
        const p = $("dx-jour-votes")
        p.hidden = !voteDX.actif()
        p.textContent = "Votes reçus : " + voteDX.compte() + " · chacun peut voter sur son téléphone"
    }

    function preparerJour() {
        $("dx-jour-numero").textContent = "Jour " + dx.jour
        const v = vivants()
        const dieuxRestants = v.filter(function (j) { return j.dieu }).length
        $("dx-nb-vivants").textContent = v.length
        $("dx-nb-dieux").textContent = dieuxRestants
        $("dx-nb-dieux-texte").textContent = dieuxRestants > 1 ? "dieux restants" : "dieu restant"
        const ul = $("dx-vivants")
        ul.textContent = ""
        dx.joueurs.forEach(function (j) {
            const li = document.createElement("li")
            li.textContent = j.nom
            if (j.elimine) li.className = "mort" + (j.dieu ? " dieu" : "")
            ul.appendChild(li)
        })
        // Refaire la nuit : seulement avant la première élimination
        $("dx-refaire-nuit").hidden = dx.joueurs.some(function (j) { return j.elimine })
        voteDX.nouveauTour(dx.partie + "-" + dx.jour)
        majVotesJour()
        afficher("ecran-dx-jour")
    }
    $("dx-refaire-nuit").addEventListener("click", preparerNuit)

    // ---------- Le vote ----------
    $("dx-vers-vote").addEventListener("click", function () {
        choix = null
        const enLigne = voteDX.actif()
        $("dx-vote").hidden = enLigne
        $("dx-eliminer").hidden = enLigne
        $("dx-vote-ligne").hidden = !enLigne
        $("dx-reveler").hidden = !enLigne
        $("dx-reveler-forcer").hidden = true
        if (enLigne) { voteDX.rendre(); afficher("ecran-dx-vote"); return }
        const grille = $("dx-vote")
        grille.textContent = ""
        dx.joueurs.forEach(function (j, i) {
            if (j.elimine) return
            const b = document.createElement("button")
            b.type = "button"
            b.className = "choix-vote"
            b.textContent = j.nom
            b.setAttribute("aria-pressed", "false")
            b.style.animationDelay = (0.12 + grille.children.length * 0.04) + "s"
            b.addEventListener("click", function () {
                choix = i
                grille.querySelectorAll(".choix-vote").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false") })
                const e = $("dx-eliminer")
                e.disabled = false
                e.textContent = "Éliminer " + j.nom
            })
            grille.appendChild(b)
        })
        const e = $("dx-eliminer")
        e.disabled = true
        e.textContent = "Choisissez un joueur"
        afficher("ecran-dx-vote")
    })
    $("dx-annuler-vote").addEventListener("click", preparerJour)

    $("dx-eliminer").addEventListener("click", function () {
        if (choix === null) return
        const j = dx.joueurs[choix]
        dx.dernier = choix
        j.elimine = true
        $("dx-rev-jour").textContent = "Jour " + dx.jour
        $("dx-rev-nom").textContent = j.nom
        const role = $("dx-rev-role")
        role.className = "role-revele " + (j.dieu ? "dieu" : "humain")
        role.textContent = j.dieu ? "Un Dieu" : "Humain"
        role.style.animation = "none"; void role.offsetWidth; role.style.animation = ""
        $("dx-rev-detail").textContent = j.dieu
            ? "Un dieu est tombé. " + j.nom + " se tait désormais."
            : "Un innocent de moins. " + j.nom + " n'a plus le droit de parler."
        son(j.dieu ? "trouve" : "erreur")
        const fin = verifierFin()
        $("dx-continuer").textContent = fin ? "Voir le résultat" : "Le jour continue"
        if (dx.decompte) { $("dx-rev-detail").textContent += " Votes : " + dx.decompte + "."; dx.decompte = null }
        afficher("ecran-dx-revelation")
    })

    function verifierFin() {
        const v = vivants()
        const dieux = v.filter(function (j) { return j.dieu }).length
        const humains = v.length - dieux
        if (dieux === 0) return "humains"
        if (dieux >= humains) return "dieux"   // plus aucune majorité possible pour les humains
        return null
    }

    $("dx-continuer").addEventListener("click", function () {
        const fin = verifierFin()
        if (fin) terminer(fin)
        else { dx.jour++; preparerJour() }
    })

    // ---------- Fin ----------
    function terminer(gagnant) {
        enJeuDX = false
        if (window.garderEcranAllume) window.garderEcranAllume(false)
        const dieux = dx.joueurs.filter(function (j) { return j.dieu }).map(function (j) { return j.nom })
        const liste = dieux.length > 1 ? dieux.slice(0, -1).join(", ") + " et " + dieux[dieux.length - 1] : dieux[0]
        const icone = $("dx-fin-icone")
        if (gagnant === "humains") {
            $("dx-fin-titre").textContent = "Les humains gagnent"
            $("dx-fin-sous-titre").textContent = "Tous les dieux ont été démasqués. " + (dieux.length > 1 ? "Les dieux étaient " : "Le dieu était ") + liste + "."
            icone.innerHTML = '<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"></path></svg>'
        } else {
            $("dx-fin-titre").textContent = "Les dieux gagnent"
            $("dx-fin-sous-titre").textContent = "Autant de dieux que d'humains : plus aucune majorité possible. " + (dieux.length > 1 ? "Les dieux étaient " : "Le dieu était ") + liste + "."
            icone.innerHTML = '<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12L13 2z"></path></svg>'
        }
        const bilan = $("dx-fin-bilan")
        bilan.textContent = ""
        dx.joueurs.forEach(function (j) {
            const li = document.createElement("li")
            const gagne = (gagnant === "humains") !== j.dieu
            li.className = (j.dieu ? "dieu" : "humain") + (j.elimine ? " elimine" : "") + (gagne ? " gagnant" : "")
            const nom = document.createElement("span"); nom.className = "bilan-nom"; nom.textContent = j.nom
            const role = document.createElement("span"); role.className = "bilan-role"
            role.textContent = (j.dieu ? "Dieu" : "Humain") + (gagne ? " · gagnant" : "")
            li.appendChild(nom); li.appendChild(role)
            bilan.appendChild(li)
        })
        const dieuxN = dx.joueurs.filter(function (j) { return j.dieu }).map(function (j) { return j.nom })
        const humainsN = dx.joueurs.filter(function (j) { return !j.dieu }).map(function (j) { return j.nom })
        finSoiree("dieux", gagnant === "humains"
            ? { type: "camps", gagnants: humainsN, points: 2, titres: [{ titre: "Le Chasseur de dieux", noms: humainsN }] }
            : { type: "camps", gagnants: dieuxN, points: 4, titres: [{ titre: "L'Olympien", noms: dieuxN }] },
            "ecran-dx-fin")
        afficher("ecran-dx-fin")
        setTimeout(function () {
            confettis()
            son("victoire", { ensuite: function () { musique(true) } })
        }, reduit ? 0 : 500)
    }

    $("dx-rejouer").addEventListener("click", function () { son("lancer"); lancer() })

    JEUX_SOIREE.dieux = {
        surMessage: function (type, de, donnees) {
            if (type === "vu") vusDX.recevoir(de, donnees)
            if (type === "vote") voteDX.recevoir(de, donnees)
        },
        enLigne: function (ecran) {
            let phase = { "ecran-dx-vus": "vus", "ecran-dx-distribution": "distribution", "ecran-dx-nuit": "nuit", "ecran-dx-jour": "jour", "ecran-dx-vote": "vote", "ecran-dx-revelation": "revelation", "ecran-dx-fin": "fin" }[ecran] || "preparation"
            if (phase !== "fin" && !enJeuDX) phase = "preparation"
            if (phase === "preparation") return { public: { phase: phase } }
            const der = dx.dernier !== undefined && dx.dernier !== null ? dx.joueurs[dx.dernier] : null
            const prives = {}
            dx.joueurs.forEach(function (j) { prives[j.nom] = { role: j.dieu ? "dieu" : "humain" } })
            return {
                public: {
                    phase: phase,
                    etape: dx.jour,
                    jour: dx.jour,
                    vivants: vivants().map(function (j) { return j.nom }),
                    elimines: dx.joueurs.filter(function (j) { return j.elimine }).map(function (j) { return { nom: j.nom, role: j.dieu ? "Dieu" : "Humain", or: j.dieu } }),
                    dieuxRestants: vivants().filter(function (j) { return j.dieu }).length,
                    revelation: der && der.elimine ? { nom: der.nom, role: der.dieu ? "Un Dieu" : "Humain", detail: $("dx-rev-detail").textContent } : null,
                    vus: phase === "vus" ? vusDX.public() : null,
                    vote: (phase === "jour" || phase === "vote") && voteDX.actif() ? voteDX.public() : null,
                    nuit: phase === "nuit" ? { texte: $("dx-nuit-texte").textContent, surtitre: $("dx-nuit-surtitre").textContent } : null,
                    fin: phase === "fin" ? { titre: $("dx-fin-titre").textContent, detail: $("dx-fin-sous-titre").textContent } : null
                },
                prives: phase === "fin" ? {} : prives
            }
        },
        remplir: function (joueurs) {
            $("dx-joueurs").textContent = ""
            choisiAMain = false
            joueurs.forEach(function (n) { ajouterJoueur(n, false) })
            majReglages()
            sauver()
        },
        presents: function () { return noms() },
        ajouter: function (nom) { if (ajouterJoueur(nom, true)) sauver() }
    }

    // ---------- Abandon ----------
    window.abandonnerDieux = function () {
        if (!enJeuDX) return
        enJeuDX = false
        arreterNuit()
        if (window.garderEcranAllume) window.garderEcranAllume(false)
    }

    charger()
})()

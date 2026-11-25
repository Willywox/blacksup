// =========================================================
// CRÉA'MIME — chaque équipe écrit des phrases pour l'autre,
// puis chaque joueur mime la sienne. Le chrono monte ;
// l'équipe au total le plus bas gagne.
//
// Utilise les outils communs de jeu.js ($, son, musique, afficher,
// animer, memoire, confettis, iconeCroix, SYMBOLES, enregistrerPause, reduit)
// =========================================================

;(function () {

    const JOUEURS_MIN = 2
    const JOUEURS_MAX = 10
    const MOTS_MIN_PHRASE = 3                // sujet, verbe, complément
    const PENALITE_MS = 10 * 60 * 1000       // abandon = temps écoulé + 10 minutes
    const CLE_CM = "blacksup-crea-mime"

    let cm = {
        equipes: [],      // [{ nom, joueurs: [] }, { ... }]
        phrases: [[], []],// phrases[e] = les phrases que l'équipe e devra mimer (écrites par l'autre)
        tours: [],        // [{ equipe, joueur, phrase, temps, abandon }]
        index: 0,
        ecrit: 0          // 0 : l'équipe 1 écrit pour l'équipe 2 ; 1 : l'inverse
    }
    let enJeuCM = false
    let chronoCM = { debut: 0, cumul: 0, actif: false, image: null }

    // ---------- Petits outils ----------
    function formatTemps(ms) {
        const total = Math.floor(ms / 1000)
        const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60
        const ss = String(s).padStart(2, "0")
        return h ? h + ":" + String(m).padStart(2, "0") + ":" + ss : m + ":" + ss
    }

    function remplirEquipeCM(el, e, avant, apres) {
        el.textContent = ""
        if (avant) el.append(avant)
        const sym = document.createElement("span")
        sym.className = "symbole " + SYMBOLES[e].couleur
        sym.textContent = SYMBOLES[e].signe
        sym.setAttribute("aria-hidden", "true")
        el.appendChild(sym)
        el.append(" " + cm.equipes[e].nom)
        if (apres) el.append(apres)
    }

    function nbMots(texte) { return texte.trim().split(/\s+/).filter(Boolean).length }
    function autre(e) { return 1 - e }
    function totalEquipe(e) {
        return cm.tours.filter(function (t) { return t.equipe === e && t.temps !== null })
            .reduce(function (s, t) { return s + t.temps }, 0)
    }

    // ---------- Préparation : les équipes ----------
    function joueursDe(e) {
        return Array.from(document.querySelectorAll("#cm-joueurs-" + e + " .puce-texte")).map(function (t) { return t.textContent })
    }

    function aide(texte, alerte) {
        const a = $("cm-aide")
        a.textContent = texte
        a.classList.toggle("alerte", !!alerte)
    }

    function ajouterJoueur(e, nom, anime) {
        nom = String(nom || "").trim().slice(0, 15)
        if (!nom) return false
        const tous = joueursDe(0).concat(joueursDe(1)).map(function (n) { return n.toLowerCase() })
        if (joueursDe(e).length >= JOUEURS_MAX) { aide(JOUEURS_MAX + " joueurs maximum par équipe.", true); return false }
        if (tous.indexOf(nom.toLowerCase()) !== -1) { aide("« " + nom + " » joue déjà.", true); return false }
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
                { duration: 180, easing: "ease-in" }).then(function () { puce.remove(); majPrep(); sauver() })
        })
        puce.appendChild(texte)
        puce.appendChild(retirer)
        $("cm-joueurs-" + e).appendChild(puce)
        if (anime) animer(puce, [{ opacity: 0, transform: "scale(.7)" }, { opacity: 1, transform: "none" }],
            { duration: 320, easing: "cubic-bezier(.34,1.56,.64,1)" })
        majPrep()
        return true
    }

    function majPrep() {
        const n0 = joueursDe(0).length, n1 = joueursDe(1).length
        const ok = n0 >= JOUEURS_MIN && n1 >= JOUEURS_MIN
        $("cm-lancer").disabled = !ok
        if (!ok) aide("Il faut au moins " + JOUEURS_MIN + " joueurs dans chaque équipe.", false)
        else if (n0 !== n1) aide("Équipes inégales : dans la plus petite, un joueur mimera deux fois.", false)
        else aide(n0 + " phrases à écrire pour chaque équipe.", false)
    }

    function validerChamp(e) {
        const champ = $("cm-champ-" + e)
        if (ajouterJoueur(e, champ.value, true)) { son("clic"); champ.value = ""; sauver() }
        champ.focus({ preventScroll: true })
    }
    ;[0, 1].forEach(function (e) {
        $("cm-champ-" + e).addEventListener("keydown", function (ev) {
            if (ev.key === "Enter") { ev.preventDefault(); validerChamp(e) }
        })
        $("cm-nom-" + e).addEventListener("change", sauver)
    })
    document.querySelectorAll(".cm-ajouter").forEach(function (b) {
        b.addEventListener("click", function () { validerChamp(parseInt(b.dataset.equipe, 10)) })
    })

    function sauver() {
        memoire(CLE_CM, JSON.stringify({
            noms: [$("cm-nom-0").value, $("cm-nom-1").value],
            joueurs: [joueursDe(0), joueursDe(1)]
        }))
    }
    function charger() {
        let r = null
        try { r = JSON.parse(memoire(CLE_CM) || "null") } catch (e) { r = null }
        if (r && Array.isArray(r.noms)) [0, 1].forEach(function (e) { if (r.noms[e]) $("cm-nom-" + e).value = String(r.noms[e]).slice(0, 20) })
        if (r && Array.isArray(r.joueurs)) [0, 1].forEach(function (e) {
            (r.joueurs[e] || []).slice(0, JOUEURS_MAX).forEach(function (n) { ajouterJoueur(e, n, false) })
        })
        majPrep()
    }

    // ---------- Lancement : on passe à l'écriture ----------
    function nbPhrases() { return Math.max(cm.equipes[0].joueurs.length, cm.equipes[1].joueurs.length) }

    $("cm-lancer").addEventListener("click", function () {
        sauver()
        cm.equipes = [0, 1].map(function (e) {
            return { nom: $("cm-nom-" + e).value.trim() || "Équipe " + (e + 1), joueurs: joueursDe(e) }
        })
        cm.phrases = [[], []]
        cm.tours = []
        cm.index = 0
        cm.ecrit = 0
        enJeuCM = true
        musique(false)
        if (window.garderEcranAllume) window.garderEcranAllume(true)
        preparerEcriture()
    })

    // ---------- Écriture des phrases (en secret) ----------
    function preparerEcriture() {
        const auteur = cm.ecrit, cible = autre(auteur), n = nbPhrases()
        remplirEquipeCM($("cm-ecr-titre"), auteur)
        const t = $("cm-ecr-texte")
        t.textContent = ""
        t.append(n + " phrases à faire mimer à ")
        const b = document.createElement("b")
        remplirEquipeCM(b, cible)
        t.appendChild(b)
        t.append(". Au moins un sujet, un verbe et un complément. Soyez créatifs… ou cruels !")
        $("cm-ecr-surtitre").textContent = "Équipe " + (auteur + 1) + " · l'autre équipe ne regarde pas"

        const zone = $("cm-phrases")
        zone.textContent = ""
        for (let i = 0; i < n; i++) {
            const bloc = document.createElement("div")
            bloc.className = "cm-phrase-champ"
            bloc.style.animationDelay = (0.15 + i * 0.05) + "s"
            const label = document.createElement("label")
            label.htmlFor = "cm-phrase-" + i
            const l1 = document.createElement("span"); l1.textContent = "Phrase " + (i + 1)
            const l2 = document.createElement("span"); l2.textContent = "0 mot"
            label.appendChild(l1); label.appendChild(l2)
            const champ = document.createElement("textarea")
            champ.id = "cm-phrase-" + i
            champ.rows = 2
            champ.maxLength = 160
            champ.placeholder = ["Le Père Noël boit un Coca-Cola sur la Lune", "Un chien fait du ski avec Beyoncé",
                "Ma tante danse le zouk dans un ascenseur", "Un pirate perd son dentier au karaoké",
                "Le prof de maths drague une sirène", "Batman mange des accras sous la pluie"][i % 6]
            champ.addEventListener("input", function () {
                const k = nbMots(champ.value)
                l2.textContent = k + (k > 1 ? " mots" : " mot")
                l2.classList.toggle("ok", k >= MOTS_MIN_PHRASE)
                if (k >= MOTS_MIN_PHRASE) bloc.classList.remove("incomplet")
            })
            bloc.appendChild(label)
            bloc.appendChild(champ)
            zone.appendChild(bloc)
        }
        $("cm-ecr-aide").textContent = ""
        afficher("ecran-cm-ecriture")
    }

    $("cm-valider-phrases").addEventListener("click", function () {
        const champs = Array.from(document.querySelectorAll("#cm-phrases textarea"))
        let incomplets = 0
        champs.forEach(function (c) {
            const ko = nbMots(c.value) < MOTS_MIN_PHRASE
            c.parentNode.classList.toggle("incomplet", ko)
            if (ko) incomplets++
        })
        if (incomplets) {
            son("erreur")
            const a = $("cm-ecr-aide")
            a.textContent = incomplets > 1
                ? incomplets + " phrases sont trop courtes : il faut au moins un sujet, un verbe et un complément."
                : "Une phrase est trop courte : il faut au moins un sujet, un verbe et un complément."
            a.classList.add("alerte")
            const premier = document.querySelector("#cm-phrases .incomplet textarea")
            if (premier) premier.focus()
            return
        }
        // Les phrases écrites par l'auteur sont celles que l'équipe adverse mimera
        cm.phrases[autre(cm.ecrit)] = champs.map(function (c) { return c.value.trim().replace(/\s+/g, " ") })
        preparerPassage()
    })

    // ---------- On se passe le téléphone ----------
    function preparerPassage() {
        const ok = $("cm-pas-ok")
        if (cm.ecrit === 0) {
            $("cm-pas-surtitre").textContent = "Phrases enregistrées"
            remplirEquipeCM($("cm-pas-equipe"), 1)
            const c = $("cm-pas-consigne")
            c.textContent = ""
            remplirEquipeCM(c, 0, "", ", ne regardez pas : c'est à l'autre équipe d'écrire.")
            ok.textContent = "C'est nous, on écrit"
        } else {
            $("cm-pas-surtitre").textContent = "Toutes les phrases sont prêtes"
            construireTours()
            const premier = cm.tours[0]
            $("cm-pas-equipe").textContent = premier.joueur
            const c = $("cm-pas-consigne")
            c.textContent = ""
            remplirEquipeCM(c, premier.equipe, "Premier à mimer, pour ")
            ok.textContent = "Que le mime commence"
        }
        afficher("ecran-cm-passage")
    }

    $("cm-pas-ok").addEventListener("click", function () {
        if (cm.ecrit === 0) { cm.ecrit = 1; preparerEcriture() }
        else preparerTour()
    })

    // Ordre : joueur 1 de l'équipe 1, joueur 1 de l'équipe 2, joueur 2 de l'équipe 1…
    function construireTours() {
        cm.tours = []
        const n = nbPhrases()
        for (let r = 0; r < n; r++) {
            [0, 1].forEach(function (e) {
                const joueurs = cm.equipes[e].joueurs
                cm.tours.push({
                    equipe: e,
                    joueur: joueurs[r % joueurs.length],   // la plus petite équipe recommence au début
                    phrase: cm.phrases[e][r],
                    temps: null,
                    abandon: false
                })
            })
        }
        cm.index = 0
    }

    // ---------- Annonce du tour + découverte de la phrase ----------
    function preparerTour() {
        const t = cm.tours[cm.index]
        $("cm-tour-numero").textContent = "Tour " + (cm.index + 1) + " sur " + cm.tours.length
        $("cm-tour-joueur").textContent = t.joueur
        remplirEquipeCM($("cm-tour-equipe"), t.equipe, "pour ")
        $("cm-phrase").textContent = t.phrase
        $("cm-revoir-phrase").textContent = t.phrase
        $("cm-carte").classList.remove("visible", "vu")
        $("cm-go").disabled = true
        afficher("ecran-cm-tour")
    }

    function appuiLong(el, auDebut, apresVu) {
        function montrer(e) {
            if (e) e.preventDefault()
            if (!el.classList.contains("visible") && auDebut) auDebut()
            el.classList.add("visible")
        }
        function cacher() {
            if (el.classList.contains("visible")) { el.classList.add("vu"); if (apresVu) apresVu() }
            el.classList.remove("visible")
        }
        el.addEventListener("pointerdown", montrer)
        el.addEventListener("pointerup", cacher)
        el.addEventListener("pointerleave", cacher)
        el.addEventListener("pointercancel", cacher)
        el.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "Enter") montrer(e) })
        el.addEventListener("keyup", cacher)
        el.addEventListener("blur", cacher)
    }
    appuiLong($("cm-carte"), function () { son("clic") }, function () { $("cm-go").disabled = false })
    appuiLong($("cm-revoir"))

    $("cm-go").addEventListener("click", function () {
        const t = cm.tours[cm.index]
        $("cm-mime-joueur").textContent = t.joueur
        remplirEquipeCM($("cm-mime-tour"), t.equipe, "", " · tour " + (cm.index + 1))
        $("cm-chrono").textContent = "0:00"
        $("cm-chrono").classList.remove("long", "tres-long")
        majTotalEnCours()
        desarmerAbandon()
        afficher("ecran-cm-mime")
        setTimeout(function () { demarrerChrono(0) }, reduit ? 0 : 400)
    })

    // ---------- Le chrono qui monte ----------
    function demarrerChrono(depuis) {
        chronoCM.cumul = depuis
        chronoCM.debut = performance.now()
        chronoCM.actif = true
        chronoCM.image = requestAnimationFrame(boucle)
    }
    function ecoule() { return chronoCM.cumul + (chronoCM.actif ? performance.now() - chronoCM.debut : 0) }
    function arreterChrono() {
        if (chronoCM.actif) chronoCM.cumul += performance.now() - chronoCM.debut
        chronoCM.actif = false
        cancelAnimationFrame(chronoCM.image)
    }
    let derniereSeconde = -1
    function boucle() {
        if (!chronoCM.actif) return
        const ms = ecoule()
        const sec = Math.floor(ms / 1000)
        if (sec !== derniereSeconde) {
            derniereSeconde = sec
            const c = $("cm-chrono")
            c.textContent = formatTemps(ms)
            c.classList.toggle("long", ms >= 2 * 60 * 1000 && ms < 5 * 60 * 1000)
            c.classList.toggle("tres-long", ms >= 5 * 60 * 1000)
        }
        chronoCM.image = requestAnimationFrame(boucle)
    }
    function majTotalEnCours() {
        const t = cm.tours[cm.index]
        const el = $("cm-mime-total")
        el.textContent = ""
        remplirEquipeCM(el, t.equipe, "Total ", " : " + formatTemps(totalEquipe(t.equipe)))
    }

    // La pause commune gèle aussi ce chrono
    enregistrerPause({
        geler: function () {
            if (!chronoCM.actif) return null
            arreterChrono()
            return { texte: formatTemps(chronoCM.cumul), cumul: chronoCM.cumul }
        },
        relancer: function (etat) { demarrerChrono(etat.cumul) }
    })

    // ---------- Trouvé / Abandon ----------
    let abandonArme = null
    function desarmerAbandon() {
        clearTimeout(abandonArme); abandonArme = null
        const b = $("cm-abandon")
        b.classList.remove("confirmer")
        b.textContent = "Abandon"
    }

    $("cm-trouve").addEventListener("click", function () {
        if (!chronoCM.actif) return
        arreterChrono()
        const t = cm.tours[cm.index]
        t.temps = chronoCM.cumul
        son("trouve")
        afficherResultat(t)
    })

    $("cm-abandon").addEventListener("click", function () {
        if (!chronoCM.actif) return
        const b = $("cm-abandon")
        if (!abandonArme) {
            son("clic")
            b.classList.add("confirmer")
            b.textContent = "+10 min ? Confirmer"
            abandonArme = setTimeout(desarmerAbandon, 3500)
            return
        }
        desarmerAbandon()
        arreterChrono()
        const t = cm.tours[cm.index]
        t.temps = chronoCM.cumul + PENALITE_MS
        t.abandon = true
        son("erreur")
        afficherResultat(t)
    })

    // ---------- Résultat d'un tour ----------
    function rendreTotaux(conteneur) {
        conteneur.textContent = ""
        const t0 = totalEquipe(0), t1 = totalEquipe(1)
        ;[0, 1].forEach(function (e) {
            const joues = cm.tours.filter(function (t) { return t.equipe === e && t.temps !== null }).length
            const restant = cm.tours.filter(function (t) { return t.equipe === e }).length - joues
            const div = document.createElement("div")
            const total = e === 0 ? t0 : t1, adverse = e === 0 ? t1 : t0
            div.className = "cm-total" + (joues && total < adverse ? " devant" : "")
            const nom = document.createElement("p"); nom.className = "nom"; remplirEquipeCM(nom, e)
            const tps = document.createElement("p"); tps.className = "temps"; tps.textContent = formatTemps(total)
            const det = document.createElement("p"); det.className = "detail"
            det.textContent = restant ? restant + (restant > 1 ? " phrases à mimer" : " phrase à mimer") : "Terminé"
            div.appendChild(nom); div.appendChild(tps); div.appendChild(det)
            conteneur.appendChild(div)
        })
    }

    function afficherResultat(t) {
        $("cm-res-surtitre").textContent = t.abandon ? "Abandon" : "Trouvé !"
        $("cm-res-phrase").textContent = t.phrase
        const r = $("cm-res-temps")
        r.textContent = ""
        r.append(t.joueur + " : ")
        const b = document.createElement("b")
        b.textContent = formatTemps(t.temps)
        r.appendChild(b)
        if (t.abandon) {
            const p = document.createElement("span")
            p.className = "penalite"
            p.textContent = " (dont 10 min de pénalité)"
            r.appendChild(p)
        }
        rendreTotaux($("cm-res-totaux"))
        const dernier = cm.index >= cm.tours.length - 1
        $("cm-suivant").textContent = dernier ? "Voir le résultat" : "Tour suivant"
        afficher("ecran-cm-resultat")
    }

    $("cm-suivant").addEventListener("click", function () {
        if (cm.index >= cm.tours.length - 1) afficherFin()
        else { cm.index++; preparerTour() }
    })

    // ---------- Fin de partie ----------
    function afficherFin() {
        enJeuCM = false
        if (window.garderEcranAllume) window.garderEcranAllume(false)
        const t0 = totalEquipe(0), t1 = totalEquipe(1)
        const titre = $("cm-fin-titre"), sous = $("cm-fin-sous-titre")
        let gagnant = null
        if (t0 === t1) {
            titre.textContent = "Égalité parfaite"
            sous.textContent = "Au centième près. Revanche ?"
        } else {
            gagnant = t0 < t1 ? 0 : 1
            remplirEquipeCM(titre, gagnant)
            sous.textContent = "Les plus rapides, avec " + formatTemps(Math.abs(t0 - t1)) + " d'avance"
        }
        const bilan = $("cm-fin-bilan")
        bilan.textContent = ""
        ;[0, 1].forEach(function (e) {
            const bloc = document.createElement("div")
            bloc.className = "cm-bilan-equipe" + (gagnant === e ? " gagnant" : "")
            const tete = document.createElement("div"); tete.className = "cm-bilan-tete"
            const nom = document.createElement("span"); nom.className = "nom"; remplirEquipeCM(nom, e)
            const tps = document.createElement("span"); tps.className = "temps"; tps.textContent = formatTemps(e === 0 ? t0 : t1)
            tete.appendChild(nom); tete.appendChild(tps); bloc.appendChild(tete)
            cm.tours.filter(function (t) { return t.equipe === e }).forEach(function (t) {
                const l = document.createElement("div"); l.className = "cm-bilan-ligne"
                const qui = document.createElement("span"); qui.className = "qui"; qui.textContent = t.joueur
                const c = document.createElement("span"); c.className = "chrono-joueur" + (t.abandon ? " penalite" : "")
                c.textContent = formatTemps(t.temps || 0) + (t.abandon ? " (abandon)" : "")
                const ph = document.createElement("span"); ph.className = "phrase"; ph.textContent = "« " + t.phrase + " »"
                l.appendChild(qui); l.appendChild(c); l.appendChild(ph)
                bloc.appendChild(l)
            })
            bilan.appendChild(bloc)
        })
        // Mode soirée : l'équipe la plus rapide, et le mime le plus rapide
        let rapide = null
        cm.tours.forEach(function (t) { if (t.temps !== null && !t.abandon && (!rapide || t.temps < rapide.temps)) rapide = t })
        finSoiree("crea-mime", {
            type: "equipes",
            equipes: [0, 1].map(function (e) { return { noms: cm.equipes[e].joueurs.slice(), rang: gagnant === null ? 1 : (gagnant === e ? 1 : 2) } }),
            titres: rapide ? [{ titre: "Charlie Chaplin", noms: [rapide.joueur], detail: "Mime en " + formatTemps(rapide.temps) }] : []
        }, "ecran-cm-fin")
        afficher("ecran-cm-fin")
        setTimeout(function () {
            confettis()
            son("victoire", { ensuite: function () { musique(true) } })
        }, reduit ? 0 : 500)
    }

    $("cm-rejouer").addEventListener("click", function () { afficher("ecran-cm-config") })

    JEUX_SOIREE["crea-mime"] = {
        remplir: function (equipes) {
            ;[0, 1].forEach(function (e) { $("cm-joueurs-" + e).textContent = "" })
            ;[0, 1].forEach(function (e) {
                ;(equipes[e] || []).forEach(function (n) { ajouterJoueur(e, n, false) })
            })
            majPrep()
            sauver()
        }
    }

    // ---------- Abandon de la partie (retour accueil, quitter…) ----------
    window.abandonnerCreaMime = function () {
        if (!enJeuCM) return
        enJeuCM = false
        arreterChrono()
        if (window.garderEcranAllume) window.garderEcranAllume(false)
    }

    charger()
})()

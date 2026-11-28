// =========================================================
// SONGS UP — un joueur fredonne un son, le premier qui trouve marque 1 point,
// celui qui fredonne aussi. Le premier à l'objectif gagne.
// =========================================================

;(function () {

    const CLE_SU = "blacksup-songs-up"
    let su = null           // { joueurs:[{nom,points,trouves,fredonnes}], objectif, temps, sons, index, tour, fredonneur }
    let enJeuSU = false
    let jauge = { fin: 0, image: null, active: false, derniere: null }

    const liste = listeJoueurs({
        puces: $("su-joueurs"), champ: $("su-champ"), bouton: $("su-ajouter"), aide: $("su-aide"),
        min: 3, max: 12, cle: CLE_SU,
        auChangement: function (n) {
            $("su-compte").textContent = n ? "· " + n : ""
            $("su-lancer").disabled = n < 3
        }
    })

    function valeur(nom) { const r = document.querySelector('input[name="' + nom + '"]:checked'); return r ? parseInt(r.value, 10) : 0 }
    function sauverReglages() {
        let r = {}
        try { r = JSON.parse(memoire(CLE_SU) || "{}") || {} } catch (e) { r = {} }
        r.objectif = valeur("su-objectif"); r.temps = valeur("su-temps")
        memoire(CLE_SU, JSON.stringify(r))
    }
    ;(function chargerReglages() {
        let r = null
        try { r = JSON.parse(memoire(CLE_SU) || "null") } catch (e) {}
        if (!r) return
        ;["objectif", "temps"].forEach(function (k) {
            const el = document.getElementById("su-" + k + r[k])
            if (el) el.checked = true
        })
    })()
    document.querySelectorAll('input[name="su-objectif"], input[name="su-temps"]').forEach(function (r) { r.addEventListener("change", sauverReglages) })

    // ---------- Sons à jouer ----------
    function construireSons() {
        let tous = TOUS_LES_SONGS.slice()
        if (modeAdulte) tous = tous.concat(SONGS_ADULTES)
        const vus = {}
        const uniques = tous.filter(function (s) {
            const cle = s[0].toLowerCase() + "|" + s[1].toLowerCase()
            if (vus[cle]) return false
            vus[cle] = true
            return true
        })
        melanger(uniques)
        if (modeAdulte) {
            // On place des sons « adultes » assez tôt pour qu'on en voie dans la partie
            const adultes = uniques.filter(function (s) { return SONGS_ADULTES.indexOf(s) !== -1 })
            const autres = uniques.filter(function (s) { return SONGS_ADULTES.indexOf(s) === -1 })
            const mix = []
            while (adultes.length || autres.length) {
                if (adultes.length) mix.push(adultes.shift())
                if (autres.length) mix.push(autres.shift())
                if (autres.length) mix.push(autres.shift())
            }
            return mix
        }
        return uniques
    }

    // ---------- Lancement ----------
    function lancer() {
        const noms = liste.noms()
        if (noms.length < 3) return
        liste.sauver(); sauverReglages()
        su = {
            joueurs: noms.map(function (n) { return { nom: n, points: 0, trouves: 0, fredonnes: 0 } }),
            objectif: valeur("su-objectif") || 10,
            temps: valeur("su-temps") || 45,
            sons: construireSons(),
            index: -1,
            tour: 0,
            fredonneur: Math.floor(Math.random() * noms.length)
        }
        enJeuSU = true
        musique(false)
        if (window.garderEcranAllume) window.garderEcranAllume(true)
        sonSuivant(true)
    }
    $("su-lancer").addEventListener("click", lancer)
    $("su-rejouer").addEventListener("click", function () { son("lancer"); lancer() })

    function sonActuel() { return su.sons[su.index % su.sons.length] }

    function sonSuivant(premier) {
        if (!premier) su.fredonneur = (su.fredonneur + 1) % su.joueurs.length
        su.tour++
        tirerSon()
        $("su-rev-numero").textContent = "Son " + su.tour
        $("su-rev-nom").textContent = su.joueurs[su.fredonneur].nom
        afficher("ecran-su-revelation")
    }

    function tirerSon() {
        su.index++
        const s = sonActuel()
        const el = $("su-son")
        el.textContent = ""
        const t = document.createElement("span"); t.className = "fort"; t.textContent = s[0]
        const a = document.createElement("small"); a.textContent = s[1]
        el.appendChild(t); el.appendChild(a)
        $("su-carte").classList.remove("visible", "vu")
        $("su-go").disabled = true
        const enLigneSU = carteEnLigne($("su-carte"), su.joueurs[su.fredonneur].nom, su.joueurs[su.fredonneur].nom + " voit le son sur son téléphone", $("su-go"))
        $("su-rev-etiquette").textContent = enLigneSU ? "Au tour de" : "Passe le téléphone à"
        $("su-rev-consigne").innerHTML = enLigneSU ? "Le son s'affiche sur son téléphone." : "Les autres, <b>ne regardez pas</b>&#160;!"
    }

    carteAMaintenir($("su-carte"), function () { $("su-go").disabled = false })
    carteAMaintenir($("su-revoir"))
    $("su-autre").addEventListener("click", function () {
        son("clic")
        tirerSon()
        const c = $("su-carte")
        if (!reduit) animer(c, [{ transform: "rotateY(0)" }, { transform: "rotateY(90deg)" }, { transform: "rotateY(0)" }], { duration: 420, easing: "ease-in-out" })
    })

    // ---------- Le tour ----------
    $("su-go").addEventListener("click", function () {
        const s = sonActuel()
        $("su-tour-numero").textContent = "Son " + su.tour
        $("su-tour-nom").textContent = su.joueurs[su.fredonneur].nom
        $("su-revoir-son").textContent = s[0] + " · " + s[1]
        $("su-revoir").classList.remove("visible", "vu")
        afficher("ecran-su-tour")
        lancerJauge()
    })

    function lancerJauge() {
        jauge.fin = performance.now() + su.temps * 1000
        jauge.finServeur = (window.Salle ? Salle.versServeur(Date.now() + su.temps * 1000) : 0)
        jauge.derniere = su.temps
        jauge.active = true
        $("su-jauge").classList.remove("urgent")
        $("su-tour-chrono").textContent = su.temps
        jauge.image = requestAnimationFrame(boucle)
    }
    function boucle(maintenant) {
        if (!jauge.active) return
        const reste = Math.max(0, jauge.fin - maintenant)
        $("su-jauge").style.transform = "scaleX(" + (reste / (su.temps * 1000)).toFixed(4) + ")"
        const sec = Math.ceil(reste / 1000)
        if (sec !== jauge.derniere) {
            jauge.derniere = sec
            $("su-tour-chrono").textContent = sec
            if (sec <= 5 && sec > 0) { son("tic"); $("su-jauge").classList.add("urgent") }
        }
        if (reste <= 0) {
            jauge.active = false
            son("temps-ecoule")
            resultat(null, "Temps écoulé")
            return
        }
        jauge.image = requestAnimationFrame(boucle)
    }
    function arreterJauge() { jauge.active = false; cancelAnimationFrame(jauge.image) }

    enregistrerPause({
        geler: function () {
            if (!jauge.active) return null
            const reste = Math.max(0, jauge.fin - performance.now())
            arreterJauge()
            return reste
        },
        relancer: function (reste) {
            jauge.fin = performance.now() + reste
            jauge.finServeur = (window.Salle ? Salle.versServeur(Date.now() + reste) : 0)
            jauge.active = true
            jauge.image = requestAnimationFrame(boucle)
        }
    })

    $("su-personne").addEventListener("click", function () {
        if (!jauge.active) return
        arreterJauge()
        son("erreur")
        resultat(null, "Personne n'a trouvé")
    })

    $("su-trouve").addEventListener("click", function () {
        if (!jauge.active) return
        arreterJauge()
        son("clic")
        const grille = $("su-grille")
        grille.textContent = ""
        su.joueurs.forEach(function (j, i) {
            if (i === su.fredonneur) return
            const b = document.createElement("button")
            b.type = "button"
            b.className = "choix-vote"
            b.textContent = j.nom
            b.style.animationDelay = (0.1 + grille.children.length * 0.04) + "s"
            b.addEventListener("click", function () { son("trouve"); resultat(i) })
            grille.appendChild(b)
        })
        afficher("ecran-su-qui")
    })
    $("su-qui-annuler").addEventListener("click", function () { son("erreur"); resultat(null, "Personne n'a trouvé") })

    // ---------- Résultat ----------
    function detail(j) {
        return j.trouves + (j.trouves > 1 ? " trouvés" : " trouvé") + " · " + j.fredonnes + (j.fredonnes > 1 ? " fredonnés" : " fredonné")
    }
    function joueursPourClassement() {
        return su.joueurs.map(function (j) { return { nom: j.nom, points: j.points, detail: detail(j) } })
    }

    function resultat(trouveur, titre) {
        const s = sonActuel()
        const f = su.joueurs[su.fredonneur]
        const g = $("su-res-gain")
        g.textContent = ""
        if (trouveur === null || trouveur === undefined) {
            $("su-res-surtitre").textContent = titre || "Personne n'a trouvé"
            g.textContent = "Aucun point cette fois"
        } else {
            const t = su.joueurs[trouveur]
            t.points++; t.trouves++
            f.points++; f.fredonnes++
            $("su-res-surtitre").textContent = "Trouvé !"
            g.append(t.nom + " et " + f.nom + " ")
            const b = document.createElement("b"); b.textContent = "+1"
            g.appendChild(b)
            g.append(" chacun")
        }
        $("su-res-titre").textContent = s[0]
        $("su-res-titre").classList.toggle("long", s[0].length > 18)
        $("su-res-artiste").textContent = s[1]
        rendreClassementJoueurs($("su-res-classement"), joueursPourClassement(), false)
        const fini = su.joueurs.some(function (j) { return j.points >= su.objectif })
        $("su-suivant").textContent = fini ? "Voir le classement final" : "Son suivant"
        afficher("ecran-su-resultat")
    }

    $("su-suivant").addEventListener("click", function () {
        if (su.joueurs.some(function (j) { return j.points >= su.objectif })) terminer()
        else sonSuivant(false)
    })

    // ---------- Fin ----------
    function terminer() {
        enJeuSU = false
        if (window.garderEcranAllume) window.garderEcranAllume(false)
        const gagnants = rendreClassementJoueurs($("su-fin-classement"), joueursPourClassement(), true)
        const noms = gagnants.map(function (i) { return su.joueurs[i].nom })
        $("su-fin-titre").textContent = noms.length > 1 ? noms.join(" & ") : noms[0] + " gagne"
        $("su-fin-sous-titre").textContent = noms.length > 1
            ? "Égalité au sommet avec " + su.joueurs[gagnants[0]].points + " points."
            : su.joueurs[gagnants[0]].points + " points en " + su.tour + " sons. Une oreille en or."
        finSoiree("songs-up", {
            type: "individuel",
            classement: su.joueurs.map(function (j) { return { nom: j.nom, points: j.points } }),
            titres: [{ titre: "Le Shazam humain", noms: noms }]
        }, "ecran-su-fin")
        afficher("ecran-su-fin")
        setTimeout(function () {
            confettis()
            son("victoire", { ensuite: function () { musique(true) } })
        }, reduit ? 0 : 500)
    }

    JEUX_SOIREE["songs-up"] = {
        enLigne: function (ecran) {
            const phase = { "ecran-su-revelation": "revelation", "ecran-su-tour": "tour", "ecran-su-qui": "qui", "ecran-su-resultat": "resultat", "ecran-su-fin": "fin" }[ecran] || "preparation"
            if (phase === "preparation" || !su) return { public: { phase: "preparation" } }
            const f = su.joueurs[su.fredonneur]
            const s = sonActuel()
            const prives = {}
            if (phase === "revelation" || phase === "tour" || phase === "qui") prives[f.nom] = { titre: s[0], artiste: s[1] }
            return {
                public: {
                    phase: phase,
                    etape: su.tour,
                    numero: su.tour,
                    fredonneur: f.nom,
                    objectif: su.objectif,
                    finServeur: phase === "tour" && jauge.active ? jauge.finServeur : null,
                    resultat: phase === "resultat" ? { titre: s[0], artiste: s[1], gain: $("su-res-gain").textContent } : null,
                    fin: phase === "fin" ? { titre: $("su-fin-titre").textContent, detail: $("su-fin-sous-titre").textContent } : null,
                    scores: scoresIndividuels(su.joueurs)
                },
                prives: prives
            }
        },
        surMessage: function (type, de) {
            if (type === "autre-son" && document.getElementById("ecran-su-revelation").classList.contains("actif") && su.joueurs[su.fredonneur].nom.toLowerCase() === String(de).toLowerCase()) $("su-autre").click()
        }, remplir: function (joueurs) { liste.remplacer(joueurs) }, presents: liste.noms, ajouter: liste.ajouter }

    window.abandonnerSongsUp = function () {
        if (!enJeuSU) return
        enJeuSU = false
        arreterJauge()
        if (window.garderEcranAllume) window.garderEcranAllume(false)
    }
})()

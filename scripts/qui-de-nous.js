// =========================================================
// QUI DE NOUS ? — une question, compte à rebours, tout le monde pointe.
// Pas de joueurs à saisir, pas de points.
// =========================================================

;(function () {

    let pioche = [], adultePioche = null, numero = 0
    let etat = "question"      // "question" | "decompte" | "pointe"
    let minuteurs = []

    function nettoyer() { minuteurs.forEach(clearTimeout); minuteurs = [] }

    function questionSuivante() {
        nettoyer()
        if (!pioche.length || adultePioche !== modeAdulte) {
            if (adultePioche !== modeAdulte) numero = 0
            pioche = melanger((modeAdulte ? QUI_DE_NOUS_ADULTES : QUI_DE_NOUS).slice())
            adultePioche = modeAdulte
        }
        numero++
        etat = "question"
        $("qdn-numero").textContent = "Question " + numero
        const q = $("qdn-question")
        q.textContent = pioche.pop()
        q.classList.remove("entre"); void q.offsetWidth; q.classList.add("entre")
        $("qdn-carte").classList.remove("decompte")
        const d = $("qdn-decompte")
        d.className = "qdn-decompte"; d.textContent = ""
        $("qdn-pointez").textContent = "3, 2, 1… pointez !"
        votes = {}
        $("qdn-resultats").hidden = true
        $("qdn-carte").hidden = false
        majVotes()
        $("qdn-pointez").disabled = false
        $("qdn-passer").hidden = false
    }

    function decompte() {
        etat = "decompte"
        pointezServeur = window.Salle ? Salle.versServeur(Date.now() + 2700) : null
        if (window.diffuserJeu) diffuserJeu()
        $("qdn-pointez").disabled = true
        $("qdn-passer").hidden = true
        $("qdn-question").classList.remove("entre")
        $("qdn-carte").classList.add("decompte")
        const d = $("qdn-decompte")
        ;["3", "2", "1"].forEach(function (c, i) {
            minuteurs.push(setTimeout(function () {
                son("tic")
                d.className = "qdn-decompte"; void d.offsetWidth
                d.textContent = c
                d.classList.add("bat")
            }, i * 900))
        })
        minuteurs.push(setTimeout(function () {
            etat = "pointe"
            son("lancer")
            $("qdn-carte").classList.remove("decompte")
            $("qdn-question").classList.remove("entre")
            d.className = "qdn-decompte"; void d.offsetWidth
            d.textContent = "Pointez !"
            d.classList.add("pointez")
            if (navigator.vibrate) try { navigator.vibrate(120) } catch (e) {}
            const b = $("qdn-pointez")
            b.disabled = false
            b.textContent = Object.keys(votes).length ? "Voir les résultats" : "Question suivante"
        }, 2700))
    }

    $("qdn-pointez").addEventListener("click", function () {
        if (etat === "question") decompte()
        else if (etat === "pointe" && Object.keys(votes).length) afficherResultats()
        else if (etat === "pointe" || etat === "resultats") questionSuivante()
    })

    // ---------- En ligne : chacun désigne quelqu'un sur son téléphone ----------
    let votes = {}, resultats = []
    function candidats() {
        const s = window.Soiree && Soiree.etatPublic ? Soiree.etatPublic() : null
        if (s && s.classement) return s.classement.map(function (j) { return j.nom })
        return window.Salle ? Salle.connectes() : []
    }
    function majVotes() {
        const p = $("qdn-votes")
        const enLigne = window.Salle && Salle.actif() && Salle.connectes().length
        p.hidden = !enLigne
        const n = Object.keys(votes).length
        p.textContent = "Désignations reçues sur les téléphones : " + n + " / " + (enLigne ? Salle.connectes().length : 0)
        if (etat === "pointe") $("qdn-pointez").textContent = n ? "Voir les résultats" : "Question suivante"
    }
    function afficherResultats() {
        etat = "resultats"
        const compte = {}
        Object.keys(votes).forEach(function (v) { compte[votes[v]] = (compte[votes[v]] || 0) + 1 })
        resultats = Object.keys(compte).sort(function (a, b) { return compte[b] - compte[a] }).map(function (n) { return { nom: n, voix: compte[n] } })
        const ol = $("qdn-resultats")
        ol.textContent = ""
        const max = resultats.length ? resultats[0].voix : 1
        resultats.forEach(function (r, i) {
            const li = document.createElement("li")
            if (r.voix === max) li.className = "premier"
            const n = document.createElement("span"); n.className = "qdn-res-nom"; n.textContent = r.nom
            const barre = document.createElement("span"); barre.className = "qdn-res-barre"; barre.style.setProperty("--part", (r.voix / max * 100) + "%")
            const v = document.createElement("span"); v.className = "qdn-res-voix"; v.textContent = r.voix
            li.appendChild(n); li.appendChild(barre); li.appendChild(v)
            li.style.animationDelay = (i * 0.08) + "s"
            ol.appendChild(li)
        })
        $("qdn-carte").hidden = true
        ol.hidden = false
        $("qdn-pointez").textContent = "Question suivante"
        son("fin-manche")
        // Le plus désigné de la soirée aura son titre
        if (window.Soiree && Soiree.qdnDesigne) resultats.forEach(function (r) { Soiree.qdnDesigne(r.nom, r.voix) })
        if (window.diffuserJeu) diffuserJeu()
    }
    $("qdn-passer").addEventListener("click", questionSuivante)

    // En ligne : la question et le compte à rebours s'affichent sur tous les téléphones
    let pointezServeur = null
    JEUX_SOIREE["qui-de-nous"] = {
        enLigne: function () {
            return { public: { phase: etat, etape: numero, question: $("qdn-question").textContent, numero: numero, pointezServeur: etat === "question" ? null : pointezServeur,
                candidats: candidats(), votants: Object.keys(votes), resultats: etat === "resultats" ? resultats : null } }
        },
        surMessage: function (type, de, d) {
            if (type !== "qdn" || !d || d.numero !== numero || etat === "resultats" || votes[de]) return
            const c = candidats().filter(function (n) { return n.toLowerCase() === String(d.pour).toLowerCase() })[0]
            if (!c) return
            votes[de] = c
            son("clic")
            majVotes()
            if (window.diffuserJeu) diffuserJeu()
        }
    }

    // Chaque arrivée sur l'écran : nouvelle question
    new MutationObserver(function () {
        const ecran = $("ecran-qdn-jeu")
        if (ecran.classList.contains("actif")) { if (etat !== "question" || !$("qdn-question").textContent) questionSuivante() }
        else nettoyer()
    }).observe($("ecran-qdn-jeu"), { attributes: true, attributeFilter: ["class"] })
    if ($("ecran-qdn-jeu").classList.contains("actif")) questionSuivante()
})()

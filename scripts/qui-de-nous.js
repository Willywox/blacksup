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
        $("qdn-pointez").disabled = false
        $("qdn-passer").hidden = false
    }

    function decompte() {
        etat = "decompte"
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
            b.textContent = "Question suivante"
        }, 2700))
    }

    $("qdn-pointez").addEventListener("click", function () {
        if (etat === "question") decompte()
        else if (etat === "pointe") questionSuivante()
    })
    $("qdn-passer").addEventListener("click", questionSuivante)

    // Chaque arrivée sur l'écran : nouvelle question
    new MutationObserver(function () {
        const ecran = $("ecran-qdn-jeu")
        if (ecran.classList.contains("actif")) { if (etat !== "question" || !$("qdn-question").textContent) questionSuivante() }
        else nettoyer()
    }).observe($("ecran-qdn-jeu"), { attributes: true, attributeFilter: ["class"] })
    if ($("ecran-qdn-jeu").classList.contains("actif")) questionSuivante()
})()

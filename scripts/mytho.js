// =========================================================
// LE MYTHO — le conteur reçoit un thème et une consigne secrète (vérité ou mytho).
// Bonne réponse : +1. Le conteur gagne +1 par personne piégée.
// =========================================================

;(function () {

    const CLE_MY = "blacksup-mytho"
    let my = null      // { joueurs:[{nom,points,pieges,devines}], ordre:[i], position, themes, mytho, theme, votes:{} }
    let enJeuMY = false

    const liste = listeJoueurs({
        puces: $("my-joueurs"), champ: $("my-champ"), bouton: $("my-ajouter"), aide: $("my-aide"),
        min: 3, max: 12, cle: CLE_MY,
        auChangement: function (n) {
            $("my-compte").textContent = n ? "· " + n : ""
            $("my-lancer").disabled = n < 3
        }
    })
    function tours() { const r = document.querySelector('input[name="my-tours"]:checked'); return r ? parseInt(r.value, 10) : 2 }
    ;(function () {
        try { const r = JSON.parse(memoire(CLE_MY) || "null"); if (r && r.tours) { const el = document.getElementById("my-tours" + r.tours); if (el) el.checked = true } } catch (e) {}
    })()
    function sauverReglages() {
        let r = {}
        try { r = JSON.parse(memoire(CLE_MY) || "{}") || {} } catch (e) { r = {} }
        r.tours = tours()
        memoire(CLE_MY, JSON.stringify(r))
    }
    document.querySelectorAll('input[name="my-tours"]').forEach(function (r) { r.addEventListener("change", sauverReglages) })

    function lancer() {
        const noms = liste.noms()
        if (noms.length < 3) return
        liste.sauver(); sauverReglages()
        const ordre = []
        const base = melanger(noms.map(function (_, i) { return i }))
        for (let t = 0; t < tours(); t++) base.forEach(function (i) { ordre.push(i) })
        my = {
            joueurs: noms.map(function (n) { return { nom: n, points: 0, pieges: 0, devines: 0 } }),
            ordre: ordre,
            position: 0,
            themes: melanger((modeAdulte ? MYTHO_THEMES_ADULTES : MYTHO_THEMES).slice()),
        }
        enJeuMY = true
        musique(false)
        if (window.garderEcranAllume) window.garderEcranAllume(true)
        preparerSecret()
    }
    $("my-lancer").addEventListener("click", lancer)
    $("my-rejouer").addEventListener("click", function () { son("lancer"); lancer() })

    function conteur() { return my.joueurs[my.ordre[my.position]] }
    function tirerTheme() {
        if (!my.themes.length) my.themes = melanger((modeAdulte ? MYTHO_THEMES_ADULTES : MYTHO_THEMES).slice())
        my.theme = my.themes.pop()
        $("my-sec-theme").textContent = my.theme
    }

    // ---------- Consigne secrète ----------
    function preparerSecret() {
        my.mytho = Math.random() < .5
        tirerTheme()
        $("my-sec-numero").textContent = "Histoire " + (my.position + 1) + " sur " + my.ordre.length
        $("my-sec-nom").textContent = conteur().nom
        const c = $("my-consigne")
        c.textContent = ""
        const t = document.createElement("span")
        const e = document.createElement("small")
        if (my.mytho) {
            t.className = "fort"
            t.textContent = "Raconte un mytho"
            e.textContent = "Invente une histoire de A à Z, et rends-la crédible."
        } else {
            t.textContent = "Dis la vérité"
            e.textContent = "Raconte une histoire vraie… mais fais douter tout le monde."
        }
        c.appendChild(t); c.appendChild(e)
        $("my-carte").classList.remove("visible", "vu")
        $("my-vu").disabled = true
        afficher("ecran-my-secret")
    }
    carteAMaintenir($("my-carte"), function () { $("my-vu").disabled = false })
    $("my-autre").addEventListener("click", function () {
        son("clic")
        tirerTheme()
        animer($("my-sec-theme"), [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 300, easing: "ease-out" })
    })

    // ---------- Le récit ----------
    $("my-vu").addEventListener("click", function () {
        $("my-recit-numero").textContent = "Histoire " + (my.position + 1) + " sur " + my.ordre.length
        $("my-recit-nom").textContent = conteur().nom
        $("my-recit-theme").textContent = my.theme
        afficher("ecran-my-recit")
    })

    // ---------- Le vote ----------
    $("my-vers-vote").addEventListener("click", function () {
        my.votes = {}
        const grille = $("my-grille")
        grille.textContent = ""
        my.joueurs.forEach(function (j, i) {
            if (i === my.ordre[my.position]) return
            const b = document.createElement("button")
            b.type = "button"
            b.className = "choix-vote"
            b.textContent = j.nom
            b.setAttribute("aria-pressed", "false")
            b.style.animationDelay = (0.1 + grille.children.length * 0.04) + "s"
            b.addEventListener("click", function () {
                my.votes[i] = !my.votes[i]
                b.setAttribute("aria-pressed", my.votes[i] ? "true" : "false")
                majBouton()
            })
            grille.appendChild(b)
        })
        majBouton()
        afficher("ecran-my-vote")
    })
    function majBouton() {
        const n = Object.keys(my.votes).filter(function (k) { return my.votes[k] }).length
        $("my-reveler").textContent = n === 0 ? "Tout le monde a dit vrai" : "Révéler la vérité"
    }

    // ---------- Résultat ----------
    function joueursPourClassement() {
        return my.joueurs.map(function (j) {
            return { nom: j.nom, points: j.points, detail: j.devines + (j.devines > 1 ? " bonnes réponses" : " bonne réponse") + " · " + j.pieges + (j.pieges > 1 ? " piégés" : " piégé") }
        })
    }

    $("my-reveler").addEventListener("click", function () {
        const c = my.ordre[my.position]
        const conteurJ = my.joueurs[c]
        const justes = [], pieges = []
        my.joueurs.forEach(function (j, i) {
            if (i === c) return
            const aDitMytho = !!my.votes[i]
            if (aDitMytho === my.mytho) { j.points++; j.devines++; justes.push(j.nom) }
            else pieges.push(j.nom)
        })
        conteurJ.points += pieges.length
        conteurJ.pieges += pieges.length

        $("my-res-surtitre").textContent = conteurJ.nom + " · histoire " + (my.position + 1)
        const v = $("my-res-verdict")
        v.className = "role-revele " + (my.mytho ? "mytho" : "vrai")
        v.textContent = my.mytho ? "Un mytho !" : "La vérité !"
        v.style.animation = "none"; void v.offsetWidth; v.style.animation = ""

        const g = $("my-res-gain")
        g.textContent = ""
        if (pieges.length) {
            g.append(conteurJ.nom + " a piégé " + pieges.length + (pieges.length > 1 ? " personnes " : " personne "))
            const b = document.createElement("b"); b.textContent = "+" + pieges.length; g.appendChild(b)
        } else {
            g.append("Personne ne s'est fait avoir. " + conteurJ.nom + " ne marque rien.")
        }
        son(pieges.length > justes.length ? "trouve" : "clic")

        rendreClassementJoueurs($("my-res-classement"), joueursPourClassement(), false)
        $("my-suivant").textContent = my.position === my.ordre.length - 1 ? "Voir le classement final" : "Histoire suivante"
        afficher("ecran-my-resultat")
    })

    $("my-suivant").addEventListener("click", function () {
        my.position++
        if (my.position < my.ordre.length) preparerSecret()
        else terminer()
    })

    // ---------- Fin ----------
    function terminer() {
        enJeuMY = false
        if (window.garderEcranAllume) window.garderEcranAllume(false)
        const gagnants = rendreClassementJoueurs($("my-fin-classement"), joueursPourClassement(), true)
        const noms = gagnants.map(function (i) { return my.joueurs[i].nom })
        $("my-fin-titre").textContent = noms.length > 1 ? noms.join(" & ") : noms[0] + " gagne"
        // Le plus grand menteur : celui qui a piégé le plus de monde
        let menteur = null
        my.joueurs.forEach(function (j) { if (j.pieges > 0 && (!menteur || j.pieges > menteur.pieges)) menteur = j })
        $("my-fin-sous-titre").textContent = menteur
            ? "Roi du mytho : " + menteur.nom + ", avec " + menteur.pieges + (menteur.pieges > 1 ? " personnes piégées." : " personne piégée.")
            : "Personne n'a réussi à piéger qui que ce soit. Des saints."
        let devin = 0
        my.joueurs.forEach(function (j) { devin = Math.max(devin, j.devines) })
        const titres = []
        if (menteur) titres.push({ titre: "Le Roi du mytho", noms: my.joueurs.filter(function (j) { return j.pieges === menteur.pieges }).map(function (j) { return j.nom }) })
        if (devin) titres.push({ titre: "Le Détecteur de mensonges", noms: my.joueurs.filter(function (j) { return j.devines === devin }).map(function (j) { return j.nom }) })
        finSoiree("mytho", {
            type: "individuel",
            classement: my.joueurs.map(function (j) { return { nom: j.nom, points: j.points } }),
            titres: titres
        }, "ecran-my-fin")
        afficher("ecran-my-fin")
        setTimeout(function () {
            confettis()
            son("victoire", { ensuite: function () { musique(true) } })
        }, reduit ? 0 : 500)
    }

    JEUX_SOIREE.mytho = { remplir: function (joueurs) { liste.remplacer(joueurs) } }

    window.abandonnerMytho = function () {
        if (!enJeuMY) return
        enJeuMY = false
        if (window.garderEcranAllume) window.garderEcranAllume(false)
    }
})()

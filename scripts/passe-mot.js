// =========================================================
// PASSE-MOT — un mot pour en faire deviner un autre, en duos
//
// Utilise les outils communs définis dans jeu.js
// ($, son, musique, afficher, animer, melanger, SYMBOLES, confettis...)
// =========================================================

;(function () {

    const DUOS_MIN = 2
    const DUOS_MAX = 4
    const INDICES_MAX = 5          // 5 indices : 5, 4, 3, 2 puis 1 point
    const SECONDES_INDICE = 10
    const CLE_PM = "blacksup-passe-mot"

    // Les mots du jeu : ceux de Black's Up, sans les expressions trop longues
    const MOTS_PM = TOUSLESMOTS.filter(function (m) {
        return m.length <= 24 && m.split(/\s+/).length <= 3 && !/[«»:]/.test(m)
    })

    let pm = {
        duos: [],          // [{ joueurs: ["Moussa", "Awa"] }, ...]
        nbMots: 10,
        mots: [],
        index: 0,          // mot en cours (0, 1, 2...)
        indice: 1,         // indice en cours (1 à 5)
        scores: [],
        trouves: []        // nombre de mots trouvés par duo
    }
    let enJeuPM = false
    let jauge = { fin: 0, image: null, active: false, derniere: null }

    // ---------- Petits outils ----------
    function nomDuo(d) { return pm.duos[d].joueurs[0] + " & " + pm.duos[d].joueurs[1] }

    function remplirDuo(el, d, avant, apres) {
        el.textContent = ""
        if (avant) el.append(avant)
        const sym = document.createElement("span")
        sym.className = "symbole " + SYMBOLES[d].couleur
        sym.textContent = SYMBOLES[d].signe
        sym.setAttribute("aria-hidden", "true")
        el.appendChild(sym)
        el.append(" " + nomDuo(d))
        if (apres) el.append(apres)
    }

    // Dans chaque duo, les rôles s'inversent à chaque mot
    function donneur(d) { return pm.duos[d].joueurs[pm.index % 2] }
    function devineur(d) { return pm.duos[d].joueurs[(pm.index + 1) % 2] }
    // Le duo qui commence change à chaque mot ; ensuite chacun son tour
    function duoActif() { return (pm.index + pm.indice - 1) % pm.duos.length }
    function pointsEnJeu() { return INDICES_MAX + 1 - pm.indice }

    // ---------- Préparation : les duos ----------
    function blocsDuos() { return Array.from(document.querySelectorAll("#pm-liste-duos .bloc-equipe")) }

    function ajouterDuo(joueurs, anime) {
        const i = blocsDuos().length
        if (i >= DUOS_MAX) return
        const bloc = document.createElement("div")
        bloc.className = "bloc-equipe"
        const ligne = document.createElement("div")
        ligne.className = "ligne-equipe ligne-duo"

        const sym = document.createElement("span")
        sym.className = "symbole-equipe symbole " + SYMBOLES[i].couleur
        sym.textContent = SYMBOLES[i].signe
        sym.setAttribute("aria-hidden", "true")
        ligne.appendChild(sym)

        const champs = document.createElement("div")
        champs.className = "champs-duo"
        ;[0, 1].forEach(function (k) {
            const c = document.createElement("input")
            c.type = "text"
            c.className = "saisie joueur-duo"
            c.maxLength = 15
            c.autocomplete = "off"
            c.placeholder = "Joueur " + (i * 2 + k + 1)
            c.value = (joueurs && joueurs[k]) ? String(joueurs[k]).slice(0, 15) : ""
            c.setAttribute("aria-label", "Joueur " + (k + 1) + " du duo " + (i + 1))
            c.addEventListener("change", sauver)
            champs.appendChild(c)
        })
        ligne.appendChild(champs)

        if (i >= DUOS_MIN) {
            const retirer = document.createElement("button")
            retirer.type = "button"
            retirer.className = "retirer-equipe"
            retirer.setAttribute("aria-label", "Retirer le duo " + (i + 1))
            retirer.innerHTML = iconeCroix(16)
            retirer.addEventListener("click", function () {
                animer(bloc, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(20px)" }],
                    { duration: 260, easing: "ease-in" }).then(function () {
                    bloc.remove()
                    renumeroter()
                    majAjout()
                    sauver()
                })
            })
            ligne.appendChild(retirer)
        } else {
            const espace = document.createElement("span")
            espace.className = "espace-retirer"
            ligne.appendChild(espace)
        }
        bloc.appendChild(ligne)
        $("pm-liste-duos").appendChild(bloc)
        if (anime) {
            animer(bloc, [{ opacity: 0, transform: "translateY(-8px)" }, { opacity: 1, transform: "none" }],
                { duration: 380, easing: "cubic-bezier(.2,.7,.2,1)" })
            champs.querySelector("input").focus({ preventScroll: true })
        }
        majAjout()
    }

    function renumeroter() {
        blocsDuos().forEach(function (bloc, i) {
            const sym = bloc.querySelector(".symbole-equipe")
            sym.className = "symbole-equipe symbole " + SYMBOLES[i].couleur
            sym.textContent = SYMBOLES[i].signe
            bloc.querySelectorAll(".joueur-duo").forEach(function (c, k) {
                c.placeholder = "Joueur " + (i * 2 + k + 1)
                c.setAttribute("aria-label", "Joueur " + (k + 1) + " du duo " + (i + 1))
            })
            const r = bloc.querySelector(".retirer-equipe")
            if (r) r.setAttribute("aria-label", "Retirer le duo " + (i + 1))
        })
    }

    function majAjout() { $("pm-ajouter-duo").hidden = blocsDuos().length >= DUOS_MAX }

    function lireDuos() {
        return blocsDuos().map(function (bloc) {
            return {
                joueurs: Array.from(bloc.querySelectorAll(".joueur-duo")).map(function (c) {
                    return c.value.trim() || c.placeholder
                })
            }
        })
    }

    function sauver() {
        const r = {
            duos: blocsDuos().map(function (b) {
                return Array.from(b.querySelectorAll(".joueur-duo")).map(function (c) { return c.value })
            }),
            mots: parseInt(document.querySelector('input[name="pm-mots"]:checked').value, 10)
        }
        memoire(CLE_PM, JSON.stringify(r))
    }

    function charger() {
        let r = null
        try { r = JSON.parse(memoire(CLE_PM) || "null") } catch (e) { r = null }
        const duos = (r && Array.isArray(r.duos) && r.duos.length >= DUOS_MIN) ? r.duos.slice(0, DUOS_MAX) : [[], []]
        duos.forEach(function (j) { ajouterDuo(Array.isArray(j) ? j : [], false) })
        if (r && r.mots) {
            const radio = document.querySelector('input[name="pm-mots"][value="' + r.mots + '"]')
            if (radio) radio.checked = true
        }
    }

    $("pm-ajouter-duo").addEventListener("click", function () { ajouterDuo([], true); sauver() })
    document.querySelectorAll('input[name="pm-mots"]').forEach(function (r) { r.addEventListener("change", sauver) })

    // ---------- Lancement ----------
    $("pm-lancer").addEventListener("click", function () {
        sauver()
        pm.duos = lireDuos()
        pm.nbMots = parseInt(document.querySelector('input[name="pm-mots"]:checked').value, 10)
        pm.mots = melanger(MOTS_PM.slice()).slice(0, pm.nbMots)
        pm.index = 0
        pm.scores = pm.duos.map(function () { return 0 })
        pm.trouves = pm.duos.map(function () { return 0 })
        enJeuPM = true
        musique(false)
        if (window.garderEcranAllume) window.garderEcranAllume(true)
        preparerRevelation()
    })

    // ---------- 1. Révélation du mot (en secret) ----------
    function preparerRevelation() {
        pm.indice = 1
        $("pm-rev-numero").textContent = "Mot " + (pm.index + 1) + " sur " + pm.nbMots
        const liste = $("pm-rev-donneurs")
        liste.textContent = ""
        pm.duos.forEach(function (_, d) {
            const p = document.createElement("p")
            const sym = document.createElement("span")
            sym.className = "symbole " + SYMBOLES[d].couleur
            sym.textContent = SYMBOLES[d].signe
            sym.setAttribute("aria-hidden", "true")
            p.appendChild(sym)
            p.append(" " + donneur(d))
            liste.appendChild(p)
        })
        $("pm-mot").textContent = pm.mots[pm.index]
        $("pm-revoir-mot").textContent = pm.mots[pm.index]
        const carte = $("pm-carte-secrete")
        carte.classList.remove("visible", "vu")
        afficher("ecran-pm-revelation")
    }

    // Appui long pour voir (le mot se cache dès qu'on relâche)
    function appuiLong(el, auDebut) {
        function montrer(e) {
            if (e) e.preventDefault()
            if (!el.classList.contains("visible") && auDebut) auDebut()
            el.classList.add("visible")
        }
        function cacher() {
            if (el.classList.contains("visible")) el.classList.add("vu")
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
    appuiLong($("pm-carte-secrete"), function () { son("clic") })
    appuiLong($("pm-revoir"))

    $("pm-prets").addEventListener("click", function () { preparerIndice() })

    // ---------- 2. Le duel : un indice, une réponse ----------
    function preparerIndice() {
        const d = duoActif()
        $("pm-duel-numero").textContent = "Mot " + (pm.index + 1) + " / " + pm.nbMots
        const pts = pointsEnJeu()
        $("pm-duel-points").textContent = pts + (pts > 1 ? " points" : " point")
        $("pm-num-indice").textContent = pm.indice
        remplirDuo($("pm-duel-duo"), d)
        $("pm-duel-roles").textContent = donneur(d) + " donne un mot · " + devineur(d) + " propose"

        const pastilles = $("pm-indices")
        pastilles.textContent = ""
        for (let k = 1; k <= INDICES_MAX; k++) {
            const sp = document.createElement("span")
            sp.textContent = INDICES_MAX + 1 - k
            if (k < pm.indice) sp.className = "utilise"
            else if (k === pm.indice) sp.className = "actuel"
            pastilles.appendChild(sp)
        }
        $("pm-revoir").classList.remove("visible")

        if (document.getElementById("ecran-pm-duel").classList.contains("actif")) {
            // Changement d'indice sans changer d'écran : petite animation
            animer($("pm-duel-duo"), [
                { opacity: 0, transform: "translateY(12px)" },
                { opacity: 1, transform: "none" }
            ], { duration: 380, easing: "cubic-bezier(.2,.7,.2,1)" })
            lancerJauge()
        } else {
            afficher("ecran-pm-duel")
            setTimeout(lancerJauge, reduit ? 0 : 420)
        }
    }

    function lancerJauge() {
        arreterJauge()
        jauge.fin = performance.now() + SECONDES_INDICE * 1000
        jauge.derniere = SECONDES_INDICE
        jauge.active = true
        $("pm-jauge").classList.remove("urgent")
        jauge.image = requestAnimationFrame(boucleJauge)
    }

    function boucleJauge(maintenant) {
        if (!jauge.active) return
        const reste = Math.max(0, jauge.fin - maintenant)
        $("pm-jauge").style.transform = "scaleX(" + (reste / (SECONDES_INDICE * 1000)).toFixed(4) + ")"
        const sec = Math.ceil(reste / 1000)
        if (sec !== jauge.derniere) {
            jauge.derniere = sec
            if (sec <= 3 && sec > 0) { son("tic"); $("pm-jauge").classList.add("urgent") }
        }
        if (reste <= 0) {
            jauge.active = false
            son("temps-ecoule")
            indiceRate(true)
            return
        }
        jauge.image = requestAnimationFrame(boucleJauge)
    }

    function arreterJauge() {
        jauge.active = false
        cancelAnimationFrame(jauge.image)
    }

    let verrouPM = false
    function verrouiller() { verrouPM = true; setTimeout(function () { verrouPM = false }, 450) }

    $("pm-trouve").addEventListener("click", function () {
        if (!enJeuPM || verrouPM || !jauge.active) return
        verrouiller()
        arreterJauge()
        const d = duoActif()
        const gain = pointsEnJeu()
        pm.scores[d] += gain
        pm.trouves[d]++
        son("trouve")
        afficherResultat(d, gain)
    })

    $("pm-rate").addEventListener("click", function () {
        if (!enJeuPM || verrouPM || !jauge.active) return
        verrouiller()
        arreterJauge()
        son("erreur")
        indiceRate(false)
    })

    function indiceRate(tempsEcoule) {
        animer($("pm-duel-duo"), [
            { transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(7px)" },
            { transform: "translateX(-4px)" }, { transform: "translateX(0)" }
        ], { duration: 380, easing: "ease-out" })
        setTimeout(function () {
            if (!enJeuPM) return
            if (pm.indice >= INDICES_MAX) {
                afficherResultat(null, 0)
            } else {
                pm.indice++
                preparerIndice()
            }
        }, tempsEcoule ? 700 : 420)
    }

    // ---------- 3. Résultat du mot ----------
    function rendreClassement(ol, mettreEnAvant) {
        ol.textContent = ""
        const ordre = pm.duos.map(function (_, d) { return d })
            .sort(function (a, b) { return pm.scores[b] - pm.scores[a] || a - b })
        const rangs = []
        ordre.forEach(function (d, pos) {
            rangs[d] = pos > 0 && pm.scores[d] === pm.scores[ordre[pos - 1]] ? rangs[ordre[pos - 1]] : pos + 1
        })
        ordre.forEach(function (d) {
            const li = document.createElement("li")
            li.className = "carte-equipe" + (rangs[d] === 1 && pm.scores[d] > 0 ? " premier" : "")
            if (mettreEnAvant && rangs[d] === 1) li.classList.add("vainqueur")
            const rang = document.createElement("p"); rang.className = "rang"; rang.textContent = rangs[d]
            const milieu = document.createElement("div"); milieu.style.minWidth = "0"
            const nom = document.createElement("p"); nom.className = "nom"; remplirDuo(nom, d)
            const detail = document.createElement("p"); detail.className = "detail"
            detail.textContent = pm.trouves[d] + (pm.trouves[d] > 1 ? " mots trouvés" : " mot trouvé")
            milieu.appendChild(nom); milieu.appendChild(detail)
            const tot = document.createElement("p"); tot.className = "total"; tot.textContent = pm.scores[d]
            li.appendChild(rang); li.appendChild(milieu); li.appendChild(tot)
            ol.appendChild(li)
        })
        return { ordre: ordre, rangs: rangs }
    }

    function afficherResultat(d, gain) {
        $("pm-res-mot").textContent = pm.mots[pm.index]
        const g = $("pm-res-gain")
        g.textContent = ""
        if (d === null) {
            $("pm-res-surtitre").textContent = "Personne n'a trouvé"
            g.textContent = "Aucun point cette fois"
        } else {
            $("pm-res-surtitre").textContent = pm.indice === 1 ? "Du premier coup !" : "Trouvé !"
            remplirDuo(g, d)
            g.append(" ")
            const b = document.createElement("b")
            b.textContent = "+" + gain
            g.appendChild(b)
            g.append(gain > 1 ? " points" : " point")
        }
        rendreClassement($("pm-res-classement"), false)
        const dernier = pm.index >= pm.nbMots - 1
        $("pm-suivant").textContent = dernier ? "Voir le classement final" : "Mot suivant"
        afficher("ecran-pm-resultat")
    }

    $("pm-suivant").addEventListener("click", function () {
        if (pm.index >= pm.nbMots - 1) {
            afficherFin()
        } else {
            pm.index++
            preparerRevelation()
        }
    })

    // ---------- 4. Fin de partie ----------
    function afficherFin() {
        enJeuPM = false
        if (window.garderEcranAllume) window.garderEcranAllume(false)
        const res = rendreClassement($("pm-fin-classement"), true)
        const enTete = res.ordre.filter(function (d) { return res.rangs[d] === 1 })
        const titre = $("pm-fin-titre"), sous = $("pm-fin-sous-titre")
        sous.textContent = ""
        if (enTete.length === 1) {
            remplirDuo(titre, enTete[0])
            sous.textContent = "Le duo le plus connecté de la soirée"
        } else {
            titre.textContent = enTete.length === pm.duos.length ? "Égalité parfaite" : "Égalité au sommet"
            enTete.forEach(function (d, k) {
                const sp = document.createElement("span")
                remplirDuo(sp, d)
                if (k > 0) sous.append(k === enTete.length - 1 ? " et " : ", ")
                sous.appendChild(sp)
            })
        }
        afficher("ecran-pm-fin")
        setTimeout(function () {
            res.ordre.forEach(function (d, pos) {
                const tot = $("pm-fin-classement").children[pos].querySelector(".total")
                compterJusqua(tot, pm.scores[d])
            })
            confettis()
            son("victoire", { ensuite: function () { musique(true) } })
        }, reduit ? 0 : 600)
    }

    $("pm-rejouer").addEventListener("click", function () { afficher("ecran-pm-config") })

    // ---------- Abandon (retour à l'accueil, bouton retour du téléphone...) ----------
    window.abandonnerPasseMot = function () {
        if (!enJeuPM) return
        enJeuPM = false
        arreterJauge()
        if (window.garderEcranAllume) window.garderEcranAllume(false)
    }

    // Le téléphone passe à autre chose en plein indice : on relance l'indice au retour
    document.addEventListener("visibilitychange", function () {
        if (!document.hidden && enJeuPM && document.getElementById("ecran-pm-duel").classList.contains("actif") && !jauge.active) {
            lancerJauge()
        } else if (document.hidden && jauge.active) {
            arreterJauge()
        }
    })

    charger()
})()

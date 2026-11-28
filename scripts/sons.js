// =========================================================
// BLACK'S UP! — les sons
//
// Deux « pistes » séparées :
//  - les EFFETS (clic, trouvé, erreur...) : un seul à la fois.
//    Un nouveau son coupe immédiatement celui qui jouait.
//  - l'AMBIANCE : musique en boucle sur l'accueil, les règles et
//    les paramètres ; elle s'arrête quand le premier joueur joue
//    et revient après la fin de la partie.
// =========================================================

const Sons = (function () {

    // Volume de chaque son (1 = plein volume), réglé pour qu'ils
    // paraissent tous à peu près aussi forts les uns que les autres
    const SONS = {
        "clic":          { fichier: "sons/clic.mp3",         volume: 0.70 },
        "tic":           { fichier: "sons/tic.mp3",          volume: 0.50 },
        "lancer":        { fichier: "sons/lancer.mp3",       volume: 0.58 },
        "trouve":        { fichier: "sons/trouve.mp3",       volume: 0.70 },
        "erreur":        { fichier: "sons/erreur.mp3",       volume: 0.37 },
        "temps-ecoule":  { fichier: "sons/temps-ecoule.mp3", volume: 1.00 },
        "fin-manche":    { fichier: "sons/fin-manche.mp3",   volume: 1.00 },
        "victoire":      { fichier: "sons/victoire.mp3",     volume: 0.78 },
        "ambiance":      { fichier: "sons/ambiance.wav",     volume: 0.30 }
    }

    const CLE_MUET = "blacksup-muet"
    const CLE_POSITION = "blacksup-ambiance-position"

    const Contexte = window.AudioContext || window.webkitAudioContext
    if (!Contexte) {
        // Navigateur très ancien : le jeu marche, simplement sans son
        return { jouer: function () {}, combo: function () {}, buzzer: function () {}, aToi: function () {}, ambiance: function () {}, estMuet: function () { return true }, basculerMuet: function () { return true }, invite: function () { return false }, surChangement: function () {} }
    }

    const ctx = new Contexte()
    const general = ctx.createGain()
    general.connect(ctx.destination)

    const tampons = {}         // les sons décodés, prêts à jouer
    let effetEnCours = null    // { source, gain }

    let ambianceVoulue = true  // l'ambiance doit-elle jouer sur cet écran ?
    let ambianceSource = null
    let ambianceGain = null
    let ambianceDebut = 0      // pour savoir où on en est dans la boucle
    let ambianceDecalage = 0

    function memoire(cle, valeur) {
        try {
            if (valeur === undefined) return localStorage.getItem(cle)
            localStorage.setItem(cle, valeur)
        } catch (e) { return null }
    }
    function memoireSession(cle, valeur) {
        try {
            if (valeur === undefined) return sessionStorage.getItem(cle)
            sessionStorage.setItem(cle, valeur)
        } catch (e) { return null }
    }

    // Toute première visite : le son est coupé, le haut-parleur invite à l'activer.
    // Ensuite, le choix de l'utilisateur est retenu.
    let choixFait = memoire(CLE_MUET) !== null
    let muet = choixFait ? memoire(CLE_MUET) === "1" : true
    general.gain.value = muet ? 0 : 1

    // Reprendre la musique là où elle en était sur la page précédente
    ambianceDecalage = parseFloat(memoireSession(CLE_POSITION)) || 0

    // ---------- Chargement ----------
    function charger(nom) {
        return fetch(SONS[nom].fichier)
            .then(function (rep) { return rep.arrayBuffer() })
            .then(function (donnees) {
                return new Promise(function (ok, ko) { ctx.decodeAudioData(donnees, ok, ko) })
            })
            .then(function (tampon) {
                tampons[nom] = tampon
                if (nom === "ambiance") demarrerAmbiance()
            })
            .catch(function () { /* son introuvable : on continue sans */ })
    }
    Object.keys(SONS).forEach(charger)

    // ---------- Déverrouillage (obligatoire sur iPhone) ----------
    // Safari n'autorise le son qu'au moment où le doigt se RELÈVE de l'écran
    // (pas quand il se pose). On profite de ce moment pour :
    //  1. réveiller le moteur audio,
    //  2. jouer un son vide (la vieille astuce qui débloque vraiment l'iPhone),
    //  3. jouer ensuite le son qui avait été demandé pendant ce même appui.
    let enAttente = null        // { nom, options, quand } : son demandé avant le déblocage
    const ecouteurs = []

    function estDebloque() { return ctx.state === "running" }

    function deverrouiller() {
        if (estDebloque()) return
        try {
            const vide = ctx.createBuffer(1, 1, 22050)
            const src = ctx.createBufferSource()
            src.buffer = vide
            src.connect(ctx.destination)
            src.start(0)
        } catch (err) {}
        ctx.resume().then(function () {
            if (!estDebloque()) return
            ecouteurs.forEach(function (f) { f() })
            demarrerAmbiance()
            if (enAttente && performance.now() - enAttente.quand < 600) {
                const e = enAttente
                enAttente = null
                jouer(e.nom, e.options)
            }
            enAttente = null
        }).catch(function () {})
    }
    ;["touchend", "click", "keydown"].forEach(function (evt) {
        document.addEventListener(evt, deverrouiller, { capture: true, passive: true })
    })
    // Safari peut aussi « interrompre » l'audio (appel, autre app) : on reprend au prochain toucher
    ctx.onstatechange = function () { ecouteurs.forEach(function (f) { f() }) }

    // Appli en arrière-plan : on met tout en pause
    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            ctx.suspend().catch(function () {})
        } else {
            ctx.resume().catch(function () {})
        }
    })

    // ---------- Effets ----------
    function couperEffet() {
        if (!effetEnCours) return
        const e = effetEnCours
        effetEnCours = null
        try {
            // Fondu très court pour éviter un « clac » à la coupure
            e.gain.gain.cancelScheduledValues(ctx.currentTime)
            e.gain.gain.setValueAtTime(e.gain.gain.value, ctx.currentTime)
            e.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.03)
            e.source.stop(ctx.currentTime + 0.035)
        } catch (err) {}
    }

    function jouer(nom, options) {
        options = options || {}
        const tampon = tampons[nom]
        if (!tampon) return
        if (!estDebloque()) {
            enAttente = { nom: nom, options: options, quand: performance.now() }
            return
        }
        couperEffet()
        const source = ctx.createBufferSource()
        source.buffer = tampon
        const gain = ctx.createGain()
        gain.gain.value = SONS[nom].volume
        source.connect(gain).connect(general)
        source.start()
        const moi = { source: source, gain: gain }
        effetEnCours = moi
        source.onended = function () {
            if (effetEnCours === moi) effetEnCours = null
            if (options.ensuite) options.ensuite()
        }
    }

    // ---------- Ambiance ----------
    function positionAmbiance() {
        const t = tampons["ambiance"]
        if (!t || !ambianceSource) return ambianceDecalage
        return (ambianceDecalage + ctx.currentTime - ambianceDebut) % t.duration
    }

    function demarrerAmbiance() {
        const t = tampons["ambiance"]
        if (!t || !ambianceVoulue || ambianceSource || ctx.state !== "running") return
        ambianceSource = ctx.createBufferSource()
        ambianceSource.buffer = t
        ambianceSource.loop = true
        ambianceGain = ctx.createGain()
        ambianceGain.gain.setValueAtTime(0, ctx.currentTime)
        ambianceGain.gain.linearRampToValueAtTime(SONS.ambiance.volume, ctx.currentTime + 1.5)
        ambianceSource.connect(ambianceGain).connect(general)
        const depart = ambianceDecalage % t.duration
        ambianceSource.start(0, depart)
        ambianceDebut = ctx.currentTime
        ambianceDecalage = depart
    }

    function arreterAmbiance() {
        if (!ambianceSource) return
        ambianceDecalage = positionAmbiance()
        const s = ambianceSource, g = ambianceGain
        ambianceSource = null
        ambianceGain = null
        try {
            g.gain.cancelScheduledValues(ctx.currentTime)
            g.gain.setValueAtTime(g.gain.value, ctx.currentTime)
            g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8)
            s.stop(ctx.currentTime + 0.85)
        } catch (err) {}
    }

    function ambiance(oui) {
        ambianceVoulue = oui
        if (oui) demarrerAmbiance()
        else arreterAmbiance()
    }

    // Quand on change de page, on retient où en était la musique
    window.addEventListener("pagehide", function () {
        memoireSession(CLE_POSITION, String(positionAmbiance()))
    })

    // ---------- Couper / remettre le son ----------
    function basculerMuet() {
        muet = !muet
        choixFait = true
        memoire(CLE_MUET, muet ? "1" : "0")
        general.gain.cancelScheduledValues(ctx.currentTime)
        general.gain.setValueAtTime(general.gain.value, ctx.currentTime)
        general.gain.linearRampToValueAtTime(muet ? 0 : 1, ctx.currentTime + 0.25)
        if (muet) couperEffet()
        ecouteurs.forEach(function (f) { f() })
        return muet
    }

    // ---------- Clic automatique sur tous les boutons ----------
    // Un élément peut choisir son propre son avec data-son="..."
    // (data-son="aucun" : c'est le jeu qui s'en charge).
    document.addEventListener("click", function (e) {
        if (e.target.matches('input[type="radio"], input[type="checkbox"]')) return
        const el = e.target.closest(".btn, .btn-rond, .choix label, .ligne-mot, .aide-installer, .aide-fermer, .btn-son, .btn-ajouter, .retirer-equipe, .petit-btn, .interrupteur, .carte-jeu-principal, .carte-jeu-regles, .carte-jeu.bientot, .lien-discret, .choix-vote, .btn-apparence, .apercu-theme, .btn-menu-partie, .cm-ajouter")
        if (!el) return
        const nom = el.dataset.son || "clic"
        if (nom !== "aucun") jouer(nom)
    }, true)

    // Petits sons synthétisés (pas de fichier) : combos, buzzer, « c'est à toi »
    function note(freq, debut, duree, type, volume) {
        if (muet || ctx.state !== "running") return
        const o = ctx.createOscillator(), g = ctx.createGain()
        o.type = type || "triangle"
        o.frequency.setValueAtTime(freq, debut)
        g.gain.setValueAtTime(0.0001, debut)
        g.gain.exponentialRampToValueAtTime(volume || 0.25, debut + 0.012)
        g.gain.exponentialRampToValueAtTime(0.0001, debut + duree)
        o.connect(g); g.connect(general)
        o.start(debut); o.stop(debut + duree + 0.05)
    }
    const GAMME = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98]
    // Combo : plus il y a de mots dans le tour, plus l'arpège monte, s'allonge et brille
    function combo(n) {
        const t = ctx.currentTime + 0.01
        const k = Math.min(Math.max(n, 1), 8)
        for (let i = 0; i < k; i++) {
            const f = GAMME[Math.min(i + Math.floor(k / 2), GAMME.length - 1)]
            note(f, t + i * 0.055, 0.22, k >= 5 ? "square" : "triangle", k >= 5 ? 0.09 : 0.2)
            if (k >= 3) note(f * 2, t + i * 0.055, 0.16, "sine", 0.06)
        }
        if (k >= 5) {
            // accord final qui scintille
            const fin = t + k * 0.055
            ;[1046.5, 1318.51, 1567.98, 2093].forEach(function (f, i) { note(f, fin + i * 0.02, 0.6, "sine", 0.08) })
        }
    }
    function buzzer() {
        const t = ctx.currentTime + 0.01
        note(196, t, 0.18, "square", 0.12); note(146.83, t + 0.12, 0.28, "square", 0.12)
    }
    function aToi(bientot) {
        const t = ctx.currentTime + 0.01
        if (bientot) { note(880, t, 0.25, "sine", 0.15); return }
        note(880, t, 0.18, "triangle", 0.22); note(1318.51, t + 0.14, 0.35, "triangle", 0.22)
    }

    return {
        jouer: jouer,
        combo: combo,
        buzzer: buzzer,
        aToi: aToi,
        ambiance: ambiance,
        estMuet: function () { return muet },
        basculerMuet: basculerMuet,
        // Le haut-parleur doit-il inviter à toucher ? (son jamais activé, ou pas encore débloqué)
        invite: function () { return (!choixFait && muet) || (!muet && !estDebloque()) },
        surChangement: function (f) { ecouteurs.push(f) }
    }
})()

// ---------- Bouton haut-parleur (sur toutes les pages) ----------
document.addEventListener("DOMContentLoaded", function () {
    const bouton = document.createElement("button")
    bouton.type = "button"
    bouton.className = "btn-son"
    bouton.dataset.son = "aucun"

    const icones = {
        on: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z"></path><path d="M15.5 9a4 4 0 0 1 0 6"></path><path d="M18 6.5a7.5 7.5 0 0 1 0 11"></path></svg>',
        off: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z"></path><path d="M16 9.5l5 5M21 9.5l-5 5"></path></svg>'
    }

    function maj() {
        const m = Sons.estMuet()
        bouton.innerHTML = m ? icones.off : icones.on
        bouton.setAttribute("aria-label", m ? "Remettre le son" : "Couper le son")
        bouton.setAttribute("aria-pressed", m ? "true" : "false")
        bouton.classList.toggle("muet", m)
        bouton.classList.toggle("invite", Sons.invite())
    }
    Sons.surChangement(maj)

    bouton.addEventListener("click", function () {
        const m = Sons.basculerMuet()
        maj()
        if (!m) Sons.jouer("clic")
    })

    maj()
    document.body.appendChild(bouton)
})

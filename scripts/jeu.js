// =========================================================
// BLACK'S UP! — déroulement d'une partie
// (la liste des mots est dans mots.js : TOUSLESMOTS)
// =========================================================

const MANCHES = [
    { nom: "Décrivez",    consigne: "Tout est permis, sauf le mot lui-même, sa famille, ce qui sonne pareil et les traductions." },
    { nom: "Un seul mot", consigne: "Un seul mot pour faire deviner. Une seule proposition pour votre équipe." },
    { nom: "Mimez",       consigne: "Plus un mot : on mime, on fredonne, on fait des bruitages." }
]

const CIRCONFERENCE = 2 * Math.PI * 78   // longueur de l'anneau du chrono
const SECONDES_URGENTES = 5
const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches

// Les sons sont dans sons.js ; si ce fichier manque, le jeu marche sans son
function son(nom, options) { if (typeof Sons !== "undefined") Sons.jouer(nom, options) }
function musique(oui) { if (typeof Sons !== "undefined") Sons.ambiance(oui) }

// Le caractère \uFE0E force l'affichage « symbole de carte » et non en émoji (iPhone notamment)
const SYMBOLES = [
    { signe: "\u2660\uFE0E", couleur: "noir" },
    { signe: "\u2665\uFE0E", couleur: "rouge" },
    { signe: "\u2666\uFE0E", couleur: "rouge" },
    { signe: "\u2663\uFE0E", couleur: "noir" }
]
const EQUIPES_MIN = 2
const EQUIPES_MAX = 4
const MOTS_MIN = 10, MOTS_MAX = 500
const TEMPS_MIN = 10, TEMPS_MAX = 120
const CLE_REGLAGES = "blacksup-reglages"

// ---------- État de la partie ----------
let partie = {
    equipes: ["Équipe 1", "Équipe 2"],
    nbMots: 40,
    duree: 30,
    selection: [],      // les mots tirés pour toute la partie
    chapeau: [],        // les mots qui restent à deviner dans la manche
    trouves: [],        // les mots trouvés pendant le tour en cours
    manche: 0,          // 0, 1 ou 2
    equipe: 0,          // l'équipe qui joue (0 à 3)
    scores: [],         // scores[manche][équipe]
    joueurs: [],        // joueurs[équipe] = liste des prénoms
    prochainJoueur: []  // pour chaque équipe, le rang du prochain joueur (ne repart jamais à zéro)
}

let chrono = { fin: 0, image: null, derniereSeconde: null, enCours: false }
let enJeu = false   // une partie est-elle en cours ?

// ---------- Outils ----------
const $ = function (id) { return document.getElementById(id) }

function melanger(liste) {
    // Mélange de Fisher-Yates (vraiment aléatoire, contrairement à sort())
    for (let i = liste.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const tmp = liste[i]; liste[i] = liste[j]; liste[j] = tmp
    }
    return liste
}

// Mode adulte (18+) : jamais mémorisé, il repart à zéro à chaque ouverture de l'appli
let modeAdulte = false

function tirerMots(n) {
    const source = modeAdulte ? TOUSLESMOTS_ADULTES : TOUSLESMOTS
    const uniques = Array.from(new Set(source.filter(Boolean)))
    return melanger(uniques).slice(0, n)
}

function total(eq) {
    return partie.scores.reduce(function (s, m) { return s + m[eq] }, 0)
}

// Écrit « ♠ Les Rois » dans un élément (sans jamais interpréter le nom comme du HTML)
function remplirEquipe(el, i, avant, apres) {
    el.textContent = ""
    if (avant) el.append(avant)
    const sym = document.createElement("span")
    sym.className = "symbole " + SYMBOLES[i].couleur
    sym.textContent = SYMBOLES[i].signe
    sym.setAttribute("aria-hidden", "true")
    el.appendChild(sym)
    el.append("\u00A0" + partie.equipes[i])
    if (apres) el.append(apres)
}

// Le joueur qui joue pour l'équipe eq au prochain tour de cette équipe (ou null)
function joueurDe(eq, decalage) {
    const liste = partie.joueurs[eq] || []
    if (!liste.length) return null
    return liste[(partie.prochainJoueur[eq] + (decalage || 0)) % liste.length]
}

function formatDuree(sec) {
    if (sec < 60) return sec + " s"
    const m = Math.floor(sec / 60), r = sec % 60
    return m + " min" + (r ? " " + String(r).padStart(2, "0") : "")
}

function memoire(cle, valeur) {
    try {
        if (valeur === undefined) return localStorage.getItem(cle)
        localStorage.setItem(cle, valeur)
    } catch (e) { return null }
}

// Lit une couleur de l'apparence en cours (ex. couleur("or"))
function couleur(nom) {
    return getComputedStyle(document.documentElement).getPropertyValue("--" + nom).trim()
}

function animer(el, images, options) {
    if (reduit || !el.animate) return Promise.resolve()
    return el.animate(images, options).finished.catch(function () {})
}

// ---------- Changement d'écran ----------
let ecranCourant = document.querySelector(".ecran.actif")

function afficher(id) {
    const suivant = $(id)
    if (suivant === ecranCourant) return
    const precedent = ecranCourant
    ecranCourant = suivant
    document.body.classList.toggle("en-partie", ECRANS_DE_PARTIE.indexOf(id) !== -1)
    document.body.classList.toggle("sans-btn-son", ["ecran-tour", "ecran-verif", "ecran-pm-revelation", "ecran-pm-duel", "ecran-inf-distribution", "ecran-cm-ecriture", "ecran-cm-tour", "ecran-cm-mime"].indexOf(id) !== -1)
    if (reduit) {
        precedent.classList.remove("actif")
        suivant.classList.add("actif")
        window.scrollTo(0, 0)
        return
    }
    precedent.classList.add("sortie")
    setTimeout(function () {
        precedent.classList.remove("actif", "sortie")
        suivant.classList.add("actif")
        window.scrollTo(0, 0)
    }, 260)
}

// ---------- 1. Paramètres → lancement ----------
$("btn-lancer").addEventListener("click", function () {
    partie.equipes = nomsEquipesSaisis().map(function (nom, i) {
        return nom.trim() || "Équipe " + (i + 1)
    })
    // Les joueurs de chaque équipe (liste vide = on affiche juste l'équipe)
    partie.joueurs = prenomsActifs() ? joueursSaisis() : partie.equipes.map(function () { return [] })
    partie.prochainJoueur = partie.equipes.map(function () { return 0 })
    partie.nbMots = nbMotsChoisi()
    partie.duree = dureeChoisie()
    sauverReglages()
    enJeu = true
    partie.selection = tirerMots(partie.nbMots)
    partie.nbMots = partie.selection.length   // la liste adulte est plus courte : on s'adapte
    partie.scores = [0, 1, 2].map(function () { return partie.equipes.map(function () { return 0 }) })
    partie.manche = 0
    partie.equipe = 0
    // L'écran ne se met pas en veille pendant la partie
    if (window.garderEcranAllume) window.garderEcranAllume(true)
    commencerManche()
})

function commencerManche() {
    partie.chapeau = melanger(partie.selection.slice())
    preparerIntro()
}

// ---------- 2. Introduction du tour ----------
function preparerIntro() {
    const m = MANCHES[partie.manche]
    $("intro-numero").textContent = "Manche " + (partie.manche + 1)
    $("intro-nom").textContent = m.nom
    $("intro-consigne").textContent = m.consigne
    const joueur = joueurDe(partie.equipe)
    if (joueur) {
        $("intro-equipe").textContent = joueur
        remplirEquipe($("intro-sous-equipe"), partie.equipe, "de ")
        $("intro-sous-equipe").hidden = false
    } else {
        remplirEquipe($("intro-equipe"), partie.equipe)
        $("intro-sous-equipe").hidden = true
    }
    // Qui joue ensuite ? (pour que le prochain se prépare)
    const suivante = (partie.equipe + 1) % partie.equipes.length
    const joueurSuivant = joueurDe(suivante)
    remplirEquipe($("intro-ensuite"), suivante, "Ensuite : " + (joueurSuivant ? joueurSuivant + " · " : ""))
    const n = partie.chapeau.length
    $("intro-info").textContent = n + (n > 1 ? " mots restants" : " mot restant") + " · " + formatDuree(partie.duree) + " par tour"
    document.querySelectorAll("#ecran-intro .progression span").forEach(function (s, i) {
        s.className = i < partie.manche ? "faite" : (i === partie.manche ? "encours" : "")
    })
    afficher("ecran-intro")
}

$("btn-go").addEventListener("click", commencerTour)

// ---------- 3. Le tour ----------
function commencerTour() {
    musique(false)
    partie.trouves = []
    const joueurTour = joueurDe(partie.equipe)
    remplirEquipe($("tour-equipe"), partie.equipe, joueurTour ? joueurTour + " · " : "")
    $("tour-manche").textContent = "Manche " + (partie.manche + 1) + " · " + MANCHES[partie.manche].nom
    majCompteur(false)
    ecrireMot(partie.chapeau[0])
    $("chrono").classList.remove("urgent", "fini")
    $("anneau").style.strokeDashoffset = 0
    $("secondes").textContent = partie.duree
    afficher("ecran-tour")
    // Le chrono démarre quand l'écran est apparu
    setTimeout(lancerChrono, reduit ? 0 : 420)
}

function ecrireMot(mot) {
    const el = $("mot")
    el.textContent = mot
    el.classList.toggle("long", mot.length > 18 && mot.length <= 30)
    el.classList.toggle("tres-long", mot.length > 30)
}

function majCompteur(anime) {
    const n = partie.trouves.length
    const b = $("nb-trouves")
    b.textContent = n
    $("nb-trouves-texte").textContent = n > 1 ? "mots trouvés" : "mot trouvé"
    if (anime && !reduit) {
        b.classList.remove("saute"); void b.offsetWidth; b.classList.add("saute")
    }
}

function lancerChrono() {
    chrono.fin = performance.now() + partie.duree * 1000
    chrono.derniereSeconde = partie.duree
    chrono.enCours = true
    chrono.image = requestAnimationFrame(boucleChrono)
}

function boucleChrono(maintenant) {
    if (!chrono.enCours) return
    const reste = Math.max(0, chrono.fin - maintenant)
    const fraction = reste / (partie.duree * 1000)
    // L'anneau se vide en continu, de façon fluide
    $("anneau").style.strokeDashoffset = (CIRCONFERENCE * (1 - fraction)).toFixed(2)

    const sec = Math.ceil(reste / 1000)
    if (sec !== chrono.derniereSeconde) {
        chrono.derniereSeconde = sec
        const el = $("secondes")
        el.textContent = sec
        if (!reduit) { el.classList.remove("tic"); void el.offsetWidth; el.classList.add("tic") }
        if (sec <= SECONDES_URGENTES) $("chrono").classList.add("urgent")
        if (sec <= SECONDES_URGENTES && sec > 0) son("tic")
    }

    if (reste <= 0) {
        finDuTour("temps")
        return
    }
    chrono.image = requestAnimationFrame(boucleChrono)
}

function arreterChrono() {
    chrono.enCours = false
    cancelAnimationFrame(chrono.image)
}

let verrou = false   // évite les doubles clics pendant une animation

$("btn-trouve").addEventListener("click", function (e) {
    if (!chrono.enCours || verrou) return
    partie.trouves.push(partie.chapeau.shift())
    son("trouve")
    majCompteur(true)
    etincelles(e.currentTarget)

    if (partie.chapeau.length === 0) {
        finDuTour("tous")
        return
    }
    // Le mot trouvé s'envole, le suivant arrive
    verrou = true
    const mot = $("mot")
    animer(mot, [
        { opacity: 1, transform: "none", filter: "none" },
        { opacity: 0, transform: "translateY(-22px) scale(.96)", filter: "blur(4px)" }
    ], { duration: 170, easing: "ease-in", fill: "forwards" }).then(function () {
        ecrireMot(partie.chapeau[0])
        return animer(mot, [
            { opacity: 0, transform: "translateY(22px) scale(.96)", filter: "blur(4px)" },
            { opacity: 1, transform: "none", filter: "none" }
        ], { duration: 320, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" })
    }).then(function () { verrou = false })
    animer($("carte-mot"), [
        { borderColor: couleur("or") },
        { borderColor: couleur("ligne") }
    ], { duration: 600, easing: "ease-out" })
})

$("btn-erreur").addEventListener("click", function () {
    if (!chrono.enCours) return
    son("erreur")
    animer($("carte-mot"), [
        { transform: "translateX(0)" }, { transform: "translateX(-9px)" }, { transform: "translateX(8px)" },
        { transform: "translateX(-5px)" }, { transform: "translateX(3px)" }, { transform: "translateX(0)" }
    ], { duration: 420, easing: "ease-out" })
    animer($("carte-mot"), [
        { borderColor: couleur("corail") }, { borderColor: couleur("ligne") }
    ], { duration: 700, easing: "ease-out" })
    finDuTour("erreur")
})

function etincelles(bouton) {
    if (reduit) return
    const carte = $("carte-mot")
    for (let i = 0; i < 10; i++) {
        const p = document.createElement("span")
        p.className = "etincelle"
        const angle = (Math.PI * 2 * i) / 10 + Math.random() * .4
        const dist = 50 + Math.random() * 40
        p.style.left = "50%"
        p.style.top = "50%"
        p.style.setProperty("--dx", (Math.cos(angle) * dist) + "px")
        p.style.setProperty("--dy", (Math.sin(angle) * dist) + "px")
        if (i % 3 === 0) p.style.background = couleur("texte")
        carte.appendChild(p)
        p.addEventListener("animationend", function () { p.remove() })
    }
}

function finDuTour(raison) {
    if (!chrono.enCours) return
    arreterChrono()
    if (raison === "temps") son("temps-ecoule")
    const c = $("chrono")
    c.classList.remove("fini"); void c.offsetWidth; c.classList.add("fini")
    $("verif-raison").textContent =
        raison === "erreur" ? "Erreur" : raison === "tous" ? "Chapeau vide" : "Temps écoulé"
    // Petite pause pour voir la fin du chrono, puis la vérification
    setTimeout(preparerVerification, reduit ? 0 : (raison === "temps" ? 650 : 450))
}

// ---------- 4. Vérification ----------
function preparerVerification() {
    const liste = $("liste-mots")
    liste.innerHTML = ""
    if (partie.trouves.length === 0) {
        const p = document.createElement("p")
        p.className = "aucun-mot"
        p.textContent = "Aucun mot cette fois…"
        liste.appendChild(p)
    }
    partie.trouves.forEach(function (mot, i) {
        const ligne = document.createElement("label")
        ligne.className = "ligne-mot"
        ligne.style.animationDelay = (0.2 + i * 0.05) + "s"

        const caseACocher = document.createElement("input")
        caseACocher.type = "checkbox"
        caseACocher.checked = true
        caseACocher.value = mot

        const coche = document.createElement("span")
        coche.className = "coche"
        coche.setAttribute("aria-hidden", "true")
        coche.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>'

        const libelle = document.createElement("span")
        libelle.className = "libelle"
        libelle.textContent = mot

        caseACocher.addEventListener("change", function () {
            ligne.classList.toggle("retire", !caseACocher.checked)
            majVerification()
        })

        ligne.appendChild(caseACocher)
        ligne.appendChild(coche)
        ligne.appendChild(libelle)
        liste.appendChild(ligne)
    })
    majVerification()
    afficher("ecran-verif")
}

function majVerification() {
    const valides = document.querySelectorAll("#liste-mots input:checked").length
    const retires = partie.trouves.length - valides
    const titre = $("verif-titre")
    const joueurVerif = joueurDe(partie.equipe)
    remplirEquipe(titre, partie.equipe, " pour " + (joueurVerif ? joueurVerif + " · " : ""))
    const em = document.createElement("em")
    em.textContent = valides === 0 ? "Aucun mot" : valides + (valides > 1 ? " mots" : " mot")
    titre.prepend(em)
    const restants = partie.chapeau.length + retires
    $("restants").textContent = restants
    $("btn-valider-tour").textContent = restants === 0
        ? (partie.manche < 2 ? "Fin de la manche" : "Voir le résultat")
        : "Équipe suivante"
}

$("btn-valider-tour").addEventListener("click", function () {
    document.querySelectorAll("#liste-mots input").forEach(function (c) {
        if (c.checked) partie.scores[partie.manche][partie.equipe]++
        else partie.chapeau.push(c.value)
    })
    melanger(partie.chapeau)
    partie.prochainJoueur[partie.equipe]++
    partie.equipe = (partie.equipe + 1) % partie.equipes.length

    if (partie.chapeau.length === 0) afficherScores()
    else preparerIntro()
})

// ---------- 5. Classement ----------
function afficherScores() {
    const finPartie = partie.manche === 2
    const n = partie.equipes.length
    const totaux = partie.equipes.map(function (_, i) { return total(i) })

    // Ordre du classement (les ex æquo partagent le même rang)
    const ordre = partie.equipes.map(function (_, i) { return i })
        .sort(function (a, b) { return totaux[b] - totaux[a] || a - b })
    const rangs = []
    ordre.forEach(function (eq, pos) {
        rangs[eq] = pos > 0 && totaux[eq] === totaux[ordre[pos - 1]] ? rangs[ordre[pos - 1]] : pos + 1
    })
    const enTete = ordre.filter(function (eq) { return rangs[eq] === 1 })

    // Les cartes sont d'abord posées dans l'ordre des équipes, puis glissent à leur place
    const liste = $("classement")
    liste.innerHTML = ""
    const cartes = []
    for (let i = 0; i < n; i++) {
        const li = document.createElement("li")
        li.className = "carte-equipe"
        const rang = document.createElement("p"); rang.className = "rang"; rang.textContent = "–"
        const milieu = document.createElement("div"); milieu.style.minWidth = "0"
        const nom = document.createElement("p"); nom.className = "nom"; remplirEquipe(nom, i)
        const detail = document.createElement("p"); detail.className = "detail"
        detail.textContent = MANCHES.map(function (m, k) {
            return m.nom + " " + (k <= partie.manche ? partie.scores[k][i] : "–")
        }).join(" · ")
        milieu.appendChild(nom); milieu.appendChild(detail)
        const tot = document.createElement("p"); tot.className = "total"; tot.textContent = "0"
        li.appendChild(rang); li.appendChild(milieu); li.appendChild(tot)
        liste.appendChild(li)
        cartes.push(li)
    }

    // Titres
    function nomsEnTete() {
        const span = document.createElement("span")
        enTete.forEach(function (eq, k) {
            const morceau = document.createElement("span")
            remplirEquipe(morceau, eq)
            if (k > 0) span.append(k === enTete.length - 1 ? " et " : ", ")
            span.appendChild(morceau)
        })
        return span
    }
    const titre = $("score-titre"), sousTitre = $("score-sous-titre")
    sousTitre.textContent = ""
    if (finPartie) {
        $("score-surtitre").textContent = "Fin de partie"
        if (enTete.length === 1) {
            remplirEquipe(titre, enTete[0])
            sousTitre.textContent = "Grands vainqueurs de la soirée"
        } else {
            titre.textContent = enTete.length === n ? "Égalité parfaite" : "Égalité au sommet"
            sousTitre.appendChild(nomsEnTete())
            sousTitre.append(enTete.length === n ? " : personne ne repart les mains vides" : " se partagent la victoire")
        }
        $("trophee").removeAttribute("hidden")
        enJeu = false
        if (window.garderEcranAllume) window.garderEcranAllume(false)
        $("btn-manche-suivante").hidden = true
        $("btn-rejouer").hidden = false
        $("lien-accueil").hidden = false
    } else {
        $("score-surtitre").textContent = "Fin de la manche " + (partie.manche + 1)
        if (enTete.length === 1) {
            remplirEquipe(titre, enTete[0])
            sousTitre.textContent = "En tête pour l'instant"
        } else {
            titre.textContent = "Coude à coude"
            sousTitre.appendChild(nomsEnTete())
            sousTitre.append(" à égalité")
        }
        $("trophee").setAttribute("hidden", "")
        $("btn-manche-suivante").hidden = false
        $("btn-manche-suivante").textContent = "Manche " + (partie.manche + 2) + " : " + MANCHES[partie.manche + 1].nom
        $("btn-rejouer").hidden = true
        $("lien-accueil").hidden = true
    }

    afficher("ecran-score")
    setTimeout(function () {
        cartes.forEach(function (c, i) { compterJusqua(c.querySelector(".total"), totaux[i]) })
        // Une fois les points comptés, chacun prend sa place
        setTimeout(function () { classer(cartes, ordre, rangs, finPartie) }, reduit ? 0 : 950)
        if (finPartie) {
            confettis()
            // La musique d'ambiance revient quand la fanfare est terminée
            son("victoire", { ensuite: function () { musique(true) } })
        } else {
            son("fin-manche")
        }
    }, reduit ? 0 : 650)
}

// Réordonne les cartes avec une animation fluide (technique « FLIP »)
function classer(cartes, ordre, rangs, finPartie) {
    const liste = $("classement")
    const avant = cartes.map(function (c) { return c.getBoundingClientRect().top })
    ordre.forEach(function (eq) { liste.appendChild(cartes[eq]) })
    cartes.forEach(function (c, i) {
        c.querySelector(".rang").textContent = rangs[i]
        if (rangs[i] === 1) {
            c.classList.add("premier")
            if (finPartie) c.classList.add("vainqueur")
        }
        const dy = avant[i] - c.getBoundingClientRect().top
        if (dy) animer(c, [
            { transform: "translateY(" + dy + "px)" },
            { transform: "none" }
        ], { duration: 650, easing: "cubic-bezier(.2,.7,.2,1)" })
    })
}

function compterJusqua(el, cible) {
    if (reduit) { el.textContent = cible; return }
    const debut = performance.now(), duree = 900
    function pas(t) {
        const p = Math.min(1, (t - debut) / duree)
        const doux = 1 - Math.pow(1 - p, 3)
        el.textContent = Math.round(cible * doux)
        if (p < 1) requestAnimationFrame(pas)
    }
    requestAnimationFrame(pas)
}

function confettis() {
    if (reduit) return
    const zone = document.createElement("div")
    zone.className = "confettis"
    zone.setAttribute("aria-hidden", "true")
    const couleurs = [couleur("or"), couleur("or-clair"), couleur("texte"), couleur("corail")]
    for (let i = 0; i < 46; i++) {
        const c = document.createElement("i")
        const large = Math.random() < .5
        c.style.left = (Math.random() * 100) + "%"
        c.style.width = (large ? 8 : 4) + "px"
        c.style.height = (large ? 3 : 4) + "px"
        if (!large) c.style.borderRadius = "50%"
        c.style.background = couleurs[i % couleurs.length]
        c.style.setProperty("--duree", (2.6 + Math.random() * 2.2) + "s")
        c.style.setProperty("--delai", (Math.random() * 1.2) + "s")
        c.style.setProperty("--derive", ((Math.random() - .5) * 120) + "px")
        c.style.setProperty("--tour", ((Math.random() - .5) * 900) + "deg")
        zone.appendChild(c)
    }
    document.body.appendChild(zone)
    setTimeout(function () { zone.remove() }, 6000)
}

$("btn-manche-suivante").addEventListener("click", function () {
    partie.manche++
    commencerManche()
})

$("btn-rejouer").addEventListener("click", function () {
    afficher("ecran-parametres")
})

// =========================================================
// Écran des paramètres
// =========================================================

// ---------- Équipes et joueurs ----------
const JOUEURS_MAX = 15

function blocsEquipes() { return Array.from(document.querySelectorAll("#liste-equipes .bloc-equipe")) }
function nombreEquipes() { return blocsEquipes().length }
function prenomsActifs() { return $("interrupteur-joueurs").checked }

function iconeCroix(taille) {
    return '<svg width="' + taille + '" height="' + taille + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>'
}

function ajouterEquipe(nom, joueurs, anime) {
    const liste = $("liste-equipes")
    const i = nombreEquipes()
    if (i >= EQUIPES_MAX) return

    const bloc = document.createElement("div")
    bloc.className = "bloc-equipe"

    // Ligne : symbole + nom + croix
    const ligne = document.createElement("div")
    ligne.className = "ligne-equipe"
    const sym = document.createElement("span")
    sym.className = "symbole-equipe symbole " + SYMBOLES[i].couleur
    sym.textContent = SYMBOLES[i].signe
    sym.setAttribute("aria-hidden", "true")
    const champ = document.createElement("input")
    champ.type = "text"
    champ.className = "saisie nom-equipe-champ"
    champ.maxLength = 20
    champ.autocomplete = "off"
    champ.value = nom || ("Équipe " + (i + 1))
    champ.placeholder = "Équipe " + (i + 1)
    champ.setAttribute("aria-label", "Nom de l'équipe " + (i + 1))
    champ.addEventListener("change", sauverReglages)
    ligne.appendChild(sym)
    ligne.appendChild(champ)
    if (i >= EQUIPES_MIN) {
        const retirer = document.createElement("button")
        retirer.type = "button"
        retirer.className = "retirer-equipe"
        retirer.setAttribute("aria-label", "Retirer l'équipe " + (i + 1))
        retirer.innerHTML = iconeCroix(16)
        retirer.addEventListener("click", function () { retirerEquipe(bloc) })
        ligne.appendChild(retirer)
    } else {
        const espace = document.createElement("span")
        espace.className = "espace-retirer"
        ligne.appendChild(espace)
    }
    bloc.appendChild(ligne)

    // Zone des joueurs (visible quand l'interrupteur est activé)
    const zone = document.createElement("div")
    zone.className = "zone-joueurs"
    const interieur = document.createElement("div")
    interieur.className = "zone-joueurs-interieur"
    const puces = document.createElement("div")
    puces.className = "puces"
    const ajout = document.createElement("div")
    ajout.className = "ajout-joueur"
    const champJoueur = document.createElement("input")
    champJoueur.type = "text"
    champJoueur.className = "champ-joueur"
    champJoueur.maxLength = 15
    champJoueur.autocomplete = "off"
    champJoueur.enterKeyHint = "done"
    champJoueur.placeholder = "Prénom d'un joueur"
    champJoueur.setAttribute("aria-label", "Ajouter un joueur à l'équipe " + (i + 1))
    const boutonAjout = document.createElement("button")
    boutonAjout.type = "button"
    boutonAjout.className = "petit-btn ajout-joueur-btn"
    boutonAjout.dataset.son = "aucun"
    boutonAjout.setAttribute("aria-label", "Ajouter ce joueur")
    boutonAjout.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>'
    function valider() {
        const prenom = champJoueur.value.trim()
        if (!prenom) return
        if (puces.children.length >= JOUEURS_MAX) return
        ajouterPuce(puces, prenom, true)
        son("clic")
        champJoueur.value = ""
        champJoueur.focus({ preventScroll: true })
        sauverReglages()
    }
    boutonAjout.addEventListener("click", valider)
    champJoueur.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); valider() }
    })
    ajout.appendChild(champJoueur)
    ajout.appendChild(boutonAjout)
    interieur.appendChild(puces)
    interieur.appendChild(ajout)
    zone.appendChild(interieur)
    bloc.appendChild(zone)

    ;(joueurs || []).slice(0, JOUEURS_MAX).forEach(function (j) { ajouterPuce(puces, String(j).slice(0, 15), false) })

    liste.appendChild(bloc)
    if (anime) {
        animer(bloc, [
            { opacity: 0, transform: "translateY(-8px)" },
            { opacity: 1, transform: "none" }
        ], { duration: 380, easing: "cubic-bezier(.2,.7,.2,1)" })
        champ.focus({ preventScroll: true })
        champ.select()
    }
    majBoutonAjouter()
}

function ajouterPuce(puces, prenom, anime) {
    const puce = document.createElement("span")
    puce.className = "puce"
    const texte = document.createElement("span")
    texte.className = "puce-texte"
    texte.textContent = prenom
    const retirer = document.createElement("button")
    retirer.type = "button"
    retirer.className = "puce-retirer"
    retirer.setAttribute("aria-label", "Retirer " + prenom)
    retirer.innerHTML = iconeCroix(12)
    retirer.addEventListener("click", function () {
        son("clic")
        animer(puce, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.8)" }],
            { duration: 180, easing: "ease-in" }).then(function () {
            puce.remove()
            sauverReglages()
        })
    })
    puce.appendChild(texte)
    puce.appendChild(retirer)
    puces.appendChild(puce)
    if (anime) animer(puce, [{ opacity: 0, transform: "scale(.7)" }, { opacity: 1, transform: "none" }],
        { duration: 320, easing: "cubic-bezier(.34,1.56,.64,1)" })
}

function retirerEquipe(bloc) {
    animer(bloc, [
        { opacity: 1, transform: "none" },
        { opacity: 0, transform: "translateX(20px)" }
    ], { duration: 260, easing: "ease-in" }).then(function () {
        bloc.remove()
        renumeroterEquipes()
        majBoutonAjouter()
        sauverReglages()
    })
}

// Après un retrait, les équipes restantes reprennent les symboles dans l'ordre
function renumeroterEquipes() {
    blocsEquipes().forEach(function (bloc, i) {
        const sym = bloc.querySelector(".symbole-equipe")
        sym.className = "symbole-equipe symbole " + SYMBOLES[i].couleur
        sym.textContent = SYMBOLES[i].signe
        const champ = bloc.querySelector(".nom-equipe-champ")
        champ.placeholder = "Équipe " + (i + 1)
        champ.setAttribute("aria-label", "Nom de l'équipe " + (i + 1))
        if (/^Équipe \d$/.test(champ.value)) champ.value = "Équipe " + (i + 1)
        const retirer = bloc.querySelector(".retirer-equipe")
        if (retirer) retirer.setAttribute("aria-label", "Retirer l'équipe " + (i + 1))
        bloc.querySelector(".champ-joueur").setAttribute("aria-label", "Ajouter un joueur à l'équipe " + (i + 1))
    })
}

function majBoutonAjouter() {
    $("btn-ajouter-equipe").hidden = nombreEquipes() >= EQUIPES_MAX
}

function nomsEquipesSaisis() {
    return blocsEquipes().map(function (b) { return b.querySelector(".nom-equipe-champ").value })
}
function joueursSaisis() {
    return blocsEquipes().map(function (b) {
        return Array.from(b.querySelectorAll(".puce-texte")).map(function (t) { return t.textContent })
    })
}

$("btn-ajouter-equipe").addEventListener("click", function () {
    ajouterEquipe("", [], true)
    sauverReglages()
})

$("interrupteur-joueurs").addEventListener("change", function () {
    $("liste-equipes").classList.toggle("avec-joueurs", prenomsActifs())
    sauverReglages()
})

// ---------- Nombre de mots et durée personnalisés ----------
const REGLAGES = {
    mots:  { radio: "nbmots", zone: "zone-mots",  reglette: "reglette-mots",  valeur: "valeur-mots",  min: MOTS_MIN,  max: MOTS_MAX,  texte: function (v) { return v } },
    temps: { radio: "temps",  zone: "zone-temps", reglette: "reglette-temps", valeur: "valeur-temps", min: TEMPS_MIN, max: TEMPS_MAX, texte: formatDuree }
}

function valeurPerso(cle) { return parseInt($(REGLAGES[cle].reglette).value, 10) }

function definirPerso(cle, v, anime) {
    const r = REGLAGES[cle]
    v = Math.max(r.min, Math.min(r.max, Math.round(v / 5) * 5))
    const reglette = $(r.reglette)
    reglette.value = v
    reglette.style.setProperty("--rempli", ((v - r.min) / (r.max - r.min) * 100) + "%")
    const b = $(r.valeur)
    b.textContent = r.texte(v)
    if (anime && !reduit) { b.classList.remove("bouge"); void b.offsetWidth; b.classList.add("bouge") }
    document.querySelectorAll('.petit-btn[data-cible="' + cle + '"]').forEach(function (btn) {
        const pas = parseInt(btn.dataset.pas, 10)
        btn.disabled = (pas < 0 && v <= r.min) || (pas > 0 && v >= r.max)
    })
    majEstimation()
}

function persoActif(cle) {
    const coche = document.querySelector('input[name="' + REGLAGES[cle].radio + '"]:checked')
    return coche && coche.value === "perso"
}

function nbMotsChoisi() {
    return persoActif("mots") ? valeurPerso("mots")
        : parseInt(document.querySelector('input[name="nbmots"]:checked').value, 10)
}
function dureeChoisie() {
    return persoActif("temps") ? valeurPerso("temps")
        : parseInt(document.querySelector('input[name="temps"]:checked').value, 10)
}

Object.keys(REGLAGES).forEach(function (cle) {
    const r = REGLAGES[cle]
    // Ouvrir / fermer la zone perso
    document.querySelectorAll('input[name="' + r.radio + '"]').forEach(function (radio) {
        radio.addEventListener("change", function () {
            $(r.zone).classList.toggle("ouverte", persoActif(cle))
            majEstimation()
            sauverReglages()
        })
    })
    // Réglette
    $(r.reglette).addEventListener("input", function () { definirPerso(cle, valeurPerso(cle), false) })
    $(r.reglette).addEventListener("change", sauverReglages)
})

// Boutons − / + : un appui = un pas ; appui maintenu = ça défile de plus en plus vite
document.querySelectorAll(".petit-btn").forEach(function (btn) {
    btn.dataset.son = "aucun"
    let minuterie = null
    function pas() {
        const cle = btn.dataset.cible
        const avant = valeurPerso(cle)
        definirPerso(cle, avant + parseInt(btn.dataset.pas, 10), true)
        if (valeurPerso(cle) !== avant) son("clic")
    }
    function arreter() {
        clearTimeout(minuterie); minuterie = null
        sauverReglages()
    }
    btn.addEventListener("pointerdown", function (e) {
        e.preventDefault()
        pas()
        let delai = 380
        function repeter() {
            pas()
            delai = Math.max(60, delai * 0.8)
            minuterie = setTimeout(repeter, delai)
        }
        minuterie = setTimeout(repeter, delai)
    })
    btn.addEventListener("pointerup", arreter)
    btn.addEventListener("pointerleave", function () { if (minuterie) arreter() })
    btn.addEventListener("pointercancel", function () { if (minuterie) arreter() })
    // Clavier (Entrée / Espace)
    btn.addEventListener("click", function (e) { if (e.detail === 0) { pas(); sauverReglages() } })
})

// ---------- Estimation de la durée de partie ----------
// Hypothèses : environ 6 secondes par mot trouvé, et 25 secondes de transition
// entre deux tours (annonce, vérification). Les 3 manches rejouent tous les mots.
function majEstimation() {
    const mots = nbMotsChoisi(), duree = dureeChoisie()
    const motsAJouer = mots * 3
    const tours = motsAJouer / Math.max(1, duree / 6)
    const secondes = motsAJouer * 6 + tours * 25
    let minutes = Math.max(5, Math.round(secondes / 60 / 5) * 5)
    let texte
    if (minutes < 60) texte = minutes + " min"
    else {
        const h = Math.floor(minutes / 60), m = minutes % 60
        texte = h + " h" + (m ? " " + String(m).padStart(2, "0") : "")
    }
    const el = $("estimation-texte")
    el.textContent = "Environ "
    const b = document.createElement("b")
    b.textContent = texte
    el.appendChild(b)
    el.append(" de jeu")
}

// ---------- Mémoriser les réglages ----------
function sauverReglages() {
    const r = {
        equipes: nomsEquipesSaisis(),
        joueurs: joueursSaisis(),
        prenoms: prenomsActifs(),
        mots: persoActif("mots") ? "perso" : nbMotsChoisi(),
        motsPerso: valeurPerso("mots"),
        temps: persoActif("temps") ? "perso" : dureeChoisie(),
        tempsPerso: valeurPerso("temps")
    }
    memoire(CLE_REGLAGES, JSON.stringify(r))
}

function chargerReglages() {
    let r = null
    try { r = JSON.parse(memoire(CLE_REGLAGES) || "null") } catch (e) { r = null }
    const noms = (r && Array.isArray(r.equipes) && r.equipes.length >= EQUIPES_MIN)
        ? r.equipes.slice(0, EQUIPES_MAX) : ["Équipe 1", "Équipe 2"]
    const joueurs = (r && Array.isArray(r.joueurs)) ? r.joueurs : []
    noms.forEach(function (nom, i) {
        ajouterEquipe(String(nom || "").slice(0, 20), Array.isArray(joueurs[i]) ? joueurs[i] : [], false)
    })
    $("interrupteur-joueurs").checked = !!(r && r.prenoms)
    $("liste-equipes").classList.toggle("avec-joueurs", prenomsActifs())

    definirPerso("mots", r && r.motsPerso ? r.motsPerso : 100, false)
    definirPerso("temps", r && r.tempsPerso ? r.tempsPerso : 90, false)
    if (r) {
        const radioMots = document.querySelector('input[name="nbmots"][value="' + r.mots + '"]')
        const radioTemps = document.querySelector('input[name="temps"][value="' + r.temps + '"]')
        if (radioMots) radioMots.checked = true
        if (radioTemps) radioTemps.checked = true
    }
    $("zone-mots").classList.toggle("ouverte", persoActif("mots"))
    $("zone-temps").classList.toggle("ouverte", persoActif("temps"))
    majEstimation()
}

chargerReglages()

// =========================================================
// Navigation entre l'accueil, les règles et le jeu
// (tout est dans une seule page : le son n'a besoin d'être
// débloqué qu'une fois, et la musique ne se coupe pas)
// =========================================================
const ROUTES = {
    "": "ecran-accueil",
    "#regles": "ecran-regles",
    "#jouer": "ecran-parametres",
    "#passe-mot": "ecran-pm-config",
    "#passe-mot-regles": "ecran-pm-regles",
    "#infiltre": "ecran-inf-config",
    "#infiltre-regles": "ecran-inf-regles",
    "#crea-mime": "ecran-cm-config",
    "#crea-mime-regles": "ecran-cm-regles"
}

function abandonnerPartie() {
    if (!enJeu) return
    enJeu = false
    arreterChrono()
    if (window.garderEcranAllume) window.garderEcranAllume(false)
}

function suivreAdresse() {
    const id = ROUTES[location.hash] || "ecran-accueil"
    // Quitter la partie en cours (bouton retour du téléphone, lien vers l'accueil...)
    if (enJeu) abandonnerPartie()
    if (window.abandonnerPasseMot) window.abandonnerPasseMot()
    if (window.abandonnerInfiltre) window.abandonnerInfiltre()
    if (window.abandonnerCreaMime) window.abandonnerCreaMime()
    musique(true)
    afficher(id)
}
window.addEventListener("hashchange", suivreAdresse)

// Arrivée directe sur #regles ou #jouer : on affiche le bon écran sans animation
;(function () {
    const id = ROUTES[location.hash]
    if (id && id !== "ecran-accueil") {
        ecranCourant.classList.remove("actif")
        ecranCourant = $(id)
        ecranCourant.classList.add("actif")
    }
})()

// =========================================================
// Pause — commune à tous les jeux
//
// Chaque jeu qui a un chrono s'enregistre avec enregistrerPause({ geler, relancer }) :
//  - geler() arrête son chrono et renvoie le temps restant (ms), ou null s'il n'y en a pas
//  - relancer(reste) le fait repartir exactement là où il s'était arrêté
// =========================================================
const ECRANS_DE_PARTIE = [
    "ecran-intro", "ecran-tour", "ecran-verif", "ecran-score",
    "ecran-pm-revelation", "ecran-pm-duel", "ecran-pm-resultat",
    "ecran-inf-distribution", "ecran-inf-tour", "ecran-inf-vote", "ecran-inf-revelation",
    "ecran-cm-ecriture", "ecran-cm-passage", "ecran-cm-tour", "ecran-cm-mime", "ecran-cm-resultat"
]
const PAUSES = []
let enPause = false
let restesGeles = []
let quitterArme = null

function enregistrerPause(jeu) { PAUSES.push(jeu) }

// Black's Up : son chrono
enregistrerPause({
    geler: function () {
        if (!chrono.enCours) return null
        const reste = Math.max(0, chrono.fin - performance.now())
        arreterChrono()
        return reste
    },
    relancer: function (reste) {
        chrono.fin = performance.now() + reste
        chrono.enCours = true
        chrono.image = requestAnimationFrame(boucleChrono)
    }
})

function ecranDePartie() { return ECRANS_DE_PARTIE.indexOf(ecranCourant.id) !== -1 }

function mettreEnPause() {
    if (enPause || !ecranDePartie()) return
    enPause = true
    restesGeles = PAUSES.map(function (jeu) { return jeu.geler() })
    const reste = restesGeles.filter(function (r) { return r !== null })[0]
    const ligne = $("pause-reste")
    ligne.textContent = ""
    if (reste && typeof reste === "object") {
        // Un chrono qui monte (Créa'Mime) : on affiche le temps déjà écoulé
        $("pause-surtitre").textContent = "Le chrono est arrêté"
        const b = document.createElement("b")
        b.textContent = reste.texte
        ligne.appendChild(b)
        ligne.append(" au chrono")
    } else if (reste !== undefined) {
        $("pause-surtitre").textContent = "Le chrono est arrêté"
        const b = document.createElement("b")
        b.textContent = Math.ceil(reste / 1000)
        ligne.appendChild(b)
        ligne.append(" secondes restantes")
    } else {
        $("pause-surtitre").textContent = "On souffle un peu"
        ligne.textContent = "La partie vous attend."
    }
    desarmerQuitter()
    document.body.classList.add("en-pause")
    const p = $("pause")
    p.classList.remove("part")
    p.hidden = false
    $("btn-reprendre").focus({ preventScroll: true })
}

function reprendre() {
    if (!enPause) return
    const p = $("pause")
    p.classList.add("part")
    setTimeout(function () {
        p.hidden = true
        p.classList.remove("part")
        document.body.classList.remove("en-pause")
        enPause = false
        // Chaque chrono repart exactement là où il s'était arrêté
        restesGeles.forEach(function (reste, i) { if (reste !== null) PAUSES[i].relancer(reste) })
        restesGeles = []
    }, reduit ? 0 : 230)
}

function desarmerQuitter() {
    clearTimeout(quitterArme); quitterArme = null
    const b = $("btn-quitter")
    b.classList.remove("confirmer")
    b.textContent = "Quitter la partie"
}

function fermerPauseSansReprendre() {
    enPause = false
    restesGeles = []
    $("pause").hidden = true
    document.body.classList.remove("en-pause")
    desarmerQuitter()
}

$("btn-menu-partie").addEventListener("click", mettreEnPause)
$("btn-reprendre").addEventListener("click", reprendre)

// Quitter demande une confirmation : un 2e appui dans les 3 secondes
$("btn-quitter").addEventListener("click", function () {
    const b = $("btn-quitter")
    if (!quitterArme) {
        b.classList.add("confirmer")
        b.textContent = "Toucher encore pour quitter"
        quitterArme = setTimeout(desarmerQuitter, 3000)
        return
    }
    fermerPauseSansReprendre()
    abandonnerPartie()
    if (window.abandonnerPasseMot) window.abandonnerPasseMot()
    if (window.abandonnerInfiltre) window.abandonnerInfiltre()
    if (window.abandonnerCreaMime) window.abandonnerCreaMime()
    location.hash = ""   // retour à l'accueil (la musique revient)
})

// Pause automatique si le téléphone passe à autre chose en pleine partie
document.addEventListener("visibilitychange", function () {
    if (document.hidden && ecranDePartie()) mettreEnPause()
})

// Quitter le jeu par le bouton retour pendant une pause
window.addEventListener("hashchange", function () { if (enPause) fermerPauseSansReprendre() })

// =========================================================
// Jeux à venir : petite fenêtre « en construction »
// =========================================================
document.querySelectorAll(".carte-jeu.bientot").forEach(function (carte) {
    carte.addEventListener("click", function () {
        $("bientot-titre").textContent = carte.dataset.jeu
        const f = $("bientot")
        f.classList.remove("part")
        f.hidden = false
        $("bientot-fermer").focus({ preventScroll: true })
    })
})
function fermerBientot() {
    const f = $("bientot")
    if (f.hidden) return
    f.classList.add("part")
    setTimeout(function () { f.hidden = true; f.classList.remove("part") }, reduit ? 0 : 230)
}
$("bientot-fermer").addEventListener("click", fermerBientot)
$("bientot").addEventListener("click", function (e) { if (e.target === $("bientot")) fermerBientot() })
document.addEventListener("keydown", function (e) { if (e.key === "Escape") fermerBientot() })

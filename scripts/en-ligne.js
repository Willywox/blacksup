// =========================================================
// EN LIGNE — l'hôte ouvre une salle (code à 4 lettres), les joueurs la
// rejoignent depuis leur téléphone. L'hôte garde les rênes : son téléphone
// publie l'état de la soirée et du jeu en cours ; chaque joueur suit en direct
// et reçoit ses secrets (son mot, son rôle, son son…).
//
// Côté hôte : window.Salle. Côté joueur : écrans #rejoindre et #salle.
// Les jeux déclarent JEUX_SOIREE[id].enLigne(ecran) -> { public, prives }
// et, s'ils en ont besoin, surMessage(type, de, donnees) / surPartage(partage).
// =========================================================

;(function () {

    const API = "api/salle.php"
    const CLE_HOTE = "blacksup-salle-hote"
    const CLE_JOUEUR = "blacksup-salle-joueur"
    const RYTHME = 1500
    const RYTHME_JOUEUR = 1000

    // ---------- Outils réseau ----------
    let decalage = 0   // horloge du serveur - horloge du téléphone
    function appel(action, donnees) {
        const envoi = Date.now()
        return fetch(API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Object.assign({ action: action }, donnees || {})),
            cache: "no-store"
        }).then(function (r) {
            return r.json().catch(function () { return { erreur: "Réponse illisible" } }).then(function (j) {
                if (j && j.t) decalage = j.t - (envoi + (Date.now() - envoi) / 2)
                if (!r.ok || j.erreur) { const e = new Error(j.erreur || "Erreur réseau"); e.statut = r.status; throw e }
                return j
            })
        })
    }
    function lire(cle) { try { return JSON.parse(localStorage.getItem(cle) || "null") } catch (e) { return null } }
    function ecrire(cle, v) { try { if (v) localStorage.setItem(cle, JSON.stringify(v)); else localStorage.removeItem(cle) } catch (e) {} }
    function maintenantServeur() { return Date.now() + decalage }
    function bas(n) { return String(n || "").trim().toLowerCase() }

    // Écran affiché (on enveloppe afficher() de jeu.js pour savoir où en est l'hôte)
    let ecranActuel = (document.querySelector(".ecran.actif") || {}).id || ""
    const afficherOrigine = afficher
    afficher = function (id) {
        const r = afficherOrigine.apply(this, arguments)
        ecranActuel = id
        if (hote) diffuser()
        return r
    }

    // Quel jeu correspond à un écran ?
    const PREFIXES = [
        ["ecran-inf-", "infiltre"], ["ecran-dx-", "dieux"], ["ecran-my-", "mytho"], ["ecran-su-", "songs-up"],
        ["ecran-pm-", "passe-mot"], ["ecran-cm-", "crea-mime"], ["ecran-qdn-", "qui-de-nous"]
    ]
    const ECRANS_BU = ["ecran-parametres", "ecran-intro", "ecran-tour", "ecran-verif", "ecran-score", "ecran-regles"]
    const NOMS_JEUX = { "blacksup": "Black's Up", "passe-mot": "Passe-Mot", "infiltre": "L'Infiltré", "crea-mime": "Créa'Mime",
        "dieux": "Les Dieux", "songs-up": "Songs Up", "mytho": "Le Mytho", "qui-de-nous": "Qui de nous ?" }
    function jeuDe(ecran) {
        if (ECRANS_BU.indexOf(ecran) !== -1) return "blacksup"
        for (let i = 0; i < PREFIXES.length; i++) if (ecran.indexOf(PREFIXES[i][0]) === 0) return PREFIXES[i][1]
        return null
    }

    // =====================================================
    // CHAT DE LA PARTIE (hôte et joueurs)
    // =====================================================
    const Chat = (function () {
        let messages = [], dernier = 0, nonLus = 0, ouvert = false
        const REACTIONS = ["😂", "🔥", "👏", "😱", "🤫", "GOAT"]
        const bouton = document.createElement("button")
        bouton.type = "button"
        bouton.className = "chat-bouton"
        bouton.dataset.son = "aucun"
        bouton.setAttribute("aria-label", "Ouvrir le chat")
        bouton.hidden = true
        bouton.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"></path></svg>'
        const panneau = document.createElement("div")
        panneau.className = "chat-panneau"
        panneau.hidden = true
        panneau.innerHTML = '<div class="chat-tete"><p class="chat-titre">Le chat de la partie</p><button type="button" class="chat-fermer" aria-label="Fermer le chat">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg></button></div>' +
            '<div class="chat-liste" aria-live="polite"></div><div class="chat-reactions"></div>' +
            '<form class="chat-saisie"><input type="text" maxlength="200" autocomplete="off" enterkeyhint="send" placeholder="Écris un message…" aria-label="Message"><button type="submit" aria-label="Envoyer">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l16-8-6 16-2-6z"></path></svg></button></form>'
        document.body.appendChild(bouton)
        document.body.appendChild(panneau)
        const liste = panneau.querySelector(".chat-liste")
        const champ = panneau.querySelector("input")
        REACTIONS.forEach(function (r) {
            const b = document.createElement("button")
            b.type = "button"; b.textContent = r
            b.addEventListener("click", function () { envoyerChat(r) })
            panneau.querySelector(".chat-reactions").appendChild(b)
        })
        function monNom() { return hote ? "L'hôte" : (moi ? moi.nom : "") }
        function heure(t) { const d = new Date(t - decalage); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") }
        function rendre() {
            liste.textContent = ""
            if (!messages.length) {
                const v = document.createElement("p"); v.className = "chat-vide"; v.textContent = "Personne n'a encore parlé. Lance les hostilités !"
                liste.appendChild(v)
            }
            let precedent = null
            messages.forEach(function (m) {
                const miens = m.de === monNom()
                const p = document.createElement("div")
                p.className = "chat-msg" + (miens ? " moi" : "") + (m.de === "L'hôte" ? " hote" : "") + (/^\p{Extended_Pictographic}+$|^GOAT$/u.test(m.texte) ? " reaction" : "")
                if (precedent !== m.de && !miens) { const n = document.createElement("span"); n.className = "chat-de"; n.textContent = m.de; p.appendChild(n) }
                const t = document.createElement("span"); t.className = "chat-texte"; t.textContent = m.texte
                const h = document.createElement("span"); h.className = "chat-heure"; h.textContent = heure(m.t)
                p.appendChild(t); p.appendChild(h)
                liste.appendChild(p)
                precedent = m.de
            })
            liste.scrollTop = liste.scrollHeight
        }
        function majBadge() {}
        function estReaction(t) { return /^\p{Extended_Pictographic}+$|^GOAT$/u.test(t) }
        // Une réaction envoyée s'envole en grand sur tous les écrans
        function voler(m) {
            const e = document.createElement("div")
            e.className = "reaction-volante" + (m.texte === "GOAT" ? " goat" : "")
            e.style.left = (12 + Math.random() * 70) + "%"
            const r = document.createElement("span"); r.textContent = m.texte
            const n = document.createElement("small"); n.textContent = m.de
            e.appendChild(r); e.appendChild(n)
            document.body.appendChild(e)
            setTimeout(function () { e.remove() }, 2600)
        }
        function envoyerChat(texte) {
            texte = String(texte || "").trim()
            if (!texte) return
            const donnees = hote ? { code: hote.code, cleHote: hote.cleHote, texte: texte } : (moi ? { code: moi.code, id: moi.id, cle: moi.cle, texte: texte } : null)
            if (!donnees) return
            son("clic")
            if (estReaction(texte)) voler({ texte: texte, de: monNom() })
            appel("chat", donnees).then(function () {
                // le message revient par la boucle ; on accélère juste l'affichage
                messages.push({ n: -1, de: monNom(), texte: texte, t: maintenantServeur(), provisoire: true })
                rendre()
            }).catch(function () {})
        }
        bouton.addEventListener("click", function () { ouvrir(!ouvert) })
        panneau.querySelector(".chat-fermer").addEventListener("click", function () { ouvrir(false) })
        panneau.querySelector("form").addEventListener("submit", function (e) { e.preventDefault(); envoyerChat(champ.value); champ.value = "" })
        function ouvrir(o) {
            ouvert = o
            panneau.hidden = !o
            bouton.classList.toggle("ouvert", o)
            if (o) { nonLus = 0; majBadge(); rendre() }
        }
        return {
            dernier: function () { return dernier },
            recevoir: function (liste2) {
                if (!liste2 || !liste2.length) return
                messages = messages.filter(function (m) { return !m.provisoire })
                let nouveaux = 0
                liste2.forEach(function (m) {
                    if (m.n <= dernier) return
                    dernier = m.n
                    messages.push(m)
                    if (m.de !== monNom()) {
                        nouveaux++
                        // on n'anime que les réactions récentes (pas tout l'historique au retour)
                        if (estReaction(m.texte) && maintenantServeur() - m.t < 15000) voler(m)
                    }
                })
                if (messages.length > 150) messages = messages.slice(-150)
                if (ouvert) rendre()

            },
            vider: function () { messages = []; dernier = 0; nonLus = 0; majBadge(); ouvrir(false) },
            afficherBouton: function (v) { bouton.hidden = !v; document.documentElement.classList.toggle("avec-chat", !!v); if (!v) ouvrir(false) }
        }
    })()
    window.ChatPartie = Chat

    // =====================================================
    // CÔTÉ HÔTE
    // =====================================================
    let hote = lire(CLE_HOTE)           // { code, cleHote, seq, vj }
    // Au lancement : une salle sans soirée en cours et sans aucun joueur est un reste (bouton touché pour essayer) → on la ferme
    let verifOrpheline = !!hote && !(window.Soiree && Soiree.enCours && Soiree.enCours())
    if (verifOrpheline) hote.vj = 0
    let joueursSalle = []                // [{ id, nom, photo, enLigne }]
    let partage = {}
    let dernierPublie = "", minuteurPub = null, minuteurBoucle = null, dernierAnnuaire = ""
    let enErreur = false

    const Salle = {
        actif: function () { return !!hote },
        code: function () { return hote ? hote.code : null },
        estConnecte: function (nom) {
            if (!hote) return false
            const n = bas(nom)
            return joueursSalle.some(function (j) { return bas(j.nom) === n && j.enLigne })
        },
        connectes: function () { return joueursSalle.filter(function (j) { return j.enLigne }).map(function (j) { return j.nom }) },
        statut: function (nom) {
            if (!hote) return null
            const j = joueursSalle.filter(function (x) { return bas(x.nom) === bas(nom) })[0]
            return j ? (j.enLigne ? "enligne" : "horsligne") : null
        },
        inscrits: function () { return joueursSalle.slice() },
        creer: creerSalle,
        fermer: function () { fermerSalle(true); majAccueilJoueur() },
        diffuser: diffuser,
        partage: function () { return partage },
        ecrirePartage: function (champ, valeur) {
            if (!hote) return
            partage[champ] = { valeur: valeur, par: "hôte", t: maintenantServeur() }
            appel("partager", { code: hote.code, cleHote: hote.cleHote, champ: champ, valeur: valeur }).catch(function () {})
        },
        viderPartage: function () {
            partage = {}
            if (hote) appel("publier", { code: hote.code, cleHote: hote.cleHote, viderPartage: true }).catch(function () {})
        },
        annuaire: function (carte) {
            if (!hote) return
            const sig = JSON.stringify(carte)
            if (sig === dernierAnnuaire) return
            dernierAnnuaire = sig
            appel("publier", { code: hote.code, cleHote: hote.cleHote, annuaire: carte }).catch(function () { dernierAnnuaire = "" })
        },
        // Retire des joueurs de la salle (ils ont quitté la soirée) : leur téléphone est prévenu
        retirer: function (noms) {
            if (!hote || !noms.length) return
            const bas2 = noms.map(bas)
            const ids = joueursSalle.filter(function (j) { return bas2.indexOf(bas(j.nom)) !== -1 }).map(function (j) { return j.id })
            joueursSalle = joueursSalle.filter(function (j) { return ids.indexOf(j.id) === -1 })
            majPanneaux()
            if (ids.length) appel("publier", { code: hote.code, cleHote: hote.cleHote, retirer: ids }).catch(function () {})
        },
        versServeur: function (msLocal) { return msLocal + decalage },
        maintenantServeur: maintenantServeur
    }
    window.Salle = Salle

    function creerSalle(nomHote) {
        return appel("creer", { nomHote: nomHote || "" }).then(function (r) {
            hote = { code: r.code, cleHote: r.cleHote, seq: 0, vj: 0 }
            Chat.vider()
            ecrire(CLE_HOTE, hote)
            dernierPublie = ""; dernierAnnuaire = ""
            Chat.afficherBouton(true)
            boucleHote()
            diffuser()
            majPanneaux()
            return r.code
        })
    }
    function fermerSalle(prevenir) {
        if (prevenir && hote) appel("fermer", { code: hote.code, cleHote: hote.cleHote }).catch(function () {})
        hote = null
        Chat.vider()
        ecrire(CLE_HOTE, null)
        joueursSalle = []
        clearTimeout(minuteurBoucle)
        Chat.afficherBouton(routeJoueur() && !!moi)
        majPanneaux()
    }

    function boucleHote() {
        clearTimeout(minuteurBoucle)
        if (!hote) return
        const h = hote
        appel("etat", { code: h.code, cleHote: h.cleHote, vj: h.vj, depuis: h.seq, chat: Chat.dernier() }).then(function (r) {
            if (hote !== h) return
            enErreur = false
            Chat.recevoir(r.chat)
            if (r.joueurs) {
                const avant = joueursSalle.map(function (j) { return j.id + j.enLigne + (j.photo ? j.photo.length : 0) }).join()
                joueursSalle = r.joueurs
                h.vj = r.vj
                joueursSalle.forEach(function (j) { if (window.Soiree && Soiree.joueurEnLigne) Soiree.joueurEnLigne(j) })
                if (avant !== joueursSalle.map(function (j) { return j.id + j.enLigne + (j.photo ? j.photo.length : 0) }).join()) {
                    majPanneaux()
                    if (window.Soiree && Soiree.rafraichirConnexions) Soiree.rafraichirConnexions()
                }
            }
            if (verifOrpheline) {
                verifOrpheline = false
                if (!joueursSalle.length && ["ecran-soiree-joueurs", "ecran-soiree"].indexOf(ecranActuel) === -1) { fermerSalle(true); majAccueilJoueur(); return }
            }
            if (r.partage) {
                const sig = JSON.stringify(r.partage)
                if (sig !== JSON.stringify(partage)) {
                    partage = Array.isArray(r.partage) ? {} : r.partage
                    const p = fournisseur()
                    if (p && p.surPartage) p.surPartage(partage)
                }
            }
            ;(r.messages || []).forEach(function (m) {
                if (m.n <= h.seq) return
                h.seq = m.n
                try { recevoir(m) } catch (e) { console.error(e) }
            })
            ecrire(CLE_HOTE, h)
            diffuser()
        }).catch(function (e) {
            if (e.statut === 404 && hote === h) { fermerSalle(); return }
            enErreur = true
        }).then(function () {
            if (hote === h) minuteurBoucle = setTimeout(boucleHote, RYTHME)
        })
    }

    function recevoir(m) {
        if (m.type === "coeur") { if (window.Soiree && Soiree.voteEnLigne) Soiree.voteEnLigne(m.de, m.donnees); return }
        if (m.type === "envie") { if (window.Soiree && Soiree.envie) Soiree.envie(m.de, m.donnees); return }
        const p = fournisseur()
        if (p && p.surMessage) p.surMessage(m.type, m.de, m.donnees)
    }

    function fournisseur() {
        const id = jeuDe(ecranActuel)
        return id && JEUX_SOIREE[id] ? JEUX_SOIREE[id] : null
    }

    function composer() {
        const pub = { vue: "attente", soiree: window.Soiree && Soiree.etatPublic ? Soiree.etatPublic() : null }
        let prives = {}
        const id = jeuDe(ecranActuel)
        if (id && !(window.Soiree && Soiree.enCours() && ecranActuel === "ecran-regles")) {
            const p = JEUX_SOIREE[id] && JEUX_SOIREE[id].enLigne ? JEUX_SOIREE[id].enLigne(ecranActuel) : null
            pub.vue = "jeu"
            pub.jeu = Object.assign({ id: id, nom: NOMS_JEUX[id] }, (p && p.public) || {})
            prives = (p && p.prives) || {}
        } else if (window.Soiree && Soiree.vueEnLigne) {
            Object.assign(pub, Soiree.vueEnLigne(ecranActuel) || {})
        }
        return { public: pub, prives: prives }
    }

    function diffuser() {
        if (!hote) return
        clearTimeout(minuteurPub)
        minuteurPub = setTimeout(function () {
            if (!hote) return
            let etat
            try { etat = composer() } catch (e) { console.error(e); return }
            const sig = JSON.stringify(etat)
            if (sig === dernierPublie) return
            dernierPublie = sig
            appel("publier", { code: hote.code, cleHote: hote.cleHote, public: etat.public, prives: etat.prives })
                .catch(function () { dernierPublie = "" })
        }, 60)
    }
    window.diffuserJeu = diffuser
    // Après chaque toucher de l'hôte, on diffuse tout de suite (et une 2e fois quand les animations ont démarré)
    document.addEventListener("click", function () {
        if (!hote) return
        setTimeout(diffuser, 60)
        setTimeout(diffuser, 700)
    }, true)

    // ---------- Panneau « inviter » (écran des joueurs et écran central) ----------
    function majPanneaux() {
        document.querySelectorAll(".so-salle").forEach(rendrePanneau)
    }
    function rendrePanneau(el) {
        el.textContent = ""
        if (!hote) {
            const b = document.createElement("button")
            b.type = "button"
            b.className = "so-salle-inviter"
            b.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5"></rect><path d="M10.5 18.5h3"></path></svg><span><b>Jouer aussi sur vos téléphones</b><small>Chacun rejoint avec un code, suit la soirée et voit ses secrets.</small></span>'
            b.addEventListener("click", function () {
                b.disabled = true
                son("clic")
                creerSalle("").catch(function () {
                    b.disabled = false
                    const p = document.createElement("p"); p.className = "aide-champ alerte"; p.textContent = "Impossible d'ouvrir la salle. Vérifiez la connexion internet."
                    el.appendChild(p)
                })
            })
            el.appendChild(b)
            return
        }
        const box = document.createElement("div")
        box.className = "so-salle-code"
        const g = document.createElement("div")
        const l = document.createElement("p"); l.className = "so-salle-etiquette"; l.textContent = "Rejoindre sur blacksup.com"
        const c = document.createElement("p"); c.className = "so-salle-lettres"; c.textContent = hote.code
        g.appendChild(l); g.appendChild(c)
        const n = Salle.connectes().length
        const etat = document.createElement("p"); etat.className = "so-salle-etat"
        etat.textContent = n ? n + (n > 1 ? " téléphones connectés" : " téléphone connecté") : "En attente des joueurs…"
        if (enErreur) etat.textContent = "Connexion instable…"
        g.appendChild(etat)
        box.appendChild(g)
        const p = document.createElement("button")
        p.type = "button"
        p.className = "so-bandeau-btn"
        p.textContent = "Partager"
        p.addEventListener("click", function () {
            const url = location.origin + location.pathname + "?salle=" + hote.code
            const texte = "Rejoins la soirée Black's Up ! Code : " + hote.code
            if (navigator.share) navigator.share({ title: "Black's Up", text: texte, url: url }).catch(function () {})
            else if (navigator.clipboard) navigator.clipboard.writeText(texte + " " + url).then(function () { p.textContent = "Lien copié" })
        })
        box.appendChild(p)
        el.appendChild(box)
        const f = document.createElement("button")
        f.type = "button"; f.className = "lien-discret so-salle-fermer"; f.textContent = "Fermer la partie en ligne"
        boutonFermer(f)
        el.appendChild(f)
    }
    window.majPanneauxSalle = majPanneaux

    // =====================================================
    // CÔTÉ JOUEUR
    // =====================================================
    let moi = lire(CLE_JOUEUR)          // { code, id, cle, nom, photo }
    let vue = { v: 0, va: 0, public: null, prive: null, partage: {}, annuaire: {}, moi: "", hoteEnLigne: true }
    let minuteurJoueur = null
    let photoJoueur = null
    let messageSortie = ""

    function routeJoueur() { return location.hash === "#salle" }

    // ----- Rejoindre -----
    function preparerRejoindre() {
        const p = new URLSearchParams(location.search)
        const code = (p.get("salle") || (moi && moi.code) || "").toUpperCase()
        $("sl-code").value = code
        $("sl-nom").value = (moi && moi.nom) || (lire("blacksup-mon-prenom") || "")
        photoJoueur = (moi && moi.photo) || lire("blacksup-ma-photo")
        majPhotoJoueur()
        $("sl-erreur").textContent = ""
        majBoutonRejoindre()
    }
    function majBoutonRejoindre() {
        $("sl-rejoindre").disabled = !/^[A-Za-z]{4}$/.test($("sl-code").value.trim()) || !$("sl-nom").value.trim()
    }
    $("sl-code").addEventListener("input", function () {
        this.value = this.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4)
        majBoutonRejoindre()
        if (this.value.length === 4) $("sl-nom").focus({ preventScroll: true })
    })
    $("sl-nom").addEventListener("input", majBoutonRejoindre)
    $("sl-nom").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); if (!$("sl-rejoindre").disabled) $("sl-rejoindre").click() } })
    function majPhotoJoueur() {
        const b = $("sl-photo")
        b.innerHTML = ""
        if (photoJoueur) { const i = document.createElement("img"); i.src = photoJoueur; i.alt = ""; b.appendChild(i); b.classList.add("a-photo") }
        else { b.classList.remove("a-photo"); b.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"></path><circle cx="12" cy="13" r="3.5"></circle></svg>' }
    }
    $("sl-photo").addEventListener("click", function () { $("sl-fichier").click() })
    // Refaire son selfie en cours de soirée
    $("sl-fichier-salle").addEventListener("change", function () {
        const f = this.files && this.files[0]
        this.value = ""
        if (!f || !window.lirePhotoCarree || !moi) return
        window.lirePhotoCarree(f).then(function (ph) {
            moi.photo = ph
            ecrire(CLE_JOUEUR, moi)
            ecrire("blacksup-ma-photo", ph)
            vue.annuaire[moi.nom] = ph
            appel("rejoindre", { code: moi.code, id: moi.id, cle: moi.cle, nom: moi.nom, photo: ph }).then(function () { son("trouve"); derniereCle = ""; rendre() })
        })
    })
    $("sl-fichier").addEventListener("change", function () {
        const f = this.files && this.files[0]
        this.value = ""
        if (!f || !window.lirePhotoCarree) return
        window.lirePhotoCarree(f).then(function (ph) { photoJoueur = ph; ecrire("blacksup-ma-photo", ph); majPhotoJoueur(); son("trouve") })
    })
    $("sl-rejoindre").addEventListener("click", function () {
        const code = $("sl-code").value.trim().toUpperCase()
        const nom = $("sl-nom").value.trim()
        const b = this
        b.disabled = true
        b.textContent = "Connexion…"
        $("sl-erreur").textContent = ""
        const ident = moi && moi.code === code ? { id: moi.id, cle: moi.cle } : {}
        appel("rejoindre", Object.assign({ code: code, nom: nom, photo: photoJoueur }, ident)).then(function (r) {
            if (!moi || moi.code !== code) Chat.vider()
            moi = { code: code, id: r.id, cle: r.cle, nom: nom, photo: photoJoueur }
            ecrire(CLE_JOUEUR, moi)
            ecrire("blacksup-mon-prenom", nom)
            son("lancer")
            vue = { v: 0, va: 0, public: null, prive: null, partage: {}, annuaire: {}, moi: nom, hoteEnLigne: true }
            if (location.search) history.replaceState(null, "", location.pathname + location.hash)
            if (location.hash === "#salle") surAdresse(); else location.hash = "#salle"
        }).catch(function (e) {
            $("sl-erreur").textContent = e.statut === 404 ? "Aucune partie avec ce code. Vérifie les 4 lettres." : (e.message || "Connexion impossible.")
            son("erreur")
        }).then(function () { b.textContent = "Rejoindre la partie"; majBoutonRejoindre() })
    })

    // ----- Suivre la partie -----
    function boucleJoueur() {
        clearTimeout(minuteurJoueur)
        if (!moi || !routeJoueur()) return
        appel("etat", { code: moi.code, id: moi.id, cle: moi.cle, v: vue.v, va: vue.va, chat: Chat.dernier() }).then(function (r) {
            $("sl-connexion").classList.remove("perdue")
            Chat.recevoir(r.chat)
            vue.hoteEnLigne = r.hoteEnLigne
            $("sl-hote-absent").hidden = r.hoteEnLigne !== false
            if (r.inchange) { rafraichirChronos(); return }
            vue.v = r.v
            vue.public = r.public
            vue.prive = r.prive
            vue.partage = Array.isArray(r.partage) ? {} : (r.partage || {})
            vue.moi = r.moi || moi.nom
            if (r.annuaire) { vue.annuaire = Array.isArray(r.annuaire) ? {} : r.annuaire; vue.va = r.va }
            rendre()
        }).catch(function (e) {
            if (e.statut === 404 || e.statut === 403) {
                quitterSalle()
                messageSortie = e.statut === 404 ? "La partie est terminée · Rejoindre une autre partie" : "Tu as quitté la partie · Rejoindre une partie"
                majAccueilJoueur()
                return
            }
            $("sl-connexion").classList.add("perdue")
        }).then(function () {
            if (moi && routeJoueur()) minuteurJoueur = setTimeout(boucleJoueur, RYTHME_JOUEUR)
        })
    }
    function quitterSalle() {
        moi = null
        Chat.vider()
        ecrire(CLE_JOUEUR, null)
        clearTimeout(minuteurJoueur)
        document.documentElement.classList.remove("mode-soiree")
        majAccueilJoueur()
        if (routeJoueur()) location.hash = ""
    }
    $("sl-quitter").addEventListener("click", function () {
        if (this.classList.contains("confirmer")) { quitterSalle(); return }
        this.classList.add("confirmer")
        this.textContent = "Toucher encore pour quitter"
        const b = this
        setTimeout(function () { b.classList.remove("confirmer"); b.textContent = "Quitter la partie" }, 3000)
    })
    function envoyer(type, donnees) {
        if (!moi) return Promise.reject(new Error("hors ligne"))
        return appel("envoyer", { code: moi.code, id: moi.id, cle: moi.cle, type: type, donnees: donnees })
    }
    let minuteursPartage = {}
    function partager(champ, valeur) {
        clearTimeout(minuteursPartage[champ])
        minuteursPartage[champ] = setTimeout(function () {
            appel("partager", { code: moi.code, id: moi.id, cle: moi.cle, champ: champ, valeur: valeur }).catch(function () {})
        }, 350)
    }

    // Accueil : bouton « rejoindre » / « revenir à la partie »
    function majAccueilJoueur() {
        const b = $("lien-rejoindre")
        if (!b) return
        b.textContent = moi ? "Revenir à la partie " + moi.code : (messageSortie || "Rejoindre avec un code")
        const c = $("lien-creer-en-ligne")
        if (c) c.querySelector("span").textContent = hote ? "Reprendre ma partie en ligne (" + hote.code + ")" : "Créer une partie en ligne"
        const f = $("lien-fermer-en-ligne")
        if (f && !f.classList.contains("confirmer")) { f.hidden = !hote; f.textContent = "Fermer la partie en ligne " + (hote ? hote.code : "") }
    }
    let minuteurFermer = null
    function boutonFermer(b) {
        b.addEventListener("click", function () {
            if (!b.classList.contains("confirmer")) {
                b.dataset.texte = b.textContent
                b.textContent = "Toucher encore : les téléphones seront déconnectés"
                b.classList.add("confirmer"); son("clic")
                clearTimeout(minuteurFermer)
                minuteurFermer = setTimeout(function () { b.classList.remove("confirmer"); b.textContent = b.dataset.texte }, 3500)
                return
            }
            clearTimeout(minuteurFermer)
            b.classList.remove("confirmer")
            Salle.fermer()
        })
    }
    if ($("lien-fermer-en-ligne")) boutonFermer($("lien-fermer-en-ligne"))
    $("lien-rejoindre").addEventListener("click", function () { location.hash = moi ? "#salle" : "#rejoindre" })
    // Raccourci : ouvre la soirée et la salle d'un coup
    $("lien-creer-en-ligne").addEventListener("click", function () {
        const enCours = window.Soiree && Soiree.enCours()
        location.hash = enCours ? "#soiree" : "#soiree-joueurs"
        if (!hote) creerSalle("").catch(function () {})
    })

    // ---------- Rendu de la vue joueur ----------
    function el(tag, classe, texte) {
        const e = document.createElement(tag)
        if (classe) e.className = classe
        if (texte !== undefined && texte !== null) e.textContent = texte
        return e
    }
    function photoDe(nom) { return (vue.annuaire || {})[nom] || null }
    function av(nom, classe) {
        const a = el("span", "avatar" + (classe ? " " + classe : ""))
        a.dataset.nom = nom || ""
        const p = photoDe(nom)
        if (p) { const i = document.createElement("img"); i.src = p; i.alt = ""; a.appendChild(i) }
        else a.textContent = (nom || "?").charAt(0).toUpperCase()
        return a
    }
    function estMoi(nom) { return bas(nom) === bas(vue.moi) }
    function listeNoms(l) { return l.length > 1 ? l.slice(0, -1).join(", ") + " et " + l[l.length - 1] : (l[0] || "") }

    // Carte secrète : on touche, ça s'affiche 3 secondes, puis ça se cache
    function carteSecrete(contenu, consigne, auPremierCoup) {
        const b = el("button", "sl-secret")
        b.type = "button"
        b.dataset.son = "aucun"
        const cache = el("span", "sl-secret-cache")
        cache.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>'
        cache.appendChild(el("span", "", consigne || "Touche pour voir (3 secondes)"))
        const vu = el("span", "sl-secret-contenu")
        vu.appendChild(contenu)
        const barre = el("span", "sl-secret-barre")
        b.appendChild(cache); b.appendChild(vu); b.appendChild(barre)
        let minuteur = null
        b.addEventListener("click", function () {
            if (b.classList.contains("visible")) { b.classList.remove("visible"); clearTimeout(minuteur); return }
            son("clic")
            b.classList.add("visible")
            if (auPremierCoup) { auPremierCoup(); auPremierCoup = null }
            barre.style.animation = "none"; void barre.offsetWidth; barre.style.animation = ""
            clearTimeout(minuteur)
            minuteur = setTimeout(function () { b.classList.remove("visible") }, 3000)
        })
        return b
    }
    function texteSecret(grand, petit, fort) {
        const f = document.createDocumentFragment()
        const g = el("span", "sl-secret-grand" + (fort ? " fort" : ""), grand)
        f.appendChild(g)
        if (petit) f.appendChild(el("span", "sl-secret-petit", petit))
        return f
    }
    function carteInfo(etiquette, titre, detail) {
        const c = el("div", "sl-carte")
        if (etiquette) c.appendChild(el("p", "sl-etiquette", etiquette))
        if (titre) c.appendChild(el("p", "sl-titre", titre))
        if (detail) c.appendChild(el("p", "sl-detail", detail))
        return c
    }
    function scores(liste, titre) {
        const box = el("div", "sl-bloc")
        if (titre) box.appendChild(el("p", "etiquette", titre))
        const ol = el("ol", "so-classement")
        liste.forEach(function (s, i) {
            const li = el("li", "so-ligne" + (s.premier ? " premier" : "") + (s.noms && s.noms.some(estMoi) || estMoi(s.nom) ? " moi" : ""))
            li.appendChild(el("span", "so-rang", s.rang || i + 1))
            if (s.nom) li.appendChild(av(s.nom, "avatar-petit"))
            else li.appendChild(el("span", "sl-symbole " + (s.couleur || ""), s.signe || ""))
            const m = el("div", "so-milieu")
            m.appendChild(el("p", "so-nom", s.nom || s.equipe))
            if (s.detail) m.appendChild(el("p", "so-titres-ligne", s.detail))
            li.appendChild(m)
            li.appendChild(el("span", "so-points", s.points))
            ol.appendChild(li)
        })
        box.appendChild(ol)
        return box
    }
    function classementSoiree(compact) {
        const s = vue.public && vue.public.soiree
        if (!s || !s.classement) return null
        const box = el("details", "sl-repli")
        if (!compact) box.open = true
        box.appendChild(el("summary", "", "Classement de la soirée"))
        const ol = el("ol", "so-classement")
        s.classement.forEach(function (j) {
            const li = el("li", "so-ligne" + (j.rang === 1 && j.points > 0 ? " premier" : "") + (estMoi(j.nom) ? " moi" : ""))
            li.appendChild(el("span", "so-rang", s.personne ? "–" : j.rang))
            li.appendChild(av(j.nom, "avatar-petit"))
            const m = el("div", "so-milieu")
            m.appendChild(el("p", "so-nom", j.nom + (estMoi(j.nom) ? " (toi)" : "")))
            if (j.titres && j.titres.length) {
                const t = el("p", "so-titres-ligne")
                j.titres.forEach(function (x) { t.appendChild(el("span", "so-puce-titre", x)) })
                m.appendChild(t)
            }
            li.appendChild(m)
            li.appendChild(el("span", "so-points", j.points))
            ol.appendChild(li)
        })
        box.appendChild(ol)
        return box
    }

    let derniereCle = ""
    let dernierAvis = ""
    let buzzEnvoye = null
    const votesMytho = {}, votesQdn = {}
    let dernierCombo = 0
    let chronos = []   // éléments de compte à rebours à rafraîchir
    function rendre() {
        const pub = vue.public || { vue: "attente" }
        const racine = $("sl-contenu")
        $("sl-surtitre").textContent = "Partie " + moi.code
        document.documentElement.classList.add("mode-soiree")
        const jeu = pub.jeu || {}
        // Les vues avec des champs à remplir ne sont reconstruites que si leur étape change
        const cle = pub.vue + "|" + (jeu.id || "") + "|" + (jeu.phase || "") + "|" + (jeu.etape || "") + "|" + JSON.stringify(vue.prive || null) + "|" + (pub.vote ? pub.vote.id + (pub.vote.recus || []).indexOf(vue.moi) : "") +
            "|" + (jeu.vote ? jeu.vote.etape + "-" + (jeu.vote.votants || []).some(estMoi) + "-" + jeu.vote.candidats.join() : "") + "|" + (jeu.vus ? jeu.vus.partie : "")
        const peutVoter = jeu.vote && (jeu.vivants || []).some(estMoi) && !(jeu.vote.votants || []).some(estMoi)
        const voteMytho = jeu.id === "mytho" && jeu.phase === "vote" && !estMoi(jeu.conteur) && !(jeu.votants || []).some(estMoi) && votesMytho[jeu.position + "-" + jeu.conteur] === undefined
        const voteQdn = jeu.id === "qui-de-nous" && jeu.phase !== "resultats" && (jeu.candidats || []).length && !(jeu.votants || []).some(estMoi) && !votesQdn["q" + jeu.numero]
        const avecChamps = pub.vue === "vote" || (pub.vue === "jeu" && (peutVoter || voteMytho || voteQdn || (jeu.id === "crea-mime" && jeu.phase === "ecriture" && (jeu.parallele ? (jeu.ecritures || []).some(function (x) { return !x.pret && x.auteurs.some(estMoi) }) : (jeu.auteurs || []).some(estMoi))) || (jeu.id === "infiltre" && jeu.phase === "white" && vue.prive && vue.prive.deviner)))
        if (avecChamps && cle === derniereCle) { majChampsPartages(); return }
        derniereCle = cle
        chronos = []
        racine.textContent = ""
        const f = document.createDocumentFragment()
        const v = pub.vue
        if (v === "jeu") rendreJeu(f, jeu)
        else if (v === "hub") rendreHub(f, pub)
        else if (v === "gains") rendreGains(f, pub)
        else if (v === "vote") rendreVote(f, pub)
        else if (v === "ceremonie") rendreCeremonie(f, pub)
        else if (v === "bilan") rendreBilan(f, pub)
        else rendreAttente(f, pub)
        racine.appendChild(f)
        rafraichirChronos()
    }

    function boutonSelfie() {
        const b = el("button", "lien-discret sl-lien", "Changer ma photo")
        b.type = "button"
        b.addEventListener("click", function () { $("sl-fichier-salle").click() })
        return b
    }
    function rendreAttente(f, pub) {
        f.appendChild(av(vue.moi, "avatar-grand sl-moi"))
        f.appendChild(boutonSelfie())
        f.appendChild(carteInfo("Tu es dans la partie", "Salut " + vue.moi + " !", "L'hôte prépare la soirée. Garde cet écran ouvert : tout s'affichera ici."))
        // Ceux qui sont déjà là
        if (pub.arrives && pub.arrives.length) {
            const box = el("div", "sl-bloc")
            box.appendChild(el("p", "etiquette", "Déjà là · " + pub.arrives.length))
            const g = el("div", "sl-arrives")
            pub.arrives.forEach(function (n) { const d = el("div", "sl-arrive" + (estMoi(n) ? " moi" : "")); d.appendChild(av(n, "avatar-moyen")); d.appendChild(el("span", "", n)); g.appendChild(d) })
            box.appendChild(g)
            f.appendChild(box)
        }
        const c = classementSoiree(false)
        if (c) f.appendChild(c)
    }
    function rendreHub(f, pub) {
        const s = pub.soiree || {}
        f.appendChild(carteInfo(s.nbJeux ? "Entre deux jeux" : "La soirée commence", "L'hôte choisit le prochain jeu…", s.finale ? "Finale annoncée : le prochain jeu compte double !" : null))
        // Proposer un jeu depuis son téléphone
        if (pub.jeux) {
            const envies = pub.envies || {}
            const box = el("div", "sl-bloc")
            box.appendChild(el("p", "etiquette", "Je veux jouer à…"))
            const g = el("div", "sl-envies")
            pub.jeux.filter(function (x) { return x.jouable }).forEach(function (x) {
                const fans = Object.keys(envies).filter(function (n) { return envies[n] === x.id })
                const b = el("button", "sl-envie" + (fans.some(estMoi) ? " choisi" : ""))
                b.type = "button"
                b.appendChild(el("span", "", x.nom))
                if (fans.length) b.appendChild(el("small", "", "♥ " + fans.length))
                b.addEventListener("click", function () {
                    g.querySelectorAll(".sl-envie").forEach(function (o) { o.classList.toggle("choisi", o === b) })
                    envoyer("envie", x.id).then(function () { son("clic") })
                })
                g.appendChild(b)
            })
            box.appendChild(g)
            f.appendChild(box)
        }
        f.appendChild(boutonSelfie())
        const c = classementSoiree(false)
        if (c) f.appendChild(c)
    }
    function rendreGains(f, pub) {
        const g = pub.gains || {}
        f.appendChild(carteInfo(g.jeu || "Points de la soirée", g.liste && g.liste.length ? "Les points tombent" : "Personne ne marque", g.finale ? "Finale · points ×2" : null))
        const ul = el("ul", "so-gains")
        ;(g.liste || []).forEach(function (x) {
            const li = el("li", estMoi(x.nom) ? "moi" : "")
            li.appendChild(av(x.nom, "avatar-petit"))
            li.appendChild(el("span", "so-nom", x.nom))
            li.appendChild(el("span", "so-plus", "+" + x.points))
            ul.appendChild(li)
        })
        f.appendChild(ul)
        ;(g.titres || []).forEach(function (t) {
            const c = el("div", "so-titre-gagne")
            const tx = el("div")
            tx.appendChild(el("p", "so-titre-nom", t.titre))
            tx.appendChild(el("p", "so-titre-qui", listeNoms(t.noms) + (t.detail ? " · " + t.detail : "")))
            c.appendChild(tx)
            f.appendChild(c)
        })
        const c = classementSoiree(true)
        if (c) f.appendChild(c)
    }

    // ----- GOAT du cœur : chacun vote sur son téléphone -----
    let choixCoeur = null
    function rendreVote(f, pub) {
        const v = pub.vote || {}
        const aVote = (v.recus || []).indexOf(vue.moi) !== -1
        const peutVoter = (v.enLigne || []).some(estMoi)
        if (!peutVoter) { f.appendChild(carteInfo("GOAT du cœur", "Vote en cours", "Tu votes sur le téléphone de l'hôte.")); return }
        if (aVote) { f.appendChild(carteInfo("GOAT du cœur", "A voté !", "Ton vote est secret. Place à la cérémonie dans un instant…")); return }
        f.appendChild(carteInfo("GOAT du cœur", "Pour qui vote ton cœur ?", "En secret. Pas toi, évidemment."))
        const g = el("div", "so-grille-avatars")
        ;(v.candidats || []).filter(function (n) { return !estMoi(n) }).forEach(function (n) {
            const b = el("button", "so-choix-avatar")
            b.type = "button"
            b.setAttribute("aria-pressed", choixCoeur === n ? "true" : "false")
            b.appendChild(av(n, "avatar-moyen"))
            b.appendChild(el("span", "", n))
            b.addEventListener("click", function () {
                choixCoeur = n
                g.querySelectorAll(".so-choix-avatar").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false") })
                ok.disabled = false
                ok.textContent = "Voter pour " + n
            })
            g.appendChild(b)
        })
        f.appendChild(g)
        const ok = el("button", "btn btn-or btn-grand btn-fete", "Choisis ton GOAT du cœur")
        ok.type = "button"
        ok.disabled = !choixCoeur
        if (choixCoeur) ok.textContent = "Voter pour " + choixCoeur
        ok.addEventListener("click", function () {
            if (!choixCoeur) return
            ok.disabled = true
            envoyer("coeur", choixCoeur).then(function () { son("trouve"); ok.textContent = "A voté !" }).catch(function () { ok.disabled = false; ok.textContent = "Réessayer" })
        })
        f.appendChild(ok)
    }
    function rendreCeremonie(f, pub) {
        const e = pub.etape || {}
        const s = el("div", "pile-centre so-cer-scene revele" + (e.goat ? " goat" : ""))
        s.appendChild(el("p", "etiquette", e.etiquette || "La cérémonie"))
        const g = el("span", "avatars" + ((e.noms || []).length > 1 ? " plusieurs" : ""))
        ;(e.noms || []).forEach(function (n) { g.appendChild(av(n, "avatar-geant")) })
        s.appendChild(g)
        s.appendChild(el("p", "so-cer-nom", listeNoms(e.noms || [])))
        s.appendChild(el("p", "so-cer-titre", e.titre || ""))
        if (e.detail) s.appendChild(el("p", "sl-detail", e.detail))
        f.appendChild(s)
        if (e.goat && (e.noms || []).some(estMoi)) setTimeout(confettis, 400)
        else if (e.goat) setTimeout(confettis, 400)
    }
    function rendreBilan(f, pub) {
        const b = pub.bilan || {}
        f.appendChild(carteInfo("Fin de la soirée", "Le GOAT : " + listeNoms(b.goats || []), "Merci d'avoir joué. Le bilan est gardé sur ton téléphone."))
        const c = classementSoiree(false)
        if (c) f.appendChild(c)
        // On garde le bilan dans l'historique du joueur
        if (b.entree && window.Soiree && Soiree.garderBilan) Soiree.garderBilan(b.entree, vue.annuaire)
    }

    // ----- Les jeux -----
    function rendreJeu(f, j) {
        const p = vue.prive || {}
        const R = RENDUS[j.id]
        f.appendChild(el("p", "sl-jeu-nom", j.nom || ""))
        // C'est à toi / c'est bientôt toi
        const ACTIFS = { "blacksup": ["joueur", ["intro", "tour"]], "songs-up": ["fredonneur", ["revelation", "tour"]], "crea-mime": ["mime", ["tour", "mime"]], "mytho": ["conteur", ["secret", "recit"]] }
        const regle = ACTIFS[j.id]
        if (regle && j.phase !== "fin") {
            const actif = j[regle[0]], phaseActive = regle[1].indexOf(j.phase) !== -1
            let etat = null
            if (actif && estMoi(actif) && phaseActive) etat = "toi"
            else if (j.prochain && estMoi(j.prochain)) etat = "bientot"
            if (etat) {
                const b = el("div", "sl-a-toi " + etat)
                b.appendChild(el("p", "sl-a-toi-titre", etat === "toi" ? "C'est à toi !" : "Prépare-toi, c'est bientôt toi"))
                b.appendChild(el("p", "sl-a-toi-detail", etat === "toi" ? { "blacksup": "Fais deviner un max de mots à ton équipe.", "songs-up": "Regarde ton son et fredonne.", "crea-mime": "Regarde ta phrase et mime !", "mytho": "Regarde ta consigne et raconte." }[j.id] : "Tu passes juste après."))
                f.appendChild(b)
            }
            const cleTour = j.id + "|" + (j.etape || "") + "|" + (actif || "") + "|" + (etat || "")
            if (etat && cleTour !== dernierAvis) { if (typeof Sons !== "undefined" && Sons.aToi) Sons.aToi(etat === "bientot") }
            dernierAvis = cleTour
        }
        // Ton équipe (jeux en équipes)
        const mienne = (j.equipes || []).filter(function (e) { return (e.noms || []).some(estMoi) })[0]
        if (mienne && j.phase !== "fin") {
            const c = el("div", "sl-equipe")
            c.appendChild(el("span", "sl-symbole " + (mienne.couleur || ""), mienne.signe || ""))
            const t = el("div")
            t.appendChild(el("p", "sl-etiquette", "Ton équipe"))
            t.appendChild(el("p", "sl-equipe-nom", mienne.nom + " · " + listeNoms(mienne.noms.filter(function (n) { return !estMoi(n) })) ))
            c.appendChild(t)
            f.appendChild(c)
        } else if (j.equipes && j.equipes.length && j.phase === "preparation") {
            f.appendChild(carteInfo("", "Les équipes se forment…", "Tu n'es pas encore dans une équipe."))
        }
        if (R) R(f, j, p)
        else f.appendChild(carteInfo("", "Partie en cours", null))
        const c = classementSoiree(true)
        if (c) f.appendChild(c)
    }

    function listeJoueursEtat(titre, vivants, elimines, roleLibelle) {
        const box = el("div", "sl-bloc")
        box.appendChild(el("p", "etiquette", titre))
        const ul = el("ul", "dx-vivants")
        ;(vivants || []).forEach(function (n) { ul.appendChild(el("li", estMoi(n) ? "moi" : "", n)) })
        ;(elimines || []).forEach(function (x) { ul.appendChild(el("li", "mort" + (x.or ? " dieu" : ""), x.nom + (roleLibelle && x.role ? " · " + x.role : ""))) })
        box.appendChild(ul)
        return box
    }
    function chrono(finServeur, libelle) {
        const p = el("p", "sl-chrono", "")
        p.dataset.fin = finServeur
        if (libelle) p.dataset.libelle = libelle
        chronos.push(p)
        return p
    }
    function chronoMontant(debutServeur, cumul, actif) {
        const p = el("p", "sl-chrono montant", "")
        p.dataset.debut = debutServeur || 0
        p.dataset.cumul = cumul || 0
        p.dataset.actif = actif ? "1" : ""
        chronos.push(p)
        return p
    }
    function rafraichirChronos() {
        const t = maintenantServeur()
        chronos.forEach(function (c) {
            if (c.dataset.fin) {
                const s = Math.max(0, Math.ceil((+c.dataset.fin - t) / 1000))
                c.textContent = (c.dataset.libelle ? c.dataset.libelle + " " : "") + s + " s"
            } else {
                let ms = +c.dataset.cumul + (c.dataset.actif ? t - +c.dataset.debut : 0)
                ms = Math.max(0, ms)
                const tot = Math.floor(ms / 1000)
                c.textContent = Math.floor(tot / 60) + ":" + String(tot % 60).padStart(2, "0")
            }
        })
    }
    setInterval(function () { if (routeJoueur() && chronos.length) rafraichirChronos() }, 250)

    const RENDUS = {}

    function coulissesJoueur(c) {
        const boite = el("div", "coulisses")
        rendreCoulisses(boite, c)
        // ta propre ligne en évidence
        boite.querySelectorAll(".coulisses-bilan li").forEach(function (li) { if (estMoi(li.querySelector(".coulisses-nom").textContent)) li.classList.add("moi") })
        return boite
    }

    // Qui a vu son mot / son rôle (visible par tous)
    function listeVus(v, quoi) {
        const box = el("div", "sl-bloc")
        box.appendChild(el("p", "etiquette", "Qui a vu " + quoi + " ?"))
        const ul = el("ul", "vus-liste")
        ;(v.joueurs || []).forEach(function (n) {
            const ok = (v.vus || []).indexOf(n) !== -1
            const li = el("li", ok ? "vu" : "")
            const c = el("span", "vus-coche")
            if (ok) c.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>'
            li.appendChild(c)
            li.appendChild(document.createTextNode(n + (estMoi(n) ? " (toi)" : "")))
            li.appendChild(el("small", "", ok ? "c'est fait" : "en attente…"))
            ul.appendChild(li)
        })
        box.appendChild(ul)
        return box
    }
    function signalerVu(v) {
        const cle = "vu-" + v.partie
        return function () { if (!envoyes[cle]) { envoyes[cle] = true; envoyer("vu", { partie: v.partie }).catch(function () { envoyes[cle] = false }) } }
    }
    const envoyes = {}
    // Vote d'élimination sur son téléphone (définitif, avec confirmation)
    const mesVotes = {}
    function blocVote(j) {
        const v = j.vote
        const box = el("div", "sl-vote")
        if (v.message) box.appendChild(el("p", "vote-message", v.message))
        const moiVivant = (j.vivants || []).some(estMoi)
        const aVote = (v.votants || []).some(estMoi)
        const participe = moiVivant || (j.elimines || []).some(function (x) { return estMoi(x.nom) })
        if (!participe) { box.appendChild(el("p", "sl-detail", "Tu ne joues pas cette partie : regarde les autres s'accuser. Tu entreras dans la prochaine.")); return box }
        if (!moiVivant) { box.appendChild(el("p", "sl-detail", "Tu ne votes plus : tu as été éliminé.")); return box }
        if (aVote) {
            box.appendChild(el("p", "sl-titre", mesVotes[v.etape] ? "Tu as voté pour " + mesVotes[v.etape] : "Tu as voté"))
            box.appendChild(el("p", "sl-detail", "Ton vote est définitif. Résultat quand tout le monde aura voté."))
        } else {
            box.appendChild(el("p", "sl-etiquette", "Ton vote · quand tu veux, mais c'est définitif"))
            const g = el("div", "grille-vote")
            let choix = null
            const ok = el("button", "btn btn-erreur", "Choisis qui éliminer")
            ok.type = "button"; ok.disabled = true
            v.candidats.filter(function (n) { return !estMoi(n) }).forEach(function (n) {
                const b = el("button", "choix-vote", n)
                b.type = "button"
                b.setAttribute("aria-pressed", "false")
                b.addEventListener("click", function () {
                    choix = n
                    g.querySelectorAll(".choix-vote").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false") })
                    ok.disabled = false
                    ok.classList.remove("confirmer")
                    ok.textContent = "Voter contre " + n
                })
                g.appendChild(b)
            })
            ok.addEventListener("click", function () {
                if (!choix) return
                if (!ok.classList.contains("confirmer")) { ok.classList.add("confirmer"); ok.textContent = "Sûr ? Toucher encore : vote définitif contre " + choix; return }
                ok.disabled = true
                const pour = choix
                envoyer("vote", { etape: v.etape, pour: pour }).then(function () { mesVotes[v.etape] = pour; son("trouve"); ok.textContent = "Vote envoyé" })
                    .catch(function () { ok.disabled = false; ok.textContent = "Réessayer" })
            })
            box.appendChild(g)
            box.appendChild(ok)
        }
        const p = el("p", "sl-detail", "Votes reçus : " + (v.votants || []).length + " / " + (j.vivants || []).length)
        p.id = "sl-vote-progres"
        box.appendChild(p)
        return box
    }

    RENDUS["infiltre"] = function (f, j, p) {
        const elimine = (j.elimines || []).some(function (x) { return estMoi(x.nom) })
        if (j.phase !== "fin" && (p.mot || p.white)) {
            f.appendChild(carteSecrete(p.white ? texteSecret("Mister White", "Tu n'as pas de mot. Écoute bien et bluffe !", true) : texteSecret(p.mot, "Ton mot"), "Touche pour voir ton mot (3 secondes)", j.vus ? signalerVu(j.vus) : null))
        }
        if (j.phase === "vus" && j.vus) f.appendChild(listeVus(j.vus, "son mot"))
        if (j.vote && j.phase !== "fin") f.appendChild(blocVote(j))
        if (elimine && j.phase !== "fin" && !p.deviner) f.appendChild(carteInfo("", "Tu es éliminé", "Tu te tais jusqu'à la fin de la partie."))
        if (j.phase === "distribution" || j.phase === "preparation") f.appendChild(carteInfo("Tour 1", "Chacun découvre son mot…", null))
        if (j.phase === "tour") {
            const c = carteInfo("Tour " + j.tour, "Décrivez votre mot, dans cet ordre", null)
            const ol = el("ol", "ordre-parole sl-ordre")
            ;(j.ordre || []).forEach(function (n, i) { const li = el("li", estMoi(n) ? "moi" : "", n); ol.appendChild(li) })
            c.appendChild(ol)
            const k = (j.ordre || []).findIndex(estMoi)
            if (k !== -1) c.appendChild(el("p", "sl-detail", k === 0 ? "Tu commences !" : "Tu parles en " + (k + 1) + "e position."))
            f.appendChild(c)
        }
        if (j.phase === "vote" && !j.vote) f.appendChild(carteInfo("Tour " + j.tour, "Le vote", "Débattez puis désignez l'éliminé : l'hôte valide sur son téléphone."))
        if (j.phase === "revelation" || j.phase === "white") {
            const r = j.revelation || {}
            f.appendChild(carteInfo(r.nom + " était", r.role, j.phase === "white" ? (p.deviner ? "C'est à toi : tape le mot des civils. Une seule chance !" : "Mister White tente de trouver le mot des civils…") : r.detail))
            if (j.phase === "white" && p.deviner) {
                const box = el("div", "sl-bloc")
                const champ = el("input", "saisie")
                champ.type = "text"; champ.id = "sl-white-mot"; champ.placeholder = "Le mot des civils"; champ.autocomplete = "off"
                champ.setAttribute("autocorrect", "off"); champ.setAttribute("autocapitalize", "off"); champ.spellcheck = false
                const b = el("button", "btn btn-or", "Valider ma réponse")
                b.type = "button"
                b.addEventListener("click", function () {
                    if (!champ.value.trim()) return
                    b.disabled = true
                    envoyer("white", champ.value.trim()).then(function () { champ.value = ""; b.textContent = "Réponse envoyée…" }).catch(function () { b.disabled = false })
                })
                box.appendChild(champ); box.appendChild(b)
                f.appendChild(box)
            }
        }
        if (j.phase === "fin") {
            const c = carteInfo("Fin de partie", j.fin && j.fin.titre, j.fin && j.fin.mots)
            f.appendChild(c)
            if (j.fin && j.fin.roles) {
                const ul = el("ul", "bilan-roles")
                j.fin.roles.forEach(function (r) { const li = el("li", estMoi(r.nom) ? "moi" : ""); li.appendChild(el("span", "bilan-nom", r.nom)); li.appendChild(el("span", "bilan-role", r.role)); ul.appendChild(li) })
                f.appendChild(ul)
            }
            if (j.fin && j.fin.coulisses) f.appendChild(coulissesJoueur(j.fin.coulisses))
        }
        if (j.phase !== "fin" && j.phase !== "preparation" && j.phase !== "vus") f.appendChild(listeJoueursEtat("Les joueurs", j.vivants, j.elimines, true))
    }

    RENDUS["dieux"] = function (f, j, p) {
        if (j.phase !== "fin" && j.phase !== "nuit" && p.role) f.appendChild(carteSecrete(p.role === "dieu" ? texteSecret("Tu es un Dieu", p.autres ? (p.autres.length ? "Les autres dieux : " + listeNoms(p.autres) + ". Pas besoin d'ouvrir les yeux cette nuit." : "Tu es le seul dieu.") : "Pendant la nuit, ouvre les yeux pour voir les autres dieux.", true) : texteSecret("Tu es Humain", "Démasquez les dieux avant qu'il soit trop tard."), "Touche pour voir ton rôle (3 secondes)", j.vus ? signalerVu(j.vus) : null))
        if (j.phase === "vus" && j.vus) f.appendChild(listeVus(j.vus, "son rôle"))
        if (j.vote && j.phase !== "fin") f.appendChild(blocVote(j))
        if ((j.elimines || []).some(function (x) { return estMoi(x.nom) }) && j.phase !== "fin") f.appendChild(carteInfo("", "Tu es éliminé", "Tu te tais jusqu'à la fin."))
        if (j.phase === "nuit") {
            const c = carteInfo(j.nuit && j.nuit.surtitre || "La nuit", j.nuit && j.nuit.texte || "Tout le monde ferme les yeux.", "Écoutez la voix du téléphone de l'hôte.")
            c.classList.add("sl-nuit")
            f.appendChild(c)
        }
        if (j.phase === "jour") f.appendChild(carteInfo("Jour " + j.jour, "Débat libre", j.dieuxRestants + (j.dieuxRestants > 1 ? " dieux se cachent encore parmi vous." : " dieu se cache encore parmi vous.")))
        if (j.phase === "vote" && !j.vote) f.appendChild(carteInfo("Jour " + j.jour, "La sentence", "L'hôte désigne la personne éliminée."))
        if (j.phase === "revelation" && j.revelation) f.appendChild(carteInfo(j.revelation.nom + " était", j.revelation.role, j.revelation.detail || null))
        if (j.phase === "distribution" || j.phase === "preparation") f.appendChild(carteInfo("", "Les rôles sont distribués…", "Regarde ton rôle en secret."))
        if (j.phase === "fin" && j.fin) {
            f.appendChild(carteInfo("Fin de partie", j.fin.titre, j.fin.detail))
            if (j.fin.coulisses) f.appendChild(coulissesJoueur(j.fin.coulisses))
        }
        if (j.phase !== "fin" && j.phase !== "nuit" && j.phase !== "vus") f.appendChild(listeJoueursEtat("Sur Terre", j.vivants, j.elimines, true))
    }

    RENDUS["mytho"] = function (f, j, p) {
        if (p.consigne) {
            f.appendChild(carteSecrete(texteSecret(p.consigne === "mytho" ? "Raconte un mytho" : "Dis la vérité", p.theme, p.consigne === "mytho"), "Touche pour voir ta consigne (3 secondes)"))
            if (j.phase === "secret") {
                const b = el("button", "lien-discret sl-lien", "Changer de thème")
                b.type = "button"
                b.addEventListener("click", function () { b.disabled = true; envoyer("theme", 1).then(function () { setTimeout(function () { b.disabled = false }, 1500) }) })
                f.appendChild(b)
            }
        }
        if (j.phase === "secret" || j.phase === "recit") f.appendChild(carteInfo("Histoire " + j.histoire, j.conteur + (j.phase === "secret" ? " découvre sa consigne…" : " raconte"), j.theme))
        if (j.phase === "vote") {
            const joue = (j.scores || []).some(function (s) { return estMoi(s.nom) })
            if (!joue || estMoi(j.conteur)) f.appendChild(carteInfo("Le verdict", "Vrai ou mytho ?", estMoi(j.conteur) ? "Les autres votent… garde ton sérieux." : "Les joueurs votent."))
            else {
                const cle = j.position + "-" + j.conteur
                const deja = (j.votants || []).some(estMoi) || votesMytho[cle] !== undefined
                const box = el("div", "sl-vote")
                box.appendChild(el("p", "sl-titre", deja ? "Tu as voté : " + (votesMytho[cle] === undefined ? "c'est noté" : (votesMytho[cle] ? "Mytho" : "Vrai")) : "Vrai ou mytho ?"))
                if (!deja) {
                    box.appendChild(el("p", "sl-detail", j.conteur + " dit-il la vérité ? Vote en secret, c'est définitif."))
                    const ligne = el("div", "sl-vrai-mytho")
                    ;[["Vrai", false], ["Mytho", true]].forEach(function (x) {
                        const b = el("button", "btn " + (x[1] ? "btn-erreur" : "btn-or") + " btn-grand", x[0])
                        b.type = "button"
                        b.addEventListener("click", function () {
                            if (!b.classList.contains("confirmer")) { ligne.querySelectorAll(".btn").forEach(function (o) { o.classList.remove("confirmer") }); b.classList.add("confirmer"); b.textContent = "Sûr ? " + x[0]; return }
                            ligne.querySelectorAll(".btn").forEach(function (o) { o.disabled = true })
                            votesMytho[cle] = x[1]
                            envoyer("mytho-vote", { position: j.position, mytho: x[1] }).then(function () { son("trouve"); b.textContent = "Voté : " + x[0] }).catch(function () { delete votesMytho[cle]; ligne.querySelectorAll(".btn").forEach(function (o) { o.disabled = false }) })
                        })
                        ligne.appendChild(b)
                    })
                    box.appendChild(ligne)
                } else box.appendChild(el("p", "sl-detail", "Réponse dès que tout le monde a voté."))
                f.appendChild(box)
            }
        }
        if (j.phase === "resultat" && j.resultat) { const c = carteInfo(j.conteur + " · c'était", j.resultat.verdict, j.resultat.gain); if (j.resultat.detail) c.appendChild(el("p", "sl-detail", j.resultat.detail)); f.appendChild(c) }
        if (j.phase === "fin" && j.fin) f.appendChild(carteInfo("Fin de partie", j.fin.titre, j.fin.detail))
        if (j.scores && j.scores.length) f.appendChild(scores(j.scores, "Les scores"))
    }

    RENDUS["songs-up"] = function (f, j, p) {
        if (p.titre) {
            f.appendChild(carteSecrete(texteSecret(p.titre, p.artiste, true), "Touche pour voir ton son (3 secondes)"))
            if (j.phase === "revelation") {
                const b = el("button", "lien-discret sl-lien", "Je ne connais pas, un autre son")
                b.type = "button"
                b.addEventListener("click", function () { b.disabled = true; envoyer("autre-son", 1).then(function () { setTimeout(function () { b.disabled = false }, 1500) }) })
                f.appendChild(b)
            }
        }
        if (j.phase === "revelation") f.appendChild(carteInfo("Son " + j.numero, j.fredonneur + " découvre le son…", null))
        if (j.phase === "tour") {
            const c = carteInfo("Son " + j.numero, j.buzz ? j.buzz + " a buzzé !" : j.fredonneur + " fredonne", j.buzz ? "Chrono en pause, l'hôte vérifie…" : "Buzze dès que tu as le titre !")
            if (j.finServeur && !j.buzz) c.appendChild(chrono(j.finServeur))
            f.appendChild(c)
            const joue = (j.scores || []).some(function (s) { return estMoi(s.nom) })
            if (joue && !estMoi(j.fredonneur)) {
                const refuse = (j.refuses || []).some(estMoi)
                const b = el("button", "sl-buzzer", refuse ? "Raté… les autres cherchent" : (j.buzz ? (estMoi(j.buzz) ? "Ton buzz est vérifié…" : j.buzz + " a buzzé") : "J'AI TROUVÉ !"))
                b.type = "button"
                b.disabled = refuse || !!j.buzz || buzzEnvoye === j.numero
                if (buzzEnvoye === j.numero && !j.buzz && !refuse) b.textContent = "Buzz envoyé !"
                b.addEventListener("click", function () {
                    b.disabled = true; b.textContent = "Buzz envoyé !"
                    buzzEnvoye = j.numero
                    if (typeof Sons !== "undefined" && Sons.buzzer) Sons.buzzer()
                    envoyer("buzz", { numero: j.numero }).catch(function () { b.disabled = false; buzzEnvoye = null; b.textContent = "J'AI TROUVÉ !" })
                })
                f.appendChild(b)
            }
        }
        if (j.phase === "qui") f.appendChild(carteInfo("Son " + j.numero, "Trouvé !", "L'hôte note qui a trouvé…"))
        if (j.phase === "resultat" && j.resultat) f.appendChild(carteInfo("C'était", j.resultat.titre, j.resultat.artiste + (j.resultat.gain ? " · " + j.resultat.gain : "")))
        if (j.phase === "fin" && j.fin) f.appendChild(carteInfo("Fin de partie", j.fin.titre, j.fin.detail))
        if (j.scores && j.scores.length) f.appendChild(scores(j.scores, "Objectif : " + j.objectif + " points"))
    }

    RENDUS["passe-mot"] = function (f, j, p) {
        if (p.mot && (j.phase === "revelation" || j.phase === "duel")) f.appendChild(carteSecrete(texteSecret(p.mot, "Tu fais deviner ce mot", true), "Touche pour voir le mot (3 secondes)"))
        if (j.phase === "revelation") f.appendChild(carteInfo("Mot " + j.numero, "Font deviner : " + listeNoms(j.donneurs || []), "Les autres, ne regardez pas le téléphone de l'hôte !"))
        if (j.phase === "duel") { const c = carteInfo("Mot " + j.numero + " · " + j.points, j.roles, null); if (j.finServeur) c.appendChild(chrono(j.finServeur)); f.appendChild(c) }
        if (j.phase === "resultat" && j.resultat) f.appendChild(carteInfo("C'était", j.resultat.mot, j.resultat.gain))
        if (j.phase === "fin" && j.fin) f.appendChild(carteInfo("Fin de partie", j.fin.titre, null))
        if (j.scores && j.scores.length) f.appendChild(scores(j.scores, "Les duos"))
    }

    RENDUS["crea-mime"] = function (f, j, p) {
        if (j.phase === "ecriture" && j.parallele) {
            const m = (j.ecritures || []).filter(function (x) { return x.auteurs.some(estMoi) })[0]
            const autreE = (j.ecritures || []).filter(function (x) { return x !== m })[0]
            if (m && !m.pret) {
                f.appendChild(carteInfo(m.nom, "Écrivez " + j.nb + " phrases pour " + m.cible, "Chacun peut écrire depuis son téléphone, tout se met à jour chez vos coéquipiers. Au moins 3 mots par phrase, puis validez."))
                const zone = el("div", "cm-phrases sl-phrases")
                const valider = el("button", "btn btn-or btn-fete", "Valider nos phrases")
                valider.type = "button"
                const majValider = function () {
                    const tous = Array.from(zone.querySelectorAll("textarea")).every(function (t) { return t.value.trim().split(/\s+/).filter(Boolean).length >= 3 })
                    valider.disabled = !tous
                }
                for (let i = 0; i < j.nb; i++) {
                    const bloc = el("div", "cm-phrase-champ")
                    const lab = el("label")
                    lab.appendChild(el("span", "", "Phrase " + (i + 1)))
                    const compte = el("span", "", "")
                    lab.appendChild(compte)
                    const t = el("textarea")
                    t.rows = 2; t.maxLength = 160
                    t.dataset.champ = m.prefixe + "-" + i
                    t.placeholder = "Une phrase à faire mimer…"
                    t.addEventListener("input", function () { majCompte(t, compte); partager(t.dataset.champ, t.value); majValider() })
                    bloc.appendChild(lab); bloc.appendChild(t)
                    zone.appendChild(bloc)
                }
                valider.addEventListener("click", function () {
                    valider.disabled = true
                    // On envoie d'abord les dernières frappes, puis la validation
                    zone.querySelectorAll("textarea").forEach(function (t) { clearTimeout(minuteursPartage[t.dataset.champ]); appel("partager", { code: moi.code, id: moi.id, cle: moi.cle, champ: t.dataset.champ, valeur: t.value }).catch(function () {}) })
                    setTimeout(function () {
                        envoyer("cm-valider", { equipe: m.equipe }).then(function () { valider.textContent = "Validation envoyée…" }).catch(function () { valider.disabled = false })
                    }, 600)
                })
                zone.addEventListener("input", majValider)
                f.appendChild(zone)
                f.appendChild(valider)
                setTimeout(function () { majChampsPartages(); majValider() }, 0)
                zone.dataset.valider = "1"
            } else if (m && m.pret) {
                f.appendChild(carteInfo(m.nom, "Phrases validées ✓", autreE && !autreE.pret ? autreE.nom + " écrit encore vos phrases… " + (autreE.pretes || 0) + " / " + j.nb + " prêtes." : "Toutes les phrases sont créées ! Place au spectacle."))
            } else {
                f.appendChild(carteInfo("Créa'Mime", "Les équipes écrivent…", null))
            }
            if (m && !m.pret && autreE) f.appendChild(el("p", "sl-detail", autreE.pret ? autreE.nom + " a déjà validé ses phrases !" : autreE.nom + " écrit aussi vos phrases (" + (autreE.pretes || 0) + " / " + j.nb + " prêtes)."))
        } else if (j.phase === "ecriture") {
            const dansEquipe = (j.auteurs || []).some(estMoi)
            if (dansEquipe) {
                f.appendChild(carteInfo(j.equipeAuteur, "Écrivez " + j.nb + " phrases pour " + j.equipeCible, "Chacun peut écrire depuis son téléphone : tout se met à jour chez vos coéquipiers. Au moins 3 mots par phrase."))
                const zone = el("div", "cm-phrases sl-phrases")
                for (let i = 0; i < j.nb; i++) {
                    const bloc = el("div", "cm-phrase-champ")
                    const lab = el("label")
                    lab.appendChild(el("span", "", "Phrase " + (i + 1)))
                    const compte = el("span", "", "")
                    lab.appendChild(compte)
                    const t = el("textarea")
                    t.rows = 2; t.maxLength = 160
                    t.dataset.champ = j.prefixe + "-" + i
                    t.placeholder = "Une phrase à faire mimer…"
                    t.addEventListener("input", function () { majCompte(t, compte); partager(t.dataset.champ, t.value) })
                    bloc.appendChild(lab); bloc.appendChild(t)
                    zone.appendChild(bloc)
                }
                f.appendChild(zone)
                setTimeout(majChampsPartages, 0)
            } else {
                const pret = j.pretes || 0
                f.appendChild(carteInfo(j.equipeAuteur + " écrit", "Vos phrases se préparent…", pret + " / " + j.nb + " phrases prêtes. Soyez prêts à souffrir."))
            }
        }
        if (p.phrase && (j.phase === "tour" || j.phase === "mime")) f.appendChild(carteSecrete(texteSecret(p.phrase, "Ta phrase à mimer", true), "Touche pour voir ta phrase (3 secondes)"))
        if (j.phase === "tour") f.appendChild(carteInfo("Tour " + j.tour, j.mime + " va mimer", "Pour " + j.equipe))
        if (j.phase === "mime") { const c = carteInfo("Tour " + j.tour, j.mime + " mime", "Pour " + j.equipe + ". Trouvez la phrase exacte !"); c.appendChild(chronoMontant(j.debutServeur, j.cumul, j.chronoActif)); f.appendChild(c) }
        if (j.phase === "resultat" && j.resultat) f.appendChild(carteInfo(j.resultat.titre, j.resultat.phrase, j.resultat.detail))
        if (j.phase === "fin" && j.fin) f.appendChild(carteInfo("Fin de partie", j.fin.titre, j.fin.detail))
        if (j.scores && j.scores.length) f.appendChild(scores(j.scores, "Temps cumulés (le plus bas gagne)"))
    }
    function compterPretes(j) {
        let n = 0
        for (let i = 0; i < j.nb; i++) {
            const v = (vue.partage[j.prefixe + "-" + i] || {}).valeur || ""
            if (v.trim().split(/\s+/).filter(Boolean).length >= 3) n++
        }
        return n
    }
    function majCompte(t, compte) {
        const k = t.value.trim().split(/\s+/).filter(Boolean).length
        compte.textContent = k + (k > 1 ? " mots" : " mot")
        compte.classList.toggle("ok", k >= 3)
    }
    // Les phrases écrites par les coéquipiers arrivent ; on ne touche pas au champ en cours d'écriture
    function majChampsPartages() {
        setTimeout(function () { document.querySelectorAll("#sl-contenu .sl-phrases").forEach(function (z) { z.dispatchEvent(new Event("input")) }) }, 0)
        const pv = document.getElementById("sl-vote-progres")
        const jv = vue.public && vue.public.jeu && vue.public.jeu.vote
        if (pv && jv) pv.textContent = "Votes reçus : " + (jv.votants || []).length + " / " + (vue.public.jeu.vivants || []).length
        document.querySelectorAll("#sl-contenu textarea[data-champ]").forEach(function (t) {
            if (document.activeElement === t) return
            const v = (vue.partage[t.dataset.champ] || {}).valeur
            if (typeof v === "string" && v !== t.value) { t.value = v; majCompte(t, t.parentNode.querySelector("label span:last-child")) }
            if (!t.dataset.vu) { t.dataset.vu = "1"; majCompte(t, t.parentNode.querySelector("label span:last-child")) }
        })
    }

    RENDUS["blacksup"] = function (f, j) {
        if (j.phase === "preparation" && !(j.equipes || []).length) f.appendChild(carteInfo("", "Les équipes se forment…", null))
        if (j.manche && !j.fin) {
            const c = carteInfo("Manche " + j.numeroManche + " · " + j.manche, j.joueur ? j.joueur + " fait deviner" : "Au tour de " + j.equipe, j.equipe ? "Pour " + j.equipe + " · " + j.restants + " mots restants" : null)
            if (j.finServeur) c.appendChild(chrono(j.finServeur))
            // Combo en direct : le compteur de mots du tour grimpe sur tous les téléphones
            if (j.phase === "tour") {
                const n = j.trouvesTour || 0
                const k = el("div", "sl-combo niveau-" + Math.min(n, 8) + (n > dernierCombo ? " eclate" : ""))
                k.appendChild(el("span", "sl-combo-n", n))
                k.appendChild(el("span", "sl-combo-txt", n ? nomCombo(n) : "mot trouvé ce tour"))
                c.appendChild(k)
                dernierCombo = n
            } else dernierCombo = 0
            f.appendChild(c)
        }
        if (j.scores && j.scores.length) f.appendChild(scores(j.scores, j.fin ? "Score final" : "Les scores"))
        if (j.fin) f.appendChild(carteInfo("Fin de partie", j.fin, null))
    }

    RENDUS["qui-de-nous"] = function (f, j) {
        if (j.phase === "resultats" && j.resultats) {
            f.appendChild(carteInfo("Question " + j.numero, j.question, null))
            const ol = el("ol", "qdn-resultats")
            const max = j.resultats.length ? j.resultats[0].voix : 1
            j.resultats.forEach(function (r) {
                const li = el("li", r.voix === max ? "premier" : "")
                li.appendChild(av(r.nom, "avatar-petit"))
                li.appendChild(el("span", "qdn-res-nom", r.nom + (estMoi(r.nom) ? " (toi)" : "")))
                const b = el("span", "qdn-res-barre"); b.style.setProperty("--part", (r.voix / max * 100) + "%"); li.appendChild(b)
                li.appendChild(el("span", "qdn-res-voix", r.voix))
                ol.appendChild(li)
            })
            f.appendChild(ol)
            f.appendChild(el("p", "sl-detail", "Entracte · sans points"))
            return
        }
        const c = el("div", "qdn-carte sl-qdn")
        c.appendChild(el("p", "qdn-question", j.question || ""))
        f.appendChild(c)
        // Désigner quelqu'un en secret
        if (j.candidats && j.candidats.length) {
            const cle = "q" + j.numero
            const deja = (j.votants || []).some(estMoi) || votesQdn[cle]
            if (deja) f.appendChild(el("p", "sl-detail sl-centre", "Tu as désigné " + (votesQdn[cle] || "quelqu'un") + ". Résultats bientôt !"))
            else {
                const g = el("div", "so-grille-avatars")
                j.candidats.forEach(function (n) {
                    const b = el("button", "so-choix-avatar")
                    b.type = "button"
                    b.appendChild(av(n, "avatar-moyen"))
                    b.appendChild(el("span", "", estMoi(n) ? n + " (toi)" : n))
                    b.addEventListener("click", function () {
                        votesQdn[cle] = n
                        g.querySelectorAll("button").forEach(function (x) { x.disabled = true; x.setAttribute("aria-pressed", x === b ? "true" : "false") })
                        envoyer("qdn", { numero: j.numero, pour: n }).then(function () { son("clic") }).catch(function () { delete votesQdn[cle]; g.querySelectorAll("button").forEach(function (x) { x.disabled = false }) })
                    })
                    g.appendChild(b)
                })
                f.appendChild(el("p", "sl-etiquette sl-centre", "Désigne quelqu'un en secret"))
                f.appendChild(g)
            }
        }
        if (j.pointezServeur) {
            const d = el("p", "sl-pointez", "")
            d.dataset.pointez = j.pointezServeur
            f.appendChild(d)
            let tours = 0
            const maj = function () {
                const reste = +d.dataset.pointez - maintenantServeur()
                if (!d.isConnected && tours++ > 2) return
                if (reste > 0) { d.textContent = String(Math.ceil(reste / 900)); setTimeout(maj, 100) }
                else d.textContent = "Pointez !"
            }
            setTimeout(maj, 0)
        }
        f.appendChild(el("p", "sl-detail", "Entracte · sans points"))
    }

    // ---------- Navigation ----------
    function surAdresse() {
        if (location.hash === "#rejoindre") preparerRejoindre()
        document.documentElement.classList.toggle("vue-joueur", routeJoueur() || location.hash === "#rejoindre")
        Chat.afficherBouton((routeJoueur() && !!moi) || !!hote)
        if (routeJoueur()) {
            if (!moi) { location.replace("#rejoindre"); return }
            derniereCle = ""
            musique(false)
            boucleJoueur()
        } else {
            clearTimeout(minuteurJoueur)
            if (!(window.Soiree && Soiree.enCours())) document.documentElement.classList.toggle("mode-soiree", false)
        }
        majAccueilJoueur()
    }
    window.addEventListener("hashchange", surAdresse)

    // Lien partagé : blacksup.com/?salle=KZPT
    if (new URLSearchParams(location.search).get("salle") && location.hash !== "#salle") location.hash = "#rejoindre"
    surAdresse()
    if (hote) { boucleHote(); diffuser() }
    majPanneaux()
})()

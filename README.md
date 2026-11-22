# Black's Up!

Le jeu des soirées clandestines : décrivez, un mot, mimez.

Site statique (HTML, CSS, JavaScript), installable comme une application et jouable hors connexion.

## Structure

- `index.html` : toute l'application (accueil, règles, paramètres, partie)
- `styles.css` : le design
- `scripts/jeu.js` : le déroulement d'une partie
- `scripts/mots.js` : la liste des mots, par catégories
- `scripts/sons.js` : les sons et la musique
- `scripts/app.js` : mode application (hors connexion, écran allumé, installation)
- `scripts/animations.js` : animations communes
- `sw.js` : mode hors connexion
- `regles.html`, `CAJOUE.html` : anciennes adresses, redirigées vers `index.html`

## Mettre à jour

À chaque modification : augmenter `VERSION` dans `sw.js` et le numéro `?v=` dans `index.html`.

## Mise en ligne

Chaque envoi sur la branche `main` est déployé automatiquement sur blacksup.com par Hostinger.

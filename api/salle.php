<?php
// =========================================================
// BLACK'S UP — salles en ligne
// L'hôte crée une salle (code à 4 lettres), les joueurs la rejoignent.
// L'hôte publie l'état (public + secrets par joueur), les joueurs le lisent
// toutes les 1 à 2 secondes et envoient leurs actions (votes, réponses…).
// Stockage : un fichier JSON par salle, verrouillé à chaque écriture.
// =========================================================

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');

const DUREE_VIE = 20 * 3600;          // une salle vit 20 h
const TAILLE_MAX_ETAT = 400000;       // garde-fous
const TAILLE_MAX_PHOTO = 40000;
const MESSAGES_MAX = 300;
const LETTRES = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sans I ni O (confusion avec 1 et 0)
// Les salles sont stockées dans des fichiers .php qui s'arrêtent net si on les ouvre depuis le web
const ENTETE = "<?php exit; ?>\n";

$dossier = __DIR__ . '/donnees/salles';
if (!is_dir($dossier)) @mkdir($dossier, 0755, true);
// On interdit l'accès direct aux fichiers des salles
$garde = __DIR__ . '/donnees/.htaccess';
if (!file_exists($garde)) @file_put_contents($garde, "Require all denied\nDeny from all\n");

function repondre($donnees, $code = 200) {
    http_response_code($code);
    echo json_encode($donnees, JSON_UNESCAPED_UNICODE);
    exit;
}
function erreur($message, $code = 400) { repondre(['erreur' => $message], $code); }
function maintenant() { return (int) round(microtime(true) * 1000); }
function jeton() { return bin2hex(random_bytes(12)); }
function texte($v, $max) {
    $v = trim(preg_replace('/\s+/u', ' ', (string) $v));
    return mb_substr($v, 0, $max);
}
function codeValide($c) { return preg_match('/^[A-Z]{4}$/', $c) === 1; }

$entree = json_decode(file_get_contents('php://input') ?: '{}', true);
if (!is_array($entree)) $entree = [];
$action = $entree['action'] ?? ($_GET['action'] ?? '');

// Nettoyage des vieilles salles (de temps en temps)
function nettoyer($dossier) {
    foreach (glob($dossier . '/*.php') ?: [] as $f) {
        if (filemtime($f) < time() - DUREE_VIE) @unlink($f);
    }
}

// Ouvre une salle avec verrou ; $modifier reçoit la salle (tableau) par référence
function avecSalle($dossier, $code, $ecriture, $modifier) {
    if (!codeValide($code)) erreur('Code invalide');
    $chemin = $dossier . '/' . $code . '.php';
    if (!file_exists($chemin)) erreur('introuvable', 404);
    $f = fopen($chemin, 'c+');
    if (!$f) erreur('Salle illisible', 500);
    flock($f, $ecriture ? LOCK_EX : LOCK_SH);
    $contenu = stream_get_contents($f);
    $salle = json_decode(substr($contenu ?: '', strlen(ENTETE)) ?: 'null', true);
    if (!is_array($salle)) { flock($f, LOCK_UN); fclose($f); erreur('introuvable', 404); }
    $resultat = $modifier($salle);
    if ($ecriture) {
        $json = ENTETE . json_encode($salle, JSON_UNESCAPED_UNICODE);
        ftruncate($f, 0);
        rewind($f);
        fwrite($f, $json);
        fflush($f);
    }
    flock($f, LOCK_UN);
    fclose($f);
    return $resultat;
}

function joueursPublics($salle) {
    $t = maintenant();
    $l = [];
    foreach ($salle['joueurs'] as $id => $j) {
        $l[] = ['id' => $id, 'nom' => $j['nom'], 'photo' => $j['photo'] ?? null, 'enLigne' => ($t - ($j['vu'] ?? 0)) < 12000];
    }
    return $l;
}
function estHote($salle, $entree) {
    return isset($entree['cleHote']) && hash_equals($salle['cleHote'], (string) $entree['cleHote']);
}
function joueurAuth(&$salle, $entree) {
    $id = (string) ($entree['id'] ?? '');
    if (!isset($salle['joueurs'][$id])) erreur('inconnu', 403);
    if (!hash_equals($salle['joueurs'][$id]['cle'], (string) ($entree['cle'] ?? ''))) erreur('inconnu', 403);
    return $id;
}

switch ($action) {

    // ---------- L'hôte crée une salle ----------
    case 'creer':
        if (mt_rand(1, 10) === 1) nettoyer($dossier);
        for ($essai = 0; $essai < 40; $essai++) {
            $code = '';
            for ($i = 0; $i < 4; $i++) $code .= LETTRES[random_int(0, strlen(LETTRES) - 1)];
            $chemin = $dossier . '/' . $code . '.php';
            if (!file_exists($chemin)) break;
        }
        $salle = [
            'code' => $code,
            'cree' => maintenant(),
            'cleHote' => jeton(),
            'nomHote' => texte($entree['nomHote'] ?? '', 20),
            'v' => 1, 'vj' => 1, 'va' => 1,
            'joueurs' => new stdClass(),
            'public' => ['vue' => 'attente'],
            'prives' => new stdClass(),
            'annuaire' => new stdClass(),
            'partage' => new stdClass(),
            'boite' => [],
            'seq' => 0
        ];
        if (@file_put_contents($chemin, ENTETE . json_encode($salle, JSON_UNESCAPED_UNICODE), LOCK_EX) === false) erreur('Impossible de créer la salle', 500);
        repondre(['code' => $code, 'cleHote' => $salle['cleHote'], 't' => maintenant()]);

    // ---------- Un joueur rejoint ----------
    case 'rejoindre':
        $code = strtoupper(texte($entree['code'] ?? '', 4));
        $nom = texte($entree['nom'] ?? '', 15);
        if ($nom === '') erreur('Entre ton prénom');
        $photo = $entree['photo'] ?? null;
        if ($photo !== null && (!is_string($photo) || strlen($photo) > TAILLE_MAX_PHOTO || strpos($photo, 'data:image/') !== 0)) $photo = null;
        $r = avecSalle($dossier, $code, true, function (&$salle) use ($entree, $nom, $photo) {
            // Reconnexion avec ses identifiants
            $id = (string) ($entree['id'] ?? '');
            if ($id && isset($salle['joueurs'][$id]) && hash_equals($salle['joueurs'][$id]['cle'], (string) ($entree['cle'] ?? ''))) {
                $salle['joueurs'][$id]['nom'] = $nom;
                if ($photo) $salle['joueurs'][$id]['photo'] = $photo;
                $salle['joueurs'][$id]['vu'] = maintenant();
                $salle['v']++; $salle['vj']++;
                return ['id' => $id, 'cle' => $salle['joueurs'][$id]['cle']];
            }
            foreach ($salle['joueurs'] as $autre) {
                if (mb_strtolower($autre['nom']) === mb_strtolower($nom)) erreur('Ce prénom est déjà pris dans la partie, ajoute une initiale.');
            }
            if (count((array) $salle['joueurs']) >= 20) erreur('La partie est complète.');
            $id = substr(jeton(), 0, 8);
            $cle = jeton();
            if (is_object($salle['joueurs'])) $salle['joueurs'] = [];
            $salle['joueurs'][$id] = ['nom' => $nom, 'photo' => $photo, 'cle' => $cle, 'vu' => maintenant(), 'arrive' => maintenant()];
            $salle['v']++; $salle['vj']++;
            return ['id' => $id, 'cle' => $cle];
        });
        $r['code'] = $code;
        repondre($r);

    // ---------- Lire l'état (joueur ou hôte) ----------
    case 'etat':
        $code = strtoupper(texte($entree['code'] ?? '', 4));
        $hote = false;
        $r = avecSalle($dossier, $code, true, function (&$salle) use ($entree, &$hote) {
            $t = maintenant();
            $hote = estHote($salle, $entree);
            $rep = ['v' => $salle['v'], 't' => $t, 'nomHote' => $salle['nomHote']];
            if ($hote) {
                $salle['vuHote'] = $t;
                // L'hôte récupère les joueurs (si changés), le partage et les messages reçus
                if ((int) ($entree['vj'] ?? 0) !== $salle['vj'] || ($t - ($salle['dernierEnLigne'] ?? 0)) > 4000) {
                    $rep['joueurs'] = joueursPublics($salle);
                    $rep['vj'] = $salle['vj'];
                    $salle['dernierEnLigne'] = $t;
                }
                $depuis = (int) ($entree['depuis'] ?? 0);
                $rep['messages'] = array_values(array_filter($salle['boite'], function ($m) use ($depuis) { return $m['n'] > $depuis; }));
                $rep['seq'] = $salle['seq'];
                $rep['partage'] = $salle['partage'];
                return $rep;
            }
            $id = joueurAuth($salle, $entree);
            $salle['joueurs'][$id]['vu'] = $t;
            $rep['hoteEnLigne'] = ($t - ($salle['vuHote'] ?? 0)) < 15000;
            if ((int) ($entree['v'] ?? 0) === $salle['v']) { $rep['inchange'] = true; return $rep; }
            $rep['public'] = $salle['public'];
            $nom = mb_strtolower($salle['joueurs'][$id]['nom']);
            $prives = (array) $salle['prives'];
            $rep['prive'] = $prives[$nom] ?? null;
            // Textes partagés : seulement ceux que l'hôte autorise pour ce joueur (ex. les phrases de SON équipe)
            $autorises = (is_array($rep['prive']) && isset($rep['prive']['partage']) && is_array($rep['prive']['partage'])) ? $rep['prive']['partage'] : [];
            $filtre = [];
            foreach ((array) $salle['partage'] as $cle => $val) {
                foreach ($autorises as $prefixe) {
                    if (is_string($prefixe) && $prefixe !== '' && strpos($cle, $prefixe . '-') === 0) { $filtre[$cle] = $val; break; }
                }
            }
            $rep['partage'] = $filtre ?: new stdClass();
            $rep['moi'] = $salle['joueurs'][$id]['nom'];
            if ((int) ($entree['va'] ?? 0) !== $salle['va']) { $rep['annuaire'] = $salle['annuaire']; $rep['va'] = $salle['va']; }
            return $rep;
        });
        repondre($r);

    // ---------- L'hôte publie l'état ----------
    case 'publier':
        $code = strtoupper(texte($entree['code'] ?? '', 4));
        $brut = file_get_contents('php://input');
        if (strlen($brut) > TAILLE_MAX_ETAT) erreur('État trop gros');
        $r = avecSalle($dossier, $code, true, function (&$salle) use ($entree) {
            if (!estHote($salle, $entree)) erreur('Réservé à l\'hôte', 403);
            if (isset($entree['public'])) $salle['public'] = $entree['public'];
            if (isset($entree['prives'])) {
                $p = [];
                foreach ((array) $entree['prives'] as $nom => $val) $p[mb_strtolower((string) $nom)] = $val;
                $salle['prives'] = $p ?: new stdClass();
            }
            if (isset($entree['annuaire'])) { $salle['annuaire'] = $entree['annuaire']; $salle['va']++; }
            if (!empty($entree['viderPartage'])) $salle['partage'] = new stdClass();
            if (isset($entree['retirer'])) {
                foreach ((array) $entree['retirer'] as $id) { if (isset($salle['joueurs'][$id])) unset($salle['joueurs'][$id]); }
                $salle['vj']++;
            }
            $salle['v']++;
            return ['v' => $salle['v']];
        });
        repondre($r);

    // ---------- Un joueur envoie une action à l'hôte ----------
    case 'envoyer':
        $code = strtoupper(texte($entree['code'] ?? '', 4));
        $r = avecSalle($dossier, $code, true, function (&$salle) use ($entree) {
            $id = joueurAuth($salle, $entree);
            $type = texte($entree['type'] ?? '', 30);
            if ($type === '') erreur('Type manquant');
            $donnees = $entree['donnees'] ?? null;
            if (strlen(json_encode($donnees)) > 4000) erreur('Message trop long');
            $salle['seq']++;
            $salle['boite'][] = ['n' => $salle['seq'], 'de' => $salle['joueurs'][$id]['nom'], 'type' => $type, 'donnees' => $donnees, 't' => maintenant()];
            if (count($salle['boite']) > MESSAGES_MAX) $salle['boite'] = array_slice($salle['boite'], -MESSAGES_MAX);
            $salle['joueurs'][$id]['vu'] = maintenant();
            return ['ok' => true, 'n' => $salle['seq']];
        });
        repondre($r);

    // ---------- Texte partagé (ex. phrases de Créa'Mime écrites à plusieurs) ----------
    case 'partager':
        $code = strtoupper(texte($entree['code'] ?? '', 4));
        $r = avecSalle($dossier, $code, true, function (&$salle) use ($entree) {
            $par = estHote($salle, $entree) ? 'hôte' : $salle['joueurs'][joueurAuth($salle, $entree)]['nom'];
            $cle = texte($entree['champ'] ?? '', 40);
            if (!preg_match('/^[a-z0-9-]+$/', $cle)) erreur('Champ invalide');
            if (is_object($salle['partage'])) $salle['partage'] = [];
            if (count($salle['partage']) > 60 && !isset($salle['partage'][$cle])) erreur('Trop de textes');
            $salle['partage'][$cle] = ['valeur' => mb_substr((string) ($entree['valeur'] ?? ''), 0, 200), 'par' => $par, 't' => maintenant()];
            $salle['v']++;
            return ['v' => $salle['v']];
        });
        repondre($r);

    default:
        erreur('Action inconnue');
}

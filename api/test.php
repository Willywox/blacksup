<?php
// Test technique : PHP fonctionne-t-il et peut-il écrire un fichier ? (à supprimer ensuite)
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$dossier = __DIR__ . '/donnees';
if (!is_dir($dossier)) @mkdir($dossier, 0755, true);
$ok = @file_put_contents($dossier . '/test.txt', 'ok ' . time()) !== false;
echo json_encode([
    'php' => PHP_VERSION,
    'ecriture' => $ok,
    'json' => function_exists('json_encode'),
    'flock' => function_exists('flock'),
    'heure' => date('c')
]);

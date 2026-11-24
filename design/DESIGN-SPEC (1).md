# DESIGN-SPEC — Reproduire la maquette à l'identique

## Règle d'or
Le dossier `maquette/` contient les écrans en HTML/CSS réel. **Ces fichiers sont la source de vérité visuelle** : ouvre-les dans un navigateur, copie-en les valeurs exactes (couleurs, tailles, rayons, espacements, textes). Ne « réinterprète » rien, n'embellis rien, n'ajoute aucun élément absent de la maquette. Si une valeur manque, choisis la plus proche de la maquette et signale-le.
Lien de la maquette en ligne : https://claude.ai/artifact/B6vE6A1gF28bVFzfvgMzvC

| Fichier | Écran | Statut |
|---|---|---|
| `choix-service-etape1.html` | Nouveau ticket · Étape 1 : choix du service (cartes) | **À construire maintenant** |
| `ticket-etape2.html` | Nouveau ticket · Étape 2 : patient et paiement | **À construire maintenant** |
| `reglages-entete.html` | Réglages · En-tête | **À construire maintenant** |
| `reglages-tarifs.html` | Réglages · Tarifs et impression | **À construire maintenant** |
| `ticket-a6-apercu.html` | Aperçu avant impression · Ticket papier normal A6 | **À construire maintenant** |
| `ordonnancier-module-2.html` | Ordonnancier | Plus tard, ne pas coder |

## Format de référence
Écrans de bureau **1280 × 800 px**. Barre latérale fixe 104 px, contenu fluide à droite. En dessous de 1280 px, garder le même style et laisser les colonnes s'empiler proprement ; ne jamais changer couleurs, polices ni rayons.

## Jetons de design (valeurs exactes)
**Couleurs**
- Texte principal `#0B1F2A` · texte secondaire `#4B5F6B`
- Accent `#0B7A6B` · accent texte sombre `#0B5F54` · accent doux `#DFF3EF` · accent très doux `#EEF8F6`
- Fond de page `#EEF3F6` · cartes `#FFFFFF` · bordure carte `#E2EAEF` · bordure champ `#D5E0E6` · gris puce `#F2F5F7`
- Barre latérale `#0B1F2A` · item actif `#163545` · texte inactif `#B9CBD3`
- Alerte (si besoin) fond `#FFF4DA`, texte `#6B4A00` · papier ticket `#FAFAF7` · pointillés `#B9C7CF`

**Typographie** : Plus Jakarta Sans (400 à 800), repli Inter, sans-serif. Titre d'écran 32 px / 800 / interlettrage −0,5 px. Libellé de champ 13 px / 600. Champ 16 px / 600 (18 à 20 px dans l'écran ticket). Gros montant 40 px / 800. Ticket imprimé : police monospace système.

**Rayons** : carte 24 · champ 14 · puce/option 16 · bouton principal 18 · pastille 999 · logo 16 · item de menu 18.
**Espacements** : contenu principal `padding 36px 40px`, écart vertical 26, colonnes écart 28, carte `padding 28` (24 pour l'ordonnancier), champs écart 22 à 24. Colonne de droite : 380 px (ticket, tarifs 400), 470 px (en-tête).
**Hauteurs** : champ 52 (60 dans l'écran ticket), bouton principal 60 (52 pour « Ajouter »), élément de menu avec icône 24 px.
**Icônes** : traits fins 2 px, extrémités arrondies, style Lucide ; aucune emoji.

## Composants (classes de la maquette)
`.card` carte blanche · `.lbl` libellé · `.in` champ · `.chip` / `.chip.on` option sélectionnable (bordure et fond accent quand `on`) · `.nv` / `.nv.on` item de menu latéral · `.go` bouton principal vert plein · `.row` ligne clé/valeur · `.ln` ligne de liste · `.cd` pastille · `.x` bouton secondaire gris.
Les construire comme composants réutilisables (React + Tailwind avec ces valeurs en variables), sans changer leur rendu.

## Contenu et comportements à respecter
- **Bouton « + » de la barre latérale** : c'est le bouton principal. Il s'appelle **« Nouveau ticket »** pour le caissier (plus tard « Nouvelle ordonnance » pour le médecin, selon le rôle). Un clic ouvre toujours l'étape 1.
- **Étape 1 · Choix du service** : tous les services actifs s'affichent en **grandes cartes** avec leur prix (nom 22 px / 800, prix 34 px / 800), plus une carte « Autre service » en pointillés (prix à saisir). **Aucun service n'est présélectionné.** Le bouton « Continuer » reste grisé et inactif tant qu'aucune carte n'est choisie. La carte choisie passe en vert (bordure `#0B7A6B`, fond `#DFF3EF`, pastille ✓) et la barre du bas affiche « Service choisi · prix ».
- **Étape 2 · Patient et paiement** : le service choisi est affiché en **récapitulatif verrouillé** (nom et prix, pas de liste déroulante) avec un bouton « Changer » qui renvoie à l'étape 1. Le montant total vient du service et ne se saisit pas à la main.
- **Ticket (étape 2)** : champs dans cet ordre : Nom et prénom, Service choisi (récapitulatif verrouillé), Montant total, Avance, Reste (lecture seule, fond `#DFF3EF`), date prise automatiquement. À droite : aperçu du ticket thermique 80 mm et bouton « Imprimer le ticket ». Numéro affiché `Reçu 2026-042` (année + numéro à 3 chiffres, repart à 001 chaque année).
- **Réglages · En-tête** : nom, adresse, téléphone, autres contacts, numérotation automatique, aperçu de l'en-tête.
- **Réglages · Tarifs** : liste des services avec prix, bouton « + Ajouter un service », formulaire d'ajout (nom, prix, Enregistrer), choix du format d'impression : Thermique 80 mm (défaut), Thermique 58 mm ou Papier normal A6 (cartes d'options empilées), rappel de la numérotation. Le ticket imprimé s'adapte au format choisi (voir CAHIER-DES-CHARGES section 8).
- **Ticket A6** : le ticket imprimé en A6 (maquette `ticket-a6-apercu.html`) est en noir sur blanc, avec en-tête centré, numéro de reçu en gros, lignes clé/valeur, **reste à payer encadré en gras**, zone « Cachet ». Choix « Feuille A6 » ou « Feuille A4 à découper » (ticket en haut à gauche, taille réelle), bouton « Imprimer le ticket » et bouton « Test ».
- Textes en français, tels qu'écrits dans la maquette. Les noms, prix et numéros de la maquette sont des **exemples** : ils viennent de la base de données.

## Contrôle de fidélité (obligatoire)
1. Ouvre chaque fichier de `maquette/` et chaque écran construit à **1280 × 800** avec Playwright, prends une capture de chacun.
2. Compare les captures (diff visuel, ex. `pixelmatch`) ; l'écart doit être minimal, et toute différence visible doit être corrigée ou expliquée.
3. Vérifie les contrastes (texte ≥ 4,5:1) et la navigation au clavier sans changer l'apparence.
Une reproduction à 100 % des pixels n'est pas garantie d'avance, mais ce contrôle permet de s'en approcher au plus près.

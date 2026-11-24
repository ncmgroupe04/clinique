# Cahier des charges — Module Ticket (V1, multi-tenant)

## 1. Objectif
Remplacer les tickets de caisse papier achetés avant la consultation par un écran de saisie qui imprime un ticket thermique. Plusieurs structures de santé utilisent la même plateforme en ligne, chacune avec ses données séparées.

## 2. Périmètre
**Inclus (V1)** : comptes par structure, réglages (en-tête), tarifs, création et impression de tickets, historique, total du jour, annulation.
**Exclus (plus tard)** : module Ordonnancier (recherche de médicaments, posologies, favoris, protocoles, dictée vocale), file d'attente vers les médecins, mode hors ligne.

## 3. Rôles
- **Administrateur plateforme** (le propriétaire du produit) : voit la liste des structures, peut en désactiver une.
- **Administrateur de structure** : gère l'en-tête, les tarifs, les utilisateurs.
- **Caissier / secrétaire** : crée et imprime les tickets, consulte l'historique du jour.

## 4. Inscription d'une structure
Une clinique crée son compte (e-mail + mot de passe), renseigne le nom de la structure, devient administrateur, puis invite ses caissiers (e-mail ou création directe par l'administrateur).

## 5. Réglages de la structure (premier écran à configurer)
- Nom de la structure (ex. « Clinique Cheikh Ahmadou Bamba »)
- Adresse, téléphone, autres informations de contact
- **Format d'impression du ticket** (trois choix) : Thermique 80 mm (défaut), Thermique 58 mm, ou Papier normal A6 (105 × 148 mm) pour les structures sans imprimante thermique. Le même ticket s'adapte automatiquement au format choisi.
- Numérotation : chaque reçu porte l'année et un numéro d'ordre qui **repart à 001 au 1er janvier**. Format : `Reçu 2026-001`, `Reçu 2026-002`… puis `Reçu 2027-001`. Chaque structure a sa propre suite. Le numéro est stocké en deux champs (année, numéro) pour permettre recherches et filtres.
Cet en-tête s'imprime sur chaque ticket (et, plus tard, sur chaque ordonnance : informations de la structure à gauche, numéro et date à droite).

## 6. Tarifs
Écran **Réglages › Tarifs**, entièrement personnalisable par chaque structure : un bouton **« Ajouter un service »** (nom + prix en F CFA), modification du nom ou du prix, désactivation (pas de suppression si le service a déjà servi). Aucune liste de services n'est imposée : une nouvelle structure démarre avec une liste vide (ou 2 exemples modifiables : Consultation, Visite prénatale) et saisit ses propres services et prix.

## 7. Création d'un ticket
Le bouton **« + » de la barre latérale** est le bouton « Nouveau ticket » du caissier (« Nouvelle ordonnance » pour un médecin, quand le module 2 existera). Le parcours se fait en deux étapes, pour éviter toute erreur de service :

**Étape 1 · Choix du service** : écran de grandes cartes (nom + prix) pour tous les services actifs, plus « Autre service ». Aucun service présélectionné ; « Continuer » est désactivé tant qu'aucun service n'est choisi.

**Étape 2 · Patient et paiement**, champs dans cet ordre :
1. **Nom et prénom** : un seul champ texte, obligatoire.
2. **Service** : récapitulatif du service choisi à l'étape 1 (nom + prix), non modifiable ici ; un bouton « Changer » ramène à l'étape 1. Le choix remplit automatiquement le **montant total**. « Autre service » : saisie manuelle du libellé et du prix à l'étape 1.
3. **Montant total** : rempli par le tarif, modifiable seulement par l'administrateur (ou selon un réglage).
4. **Avance** : saisie, entre 0 et le total.
5. **Reste** : calculé automatiquement, non modifiable.
6. **Date et heure** : prises automatiquement (date du jour de l'ordinateur), non modifiables.
7. **Numéro de reçu** : automatique (`Reçu 2026-001`).
Bouton **Imprimer le ticket** : enregistre puis imprime. Un ticket imprimé n'est plus modifiable (annulation uniquement).

## 8. Ticket imprimé (thermique)
Contenu : nom de la structure, adresse et téléphone (en-tête), numéro de reçu, nom et prénom, service, total, avance, **reste en évidence**, date et heure, message de remerciement. Mise en page adaptée au papier thermique, impression via le navigateur (CSS `@page`).

**Dimensions (valeurs par défaut)**
| Papier | Zone imprimable | Usage |
|---|---|---|
| **80 mm (par défaut)** | **72 mm** de large | caisse de clinique, plus lisible |
| 58 mm (option) | 48 mm de large | petites imprimantes, pharmacies |
- Hauteur : continue (`size: 80mm auto`), le ticket s'arrête au contenu, sans page blanche.
- Marges : 0 sur la page, 2 à 3 mm de marge interne, pas de couleurs ni de fonds (noir sur blanc).
- Police : sans empattement (ex. Arial/Helvetica), 12 à 13 px pour le texte, 18 à 22 px pour le numéro de reçu, 16 px en gras pour le reste à payer.
- Longueur type : environ 90 à 110 mm. Prévoir un retour à la ligne automatique du nom et de l'adresse.
- Le réglage « Format d'impression du ticket » change la mise en page.

**Format A6 (imprimante normale)**
- Page `@page { size: 105mm 148mm; margin: 0 }`, marge interne 8 mm, zone utile environ 89 × 132 mm.
- Même contenu que le ticket thermique, mis en page plus aéré : nom de la structure 14 pt en gras, numéro de reçu 20 pt, texte 11 à 12 pt, **reste à payer en gras 16 pt**, filet fin entre les blocs, noir sur blanc (lisible en niveaux de gris).
- Feuille A6 si l'imprimante l'accepte (bac manuel). Sinon, proposer l'option « Imprimer sur feuille A4 » : le ticket A6 est placé en haut à gauche de la page A4, à découper (aucun redimensionnement : même taille réelle).
- Prévoir un bouton « Aperçu avant impression » et un test d'impression dans les réglages. Prévoir ensuite l'impression silencieuse (mode kiosque ou ESC/POS) si le client le demande.

## 9. Historique et caisse
- Liste des tickets du jour avec recherche par nom ou numéro de reçu, et filtres par année, par date, par service et par statut (valide / annulé).
- Total du jour : nombre de tickets, total encaissé (avances), total des restes.
- **Annulation** d'un ticket avec motif obligatoire ; il reste visible, marqué « annulé », et n'est plus compté.
- Réimpression possible, marquée « DUPLICATA ».

## 10. Sécurité et données
Isolation stricte entre structures (RLS), mots de passe gérés par Supabase Auth, serveur en Europe, sauvegardes quotidiennes, journal des annulations. Se conformer à la loi sénégalaise sur la protection des données personnelles (CDP) : informations minimales, accès par rôle.

## 11. Critères d'acceptation
- Deux structures de test ne voient jamais les données l'une de l'autre.
- Créer un ticket de la saisie à l'impression prend moins de 15 secondes.
- Changer un tarif ne modifie pas les anciens tickets.
- Les numéros de reçu sont uniques et sans trou par structure et par année, et repartent à 001 chaque 1er janvier.
- L'impression est correcte en thermique 58 mm, thermique 80 mm et A6 sur des imprimantes réelles, et le ticket A6 tient sur une seule page.

## 12. Questions ouvertes
- Modèle économique : abonnement mensuel par structure (à définir plus tard).

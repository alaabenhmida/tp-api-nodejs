# TP : Tester une API Node.js – Du Test Manuel à la CI/CD

## Contexte

Ce TP est la **suite directe** du TP Git & GitHub. Vous allez apprendre à tester votre projet **tp-api-nodejs** de manière progressive : d'abord à la main pour comprendre le concept, puis avec des outils professionnels, et enfin en automatisant tout dans GitHub Actions.

> ⚠️ **Prérequis :** Avoir terminé le TP Git & GitHub. Votre dépôt `tp-api-nodejs` doit être sur GitHub.

## Durée : 3 heures

---

# 🖐️ PARTIE 0 : Tester sans librairie

## Qu'est-ce qu'un test ?

Un test, c'est simplement vérifier qu'une fonction retourne bien ce qu'on attend d'elle. Par exemple : "si je passe `2` et `3` à une fonction `additionner`, je dois obtenir `5`."

L'idée de cette partie est de construire ce mécanisme nous-mêmes, sans aucun outil, pour comprendre ce qu'on fait réellement quand on teste du code — et surtout pour ressentir pourquoi on a besoin d'un outil dédié ensuite.

## Étape 0.1 : Une fonction à tester

Créez le fichier `utils/calculNote.js` :

```javascript
// utils/calculNote.js

function additionner(a, b) {
  return a + b;
}

/**
 * Vérifie qu'une valeur est une moyenne valide (nombre entre 0 et 20).
 * @returns {boolean}
 */
function isValidMoyenne(valeur) {
  if (typeof valeur !== 'number' || isNaN(valeur)) return false;
  return valeur >= 0 && valeur <= 20;
}

function calculMention(moyenne) {
  if (moyenne >= 16) return 'Très Bien';
  if (moyenne >= 14) return 'Bien';
  if (moyenne >= 12) return 'Assez Bien';
  if (moyenne >= 10) return 'Passable';
  return 'Insuffisant';
}

module.exports = { additionner, isValidMoyenne, calculMention };
```

## Étape 0.2 : Tester à la main

On va écrire notre propre système de vérification. Le principe est simple : appeler la fonction, comparer le résultat avec ce qu'on attend, afficher ✅ ou ❌.

Créez `utils/testManuel.js` :

```javascript
// utils/testManuel.js
const { additionner, isValidMoyenne, calculMention } = require('./calculNote');

let ok = 0, total = 0;

function check(description, obtenu, attendu) {
  total++;
  if (obtenu === attendu) {
    ok++;
    console.log(`  ✅ ${description}`);
  } else {
    console.log(`  ❌ ${description}`);
    console.log(`     Attendu : ${attendu}`);
    console.log(`     Obtenu  : ${obtenu}`);
  }
}

console.log('\n--- additionner() ---');
check('2 + 3 = 5',         additionner(2, 3),     5);
check('0 + 0 = 0',         additionner(0, 0),     0);
check('-1 + 1 = 0',        additionner(-1, 1),    0);
check('0.1 + 0.2 = 0.3',  additionner(0.1, 0.2), 0.3); // 👀

console.log('\n--- isValidMoyenne() ---');
check('10 est valide',         isValidMoyenne(10),       true);
check('0 est valide',          isValidMoyenne(0),        true);
check('20 est valide',         isValidMoyenne(20),       true);
check('-1 est invalide',       isValidMoyenne(-1),       false);
check('21 est invalide',       isValidMoyenne(21),       false);
check('"abc" est invalide',    isValidMoyenne('abc'),    false);

console.log('\n--- calculMention() ---');
check('18 → Très Bien',   calculMention(18), 'Très Bien');
check('14 → Bien',        calculMention(14), 'Bien');
check('10 → Passable',    calculMention(10), 'Passable');
check('5  → Insuffisant', calculMention(5),  'Insuffisant');

console.log(`\n${ok}/${total} tests réussis\n`);
```

Lancez-le :

```bash
node utils/testManuel.js
```

Vous devriez voir qu'un test échoue sur `0.1 + 0.2`.

> 💡 Ce n'est pas un bug dans votre code. C'est une limite inhérente à la façon dont tous les langages de programmation stockent les nombres décimaux en mémoire (norme **IEEE 754**). `0.1 + 0.2` donne en réalité `0.30000000000000004`. On verra comment Jest gère ça proprement.

**❓ Questions :**
1. En dehors du test des flottants, qu'avez-vous dû écrire vous-même que vous ne devriez pas avoir à écrire dans un vrai projet ?
2. Si demain vous avez 30 fichiers et 200 fonctions à tester, quels problèmes pratiques anticipez-vous avec cette approche ?

---

# 😓 PARTIE 1 : Pourquoi c'est insuffisant

Voici un bug plus sournois. Introduisez-le dans `controllers/etudiantController.js` :

```javascript
// Changez la ligne de création :
const etudiant = await Etudiant.create(req.body);
// En :
const etudiant = await Etudiant.create({ ...req.body, moyenne: req.body.moyenne * 2 }); // bug
```

Démarrez votre API et créez un étudiant avec `moyenne: 10` via curl ou Postman.

L'API répond `201 Created`... mais la valeur sauvegardée est `20`.

**❓ Question :** Combien de temps vous a-t-il fallu pour remarquer le problème ? Auriez-vous pu le rater entièrement ?

**Annulez le bug :**

```bash
git checkout -- controllers/etudiantController.js
```

> 💡 Ce type de bug est particulièrement dangereux : l'API répond normalement, pas d'erreur dans la console, mais les données sont silencieusement corrompues en base. Un test automatique qui vérifie la valeur exacte retournée par le serveur l'aurait détecté en une fraction de seconde, à chaque fois qu'on modifie le code.

---

# 🧪 PARTIE 2 : Tests Unitaires avec Jest

## Qu'est-ce que Jest ?

**Jest** est un framework de test JavaScript développé et maintenu par Meta (Facebook). C'est aujourd'hui l'outil de référence dans l'écosystème Node.js et React.

Il regroupe en un seul package tout ce dont vous avez besoin pour tester :
- Un **runner** : il découvre automatiquement tous vos fichiers `*.test.js` et les exécute
- Un système d'**assertions** : des fonctions comme `expect(...).toBe(...)` qui remplacent votre `check()` maison
- Un **rapport coloré** avec le détail des erreurs, la ligne exacte qui a échoué, la valeur attendue et la valeur reçue
- Un **mode watch** qui relance les tests automatiquement à chaque sauvegarde
- Un outil de **couverture de code** (code coverage) qui mesure quelles lignes de votre code sont réellement testées

## Étape 2.1 : Installation et branche

```bash
git checkout -b feature/tests-unitaires
npm install --save-dev jest
```

> 💡 `--save-dev` indique que Jest est une dépendance de **développement** uniquement. Il ne sera pas embarqué si vous déployez votre application en production. Vous le verrez apparaître dans la section `devDependencies` de `package.json`.

Ajoutez les scripts dans `package.json` :

```json
"scripts": {
  "start": "node server.js",
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}
```

Vérifiez l'installation :

```bash
npx jest --version
```

## Étape 2.2 : Structure d'un test Jest

Avant d'écrire, voici la syntaxe de base :

```javascript
// Un fichier de test se nomme toujours xxx.test.js
// Jest le découvre automatiquement dans tous les sous-dossiers

describe('Nom du groupe', () => {
  // describe() regroupe des tests liés, comme un titre de chapitre

  test('description précise de ce qu\'on vérifie', () => {
    // Arrange  → préparer les données
    // Act      → appeler la fonction
    // Assert   → vérifier le résultat avec expect()

    expect(2 + 2).toBe(4);
    //     ↑ valeur obtenue   ↑ matcher
  });

});
```

> 💡 Le pattern **AAA (Arrange / Act / Assert)** est la convention universelle pour structurer un test. Il force à séparer clairement la préparation, l'exécution et la vérification, ce qui rend les tests lisibles même par quelqu'un qui ne connaît pas le code.

## Étape 2.3 : Premier fichier de test

Créez le dossier `__tests__/` et le fichier `__tests__/calculNote.test.js` :

```javascript
const { additionner, isValidMoyenne, calculMention } = require('../utils/calculNote');

describe('additionner()', () => {

  test('2 + 3 = 5', () => {
    expect(additionner(2, 3)).toBe(5);
  });

  test('nombres négatifs', () => {
    expect(additionner(-1, 1)).toBe(0);
  });

  test('0.1 + 0.2 ≈ 0.3', () => {
    // toBe(0.3) échouerait à cause de IEEE 754
    // toBeCloseTo compare avec une précision de 2 décimales par défaut
    expect(additionner(0.1, 0.2)).toBeCloseTo(0.3);
  });

});

describe('isValidMoyenne()', () => {

  test('retourne true pour 10', () => {
    expect(isValidMoyenne(10)).toBe(true);
  });

  test('retourne true pour les valeurs limites 0 et 20', () => {
    expect(isValidMoyenne(0)).toBe(true);
    expect(isValidMoyenne(20)).toBe(true);
  });

  test('retourne false pour une valeur négative', () => {
    expect(isValidMoyenne(-1)).toBe(false);
  });

  test('retourne false pour une valeur supérieure à 20', () => {
    expect(isValidMoyenne(21)).toBe(false);
  });

  test('retourne false pour une chaîne de caractères', () => {
    expect(isValidMoyenne('abc')).toBe(false);
  });

  test('retourne false pour null et undefined', () => {
    expect(isValidMoyenne(null)).toBe(false);
    expect(isValidMoyenne(undefined)).toBe(false);
  });

});

describe('calculMention()', () => {

  test('18 → "Très Bien"', () => {
    expect(calculMention(18)).toBe('Très Bien');
  });

  test('14 → "Bien"', () => {
    expect(calculMention(14)).toBe('Bien');
  });

  test('10 → "Passable"', () => {
    expect(calculMention(10)).toBe('Passable');
  });

  test('5 → "Insuffisant"', () => {
    expect(calculMention(5)).toBe('Insuffisant');
  });

  test('valeur limite basse : 0 → "Insuffisant"', () => {
    expect(calculMention(0)).toBe('Insuffisant');
  });

  test('valeur limite haute : 20 → "Très Bien"', () => {
    expect(calculMention(20)).toBe('Très Bien');
  });

});
```

Lancez les tests :

```bash
npm test
```

> 💡 Comparez ce que Jest affiche avec ce que produisait votre `testManuel.js`. Jest donne : la liste complète des tests avec leur statut, le temps d'exécution, et en cas d'erreur, le fichier, la ligne exacte, la valeur attendue et la valeur reçue côte à côte. Tout ça sans que vous ayez écrit une seule ligne de code d'infrastructure.

**❓ Question :** Modifiez un seuil dans `calculMention()` (ex: `>= 14` → `>= 15`) et relancez `npm test`. Lisez attentivement le message d'erreur de Jest. Que vous indique-t-il de plus par rapport à votre `check()` maison ?

Remettez le code d'origine avant de continuer.

## Étape 2.4 : Cycle TDD — ajouter de la validation

Le **TDD (Test-Driven Development)** consiste à écrire le test *avant* le code qu'il vérifie. On suit le cycle : 🔴 **Red** (le test échoue car la fonctionnalité n'existe pas) → 🟢 **Green** (on écrit le minimum de code pour faire passer le test) → 🔵 **Refactor** (on améliore le code sans casser les tests).

Ajoutez ces tests dans `calculNote.test.js` :

```javascript
describe('calculMention() — validation', () => {

  test('lève une erreur si la moyenne est négative', () => {
    expect(() => calculMention(-1)).toThrow('La moyenne doit être comprise entre 0 et 20');
  });

  test('lève une erreur si la moyenne dépasse 20', () => {
    expect(() => calculMention(21)).toThrow('La moyenne doit être comprise entre 0 et 20');
  });

  test('lève une erreur si ce n\'est pas un nombre', () => {
    expect(() => calculMention('quinze')).toThrow('La moyenne doit être un nombre');
  });

});
```

> 💡 Notez la syntaxe `expect(() => calculMention(-1)).toThrow(...)`. On enveloppe l'appel dans une fonction fléchée car Jest doit intercepter l'exception lancée. Si on écrivait directement `expect(calculMention(-1))`, l'erreur planterait Jest avant qu'il puisse la capturer.

Lancez `npm test`. Les 3 nouveaux tests **échouent** — c'est la phase 🔴 Red. Maintenant mettez à jour `utils/calculNote.js` pour les faire passer :

```javascript
function calculMention(moyenne) {
  if (typeof moyenne !== 'number' || isNaN(moyenne)) {
    throw new Error('La moyenne doit être un nombre');
  }
  if (moyenne < 0 || moyenne > 20) {
    throw new Error('La moyenne doit être comprise entre 0 et 20');
  }
  if (moyenne >= 16) return 'Très Bien';
  if (moyenne >= 14) return 'Bien';
  if (moyenne >= 12) return 'Assez Bien';
  if (moyenne >= 10) return 'Passable';
  return 'Insuffisant';
}
```

Relancez `npm test`. Phase 🟢 Green — tout passe. Les anciens tests passent toujours aussi, ce qui confirme qu'on n'a rien cassé.

Maintenant mettez également à jour `calculMention()` dans `utils/calculNote.js` pour qu'elle **réutilise** `isValidMoyenne` au lieu de dupliquer la logique de validation :

```javascript
function isValidMoyenne(valeur) {
  if (typeof valeur !== 'number' || isNaN(valeur)) return false;
  return valeur >= 0 && valeur <= 20;
}

function calculMention(moyenne) {
  if (typeof moyenne !== 'number' || isNaN(moyenne)) {
    throw new Error('La moyenne doit être un nombre');
  }
  if (!isValidMoyenne(moyenne)) {
    throw new Error('La moyenne doit être comprise entre 0 et 20');
  }
  if (moyenne >= 16) return 'Très Bien';
  if (moyenne >= 14) return 'Bien';
  if (moyenne >= 12) return 'Assez Bien';
  if (moyenne >= 10) return 'Passable';
  return 'Insuffisant';
}
```

Relancez `npm test` — tous les tests doivent toujours passer. C'est la phase 🔵 **Refactor** : on a amélioré la structure interne du code sans changer son comportement externe, et les tests le prouvent.

## Étape 2.6 : Le mode watch

Jusqu'ici vous relancez `npm test` manuellement après chaque modification. Le **mode watch** automatise ça : Jest surveille vos fichiers en permanence et relance uniquement les tests concernés par chaque sauvegarde.

```bash
npm run test:watch
```

Jest entre dans un mode interactif :

```
Watch Usage
 › Press a to run all tests.
 › Press f to run only failed tests.
 › Press p to filter by a filename regex pattern.
 › Press t to filter by a test name regex pattern.
 › Press q to quit watch mode.
```

Essayez maintenant de modifier `isValidMoyenne` dans `calculNote.js` — par exemple changez `valeur <= 20` en `valeur <= 19` — et sauvegardez sans rien lancer. Jest relance automatiquement les tests affectés en moins d'une seconde.

> 💡 Le mode watch est l'outil du quotidien quand on développe. On le lance une fois au début de la session de travail et on oublie : chaque sauvegarde donne un feedback immédiat sur l'état des tests. C'est la boucle de feedback la plus courte possible entre "j'écris du code" et "je sais si ça marche".

Remettez `valeur <= 20`, vérifiez que tout repasse au vert, puis quittez le mode watch avec `q`.

## Étape 2.7 : Couverture de code

```bash
npm run test:coverage
```

Jest génère un tableau dans le terminal et un rapport HTML dans `coverage/lcov-report/index.html`. Ouvrez-le dans votre navigateur : vous pouvez voir ligne par ligne quelles parties de votre code sont couvertes (en vert) et lesquelles ne le sont pas (en rouge).

> 💡 La couverture de code mesure la proportion de votre code qui est réellement exécutée par vos tests. Une couverture de 100% ne garantit pas l'absence de bugs, mais une couverture faible signifie qu'une grande partie de votre code n'est jamais testée — et donc que des bugs peuvent s'y cacher indéfiniment.

## Étape 2.8 : Committer

```bash
git add .
git commit -m "feat: tests unitaires Jest pour calculNote"
git push origin feature/tests-unitaires
git checkout main
git merge feature/tests-unitaires
git push origin main
```

---

## Les matchers Jest à connaître

Un **matcher** est la fonction après `.toBe(...)`, `.toEqual(...)`, etc. Voici les plus courants :

```javascript
// Égalité stricte pour les valeurs primitives (nombres, strings, booléens)
expect(5).toBe(5);

// Égalité profonde pour les objets et tableaux
expect({ nom: 'Ali' }).toEqual({ nom: 'Ali' });

// Null, undefined, truthy, falsy
expect(null).toBeNull();
expect(undefined).toBeUndefined();
expect(1).toBeTruthy();
expect(0).toBeFalsy();

// Nombres
expect(10).toBeGreaterThan(5);
expect(0.1 + 0.2).toBeCloseTo(0.3); // décimaux

// Chaînes
expect('Bonjour monde').toContain('monde');

// Tableaux
expect([1, 2, 3]).toHaveLength(3);
expect([1, 2, 3]).toContain(2);

// Erreurs
expect(() => maFonction()).toThrow('message d\'erreur');

// Négation : .not inverse n'importe quel matcher
expect(5).not.toBe(6);
```

---

# 🔗 PARTIE 3 : Tests d'Intégration avec Supertest

## Qu'est-ce qu'un test d'intégration ?

Les tests unitaires de la partie précédente vérifient des fonctions **isolées**, sans base de données, sans serveur HTTP. Ils sont rapides et précis, mais ne garantissent pas que tous les composants fonctionnent bien **ensemble**.

Un test d'intégration vérifie une fonctionnalité de bout en bout : la requête HTTP arrive → Express route vers le bon contrôleur → le contrôleur interagit avec MongoDB → la réponse est correcte. Si n'importe lequel de ces maillons est cassé, le test le détecte.

```
Test UNITAIRE       calculMention(15)  →  "Bien"
                    ↑ une fonction, rien d'autre

Test INTÉGRATION    POST /api/etudiants  →  201 + objet en base
                    ↑ route + contrôleur + Mongoose + MongoDB
```

## Qu'est-ce que Supertest ?

**Supertest** est une librairie qui permet d'envoyer des requêtes HTTP à votre application Express **sans démarrer un vrai serveur**. Elle prend votre objet `app` Express, simule des requêtes GET, POST, PUT, DELETE, et vous donne accès au code HTTP et au corps de la réponse. C'est l'outil standard pour tester des APIs Node.js.

## Qu'est-ce que mongodb-memory-server ?

**mongodb-memory-server** démarre une vraie instance MongoDB **en mémoire**, sur votre machine, uniquement pour la durée de vos tests. Cela présente plusieurs avantages :
- Vos tests n'affectent **pas** votre vraie base de données
- Les tests sont **isolés** : chaque suite de tests part d'une base vide
- Pas besoin d'une connexion réseau ou d'un serveur MongoDB externe

## Étape 3.1 : Branche et installation

```bash
git checkout -b feature/tests-integration
npm install --save-dev supertest mongodb-memory-server
```

> ⏳ `mongodb-memory-server` télécharge un binaire MongoDB la première fois. Comptez 1 à 2 minutes selon votre connexion.

## Étape 3.2 : Séparer `app.js` de `server.js`

Pour que Supertest puisse importer votre application sans lancer de serveur, vous devez **séparer la définition de l'app et son démarrage**.

Actuellement, votre `server.js` fait probablement les deux à la fois. Voici la nouvelle organisation :

Créez `app.js` à la racine :

```javascript
// app.js — définit l'application, ne démarre rien
const express = require('express');
const etudiantRoutes = require('./routes/etudiantRoutes');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'API Gestion Étudiants v1.0' });
});

app.use('/api/etudiants', etudiantRoutes);

module.exports = app;
```

Modifiez `server.js` pour qu'il importe `app.js` et se charge uniquement du démarrage :

```javascript
// server.js — démarre l'application
const app = require('./app');
const connectDB = require('./config/database');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
});
```

> 💡 Cette séparation est une bonne pratique standard dans les projets Node.js. En production, on exécute `server.js`. Dans les tests, on importe directement `app.js` — Supertest se charge de créer un faux serveur HTTP temporaire le temps du test.

Ajoutez la configuration Jest dans `package.json` :

```json
"jest": {
  "testEnvironment": "node",
  "testTimeout": 30000
}
```

> 💡 `testTimeout: 30000` donne 30 secondes à chaque test pour s'exécuter. La valeur par défaut de Jest est 5 secondes, ce qui peut être insuffisant pour `mongodb-memory-server` qui a besoin de quelques secondes pour démarrer.

Committez avant d'écrire les tests :

```bash
git add app.js server.js package.json
git commit -m "refactor: séparation app.js / server.js"
```

## Étape 3.3 : Écrire les tests d'intégration

Créez `__tests__/etudiants.test.js` :

```javascript
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const Etudiant = require('../models/Etudiant');

let mongoServer;

// beforeAll s'exécute une seule fois avant tous les tests de ce fichier.
// On démarre MongoDB en mémoire et on s'y connecte.
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

// afterAll s'exécute une seule fois après tous les tests.
// On coupe la connexion et on arrête le serveur MongoDB.
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// afterEach s'exécute après CHAQUE test.
// On vide la collection pour que chaque test parte d'une base propre.
afterEach(async () => {
  await Etudiant.deleteMany({});
});


describe('GET /api/etudiants', () => {

  test('retourne un tableau vide si aucun étudiant', async () => {
    const res = await request(app).get('/api/etudiants');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  test('retourne tous les étudiants', async () => {
    await Etudiant.create([
      { nom: 'Dupont', prenom: 'Alice', moyenne: 15 },
      { nom: 'Martin', prenom: 'Bob',   moyenne: 12 },
    ]);
    const res = await request(app).get('/api/etudiants');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
  });

});


describe('POST /api/etudiants', () => {

  test('crée un étudiant et retourne 201', async () => {
    const res = await request(app)
      .post('/api/etudiants')
      .send({ nom: 'Dupont', prenom: 'Alice', moyenne: 15 });

    expect(res.statusCode).toBe(201);
    expect(res.body.nom).toBe('Dupont');
    expect(res.body._id).toBeDefined();
  });

  test('retourne 400 si le nom est manquant', async () => {
    const res = await request(app)
      .post('/api/etudiants')
      .send({ prenom: 'Alice', moyenne: 15 });

    expect(res.statusCode).toBe(400);
  });

});


describe('GET /api/etudiants/:id', () => {

  test('retourne l\'étudiant correspondant', async () => {
    const etudiant = await Etudiant.create({ nom: 'Dupont', prenom: 'Alice', moyenne: 15 });
    const res = await request(app).get(`/api/etudiants/${etudiant._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.nom).toBe('Dupont');
  });

  test('retourne 404 pour un ID inexistant', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/etudiants/${fakeId}`);
    expect(res.statusCode).toBe(404);
  });

});


describe('PUT /api/etudiants/:id', () => {

  test('met à jour un étudiant', async () => {
    const etudiant = await Etudiant.create({ nom: 'Dupont', prenom: 'Alice', moyenne: 12 });
    const res = await request(app)
      .put(`/api/etudiants/${etudiant._id}`)
      .send({ moyenne: 17 });

    expect(res.statusCode).toBe(200);
    expect(res.body.moyenne).toBe(17);
    expect(res.body.nom).toBe('Dupont'); // les champs non modifiés restent intacts
  });

  test('retourne 404 si l\'étudiant n\'existe pas', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/api/etudiants/${fakeId}`)
      .send({ moyenne: 17 });
    expect(res.statusCode).toBe(404);
  });

});


describe('DELETE /api/etudiants/:id', () => {

  test('supprime l\'étudiant et retourne 200', async () => {
    const etudiant = await Etudiant.create({ nom: 'Dupont', prenom: 'Alice', moyenne: 15 });
    const res = await request(app).delete(`/api/etudiants/${etudiant._id}`);

    expect(res.statusCode).toBe(200);
    // On vérifie aussi directement en base que l'objet a bien disparu
    expect(await Etudiant.findById(etudiant._id)).toBeNull();
  });

  test('retourne 404 si l\'étudiant n\'existe pas', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/api/etudiants/${fakeId}`);
    expect(res.statusCode).toBe(404);
  });

});
```

Lancez `npm test`. Si certains tests échouent, lisez le message d'erreur Jest et cherchez si le problème vient du test ou de votre contrôleur.

**❓ Question :** Commentez temporairement le `afterEach` et relancez les tests plusieurs fois. Que se passe-t-il et pourquoi est-ce un problème ?

> 💡 Sans le `afterEach`, les données créées dans un test subsistent pour le test suivant. Par exemple, le test "retourne un tableau vide" échouera s'il s'exécute après un test qui a créé des étudiants. C'est pourquoi l'**isolation** est un principe fondamental : chaque test doit être totalement indépendant des autres, quel que soit l'ordre d'exécution.

Décommentez `afterEach` et relancez pour vous assurer que tout repasse au vert.

## Étape 3.4 : Committer

```bash
git add .
git commit -m "feat: tests d'intégration Supertest"
git push origin feature/tests-integration
git checkout main
git merge feature/tests-integration
git push origin main
```

---

# 🧠 PARTIE 4 : Mindset Edge Cases

## Qu'est-ce qu'un edge case ?

Un **edge case** (cas limite) est une situation à la frontière du comportement normal de votre application — une valeur extrême, un champ manquant, un format inattendu. Les bugs de production arrivent rarement dans les cas nominaux : ils arrivent quand un utilisateur saisit une valeur qu'on n'avait pas anticipée.

```
HAPPY PATH (cas nominaux)        EDGE CASES (cas limites)
────────────────────────         ───────────────────────────
Créer un étudiant valide    →    Nom vide ou absent
Récupérer une liste         →    Moyenne négative ou > 20
Mettre à jour               →    ID au mauvais format
Supprimer                   →    Body JSON absent ou invalide
```

La règle est simple : pour chaque route, on teste d'abord le cas qui marche (happy path), puis on teste **tout ce qui peut mal se passer**.

## Étape 4.1 : Branche

```bash
git checkout -b feature/edge-cases
```

## Étape 4.2 : Identifier et écrire les tests manquants

Ajoutez ces tests dans le `describe('POST /api/etudiants')` de `etudiants.test.js` :

```javascript
  test('retourne 400 si la moyenne est négative', async () => {
    const res = await request(app)
      .post('/api/etudiants')
      .send({ nom: 'Dupont', prenom: 'Alice', "email": "Dupont.Alice@ecole.tn",
    "filiere": "Informatique",
    "annee": 2,moyenne: -5 });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBeDefined();
  });

  test('retourne 400 si la moyenne dépasse 20', async () => {
    const res = await request(app)
      .post('/api/etudiants')
      .send({ nom: 'Dupont', prenom: 'Alice', "email": "Dupont.Alice@ecole.tn",
    "filiere": "Informatique",
    "annee": 2,moyenne: 25 });
    expect(res.statusCode).toBe(400);
  });

  test('retourne 400 si la moyenne n\'est pas un nombre', async () => {
    const res = await request(app)
      .post('/api/etudiants')
      .send({ nom: 'Dupont', prenom: 'Alice', "email": "Dupont.Alice@ecole.tn",
    "filiere": "Informatique",
    "annee": 2,moyenne: 'bonne' });
    expect(res.statusCode).toBe(400);
  });
```

Ajoutez dans le `describe('GET /api/etudiants/:id')` :

```javascript
  test('retourne 400 pour un ID mal formaté', async () => {
    const res = await request(app).get('/api/etudiants/pas-un-id-valide');
    expect(res.statusCode).toBe(400);
  });
```

Lancez `npm test`. Ces tests échouent probablement car le contrôleur ne fait pas encore ces validations. C'est normal : c'est le TDD appliqué aux routes.

## Étape 4.3 : Mettre à jour le contrôleur

Modifiez `controllers/etudiantController.js` :

```javascript
const mongoose = require('mongoose');
const Etudiant = require('../models/Etudiant');

exports.createEtudiant = async (req, res) => {
  try {
    const { nom, prenom, moyenne } = req.body;

    if (!nom || !prenom) {
      return res.status(400).json({ message: 'Le nom et le prénom sont obligatoires' });
    }
    if (moyenne === undefined || typeof moyenne !== 'number') {
      return res.status(400).json({ message: 'La moyenne doit être un nombre' });
    }
    if (moyenne < 0 || moyenne > 20) {
      return res.status(400).json({ message: 'La moyenne doit être comprise entre 0 et 20' });
    }

    const etudiant = new Etudiant(req.body);
    await etudiant.save();
    res.status(201).json(etudiant);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getEtudiantById = async (req, res) => {
  try {
    // ObjectId.isValid() vérifie que l'ID respecte le format MongoDB (24 caractères hex)
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID invalide' });
    }
    // rest of the code
};
```

Relancez `npm test` — tout doit passer ✅.

> 💡 Remarquez que les tests écrits en Partie 3 (les happy paths) passent toujours. C'est la valeur des tests : quand vous modifiez le code, ils garantissent que vous n'avez rien cassé.

## Étape 4.4 : Checklist des edge cases

Avant de considérer une route terminée, posez-vous systématiquement ces questions :

```
□ Que se passe-t-il si un champ obligatoire est absent ?
□ Que se passe-t-il si un champ a le mauvais type ?
□ Que se passe-t-il aux valeurs limites (0, max, -1, max+1) ?
□ Que se passe-t-il si la ressource demandée n'existe pas → 404 ?
□ Que se passe-t-il si l'ID est mal formaté → 400 ?
□ Le code HTTP retourné est-il le bon (400 ≠ 404 ≠ 500) ?
```

**❓ Question :** Appliquez cette checklist à la route `PUT /api/etudiants/:id`. Quels cas ne sont pas encore testés ? Ajoutez au moins 2 tests supplémentaires.

## Étape 4.5 : Committer

```bash
git add .
git commit -m "feat: validations et tests edge cases"
git push origin feature/edge-cases
git checkout main
git merge feature/edge-cases
git push origin main
```

---

# 🚀 PARTIE 5 : CI/CD avec GitHub Actions

## Qu'est-ce que la CI/CD ?

**CI** signifie **Intégration Continue** (Continuous Integration). Le principe est simple : à chaque fois qu'un développeur pousse du code sur GitHub, un serveur distant exécute automatiquement tous les tests. Si un test échoue, l'équipe est notifiée immédiatement.

Sans CI, chaque développeur fait tourner les tests localement... quand il y pense. Avec la CI, les tests sont exécutés **systématiquement**, dans un environnement neutre et propre, pour chaque modification poussée.

**GitHub Actions** est le système CI/CD intégré à GitHub. Vous définissez des **workflows** dans des fichiers YAML qui décrivent quoi faire et quand. GitHub Actions s'occupe du reste : provisionner un serveur Linux, cloner votre code, exécuter vos commandes, et vous notifier du résultat.

```
VOTRE MACHINE                       GITHUB ACTIONS
──────────────────                  ──────────────────────────────
1. Écrire du code                   4. Cloner le dépôt
2. npm test → ✅                    5. npm ci (install propre)
3. git push  ─────────────────────► 6. npm test → ✅ ou ❌
                                    7. Badge + email de notification
```

## Étape 5.1 : Vérifier l'état du projet

```bash
git status
npm test
```

Tous les tests doivent passer avant de continuer. C'est une règle d'or : on ne pousse jamais du code avec des tests en échec.

## Étape 5.2 : Branche et workflow

```bash
git checkout -b feature/ci-github-actions
mkdir -p .github/workflows
```

Créez `.github/workflows/ci.yml` :

```yaml
name: Tests CI

# Ce workflow se déclenche automatiquement à chaque push sur main
# et à chaque Pull Request vers main.
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest  # GitHub Actions provisionne un serveur Ubuntu propre

    steps:
      # Étape 1 : récupérer le code source du dépôt
      - name: Checkout
        uses: actions/checkout@v4

      # Étape 2 : installer Node.js version 20
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'   # mise en cache de node_modules pour accélérer les builds suivants

      # Étape 3 : installer les dépendances
      # npm ci est préféré à npm install en CI : il installe exactement
      # ce qui est dans package-lock.json, sans résoudre de nouvelles versions.
      - name: Install dependencies
        run: npm ci

      # Étape 4 : lancer les tests
      - name: Run tests
        run: npm test

      # Étape 5 : générer le rapport de couverture
      - name: Coverage
        run: npm run test:coverage
```

Ajoutez un badge de statut dans `README.md` (remplacez les valeurs) :

```markdown
# tp-api-nodejs

![Tests CI](https://github.com/VOTRE_USERNAME/VOTRE_REPO/actions/workflows/ci.yml/badge.svg)

API REST Node.js + MongoDB pour la gestion des étudiants.
```

> 💡 Le badge lit en temps réel le statut du dernier workflow exécuté sur `main`. Il est visible par n'importe qui visitant votre dépôt — c'est un signal de qualité immédiatement visible.

## Étape 5.3 : Pousser et observer

```bash
git add .
git commit -m "ci: workflow GitHub Actions"
git push origin feature/ci-github-actions
git checkout main
git merge feature/ci-github-actions
git push origin main
```

Allez sur votre dépôt GitHub → onglet **Actions**. Vous voyez votre workflow s'exécuter en temps réel. Cliquez sur le job `test` pour voir les logs de chaque étape.

**❓ Question :** Combien de temps dure l'exécution complète ? Le badge apparaît-il sur la page d'accueil de votre dépôt ?

## Étape 5.4 : Provoquer un échec de CI

```bash
git checkout -b test/bug-intentionnel
```

Cassez un test (changez un seuil dans `calculNote.js`), committez, pushez, et créez une **Pull Request** sur GitHub.

```bash
git add .
git commit -m "bug: seuil incorrect"
git push origin test/bug-intentionnel
```

Sur GitHub, observez l'onglet **Actions** : le workflow se lance sur la PR et passe au rouge ❌. La PR affiche un avertissement qui bloque visuellement le merge.

Corrigez, pushez, observez le retour au vert ✅, puis fermez la PR sans merger et nettoyez :

```bash
git checkout main
git branch -D test/bug-intentionnel
```

---

# 🏆 Défis

## Défi 1 : Route de recherche avec ses tests (⭐⭐)

1. Créez une branche `feature/recherche`
2. Ajoutez `GET /api/etudiants/search?nom=xxx` filtrant par nom (insensible à la casse)
3. Écrivez au minimum 4 tests : résultat trouvé, aucun résultat, insensible à la casse, paramètre absent
4. PR → CI verte → merge

<details>
<summary>Indices</summary>

```javascript
// Mongoose : recherche partielle insensible à la casse
await Etudiant.find({ nom: { $regex: req.query.nom, $options: 'i' } });

// Supertest : passer des query params
await request(app).get('/api/etudiants/search').query({ nom: 'dup' });
```
</details>

---

## Défi 2 : Contrainte d'unicité (⭐⭐)

1. Créez une branche `feature/email-unique`
2. Ajoutez un champ `email` unique au schéma Mongoose
3. Testez qu'un doublon retourne **409 Conflict** et non 500

<details>
<summary>Indices</summary>

```javascript
// Schéma
email: { type: String, required: true, unique: true, lowercase: true }

// Contrôleur : code d'erreur MongoDB pour violation d'unicité
if (error.code === 11000) {
  return res.status(409).json({ message: 'Cet email est déjà utilisé' });
}
```
</details>

---

## Défi 3 : Statistiques + protection de branche (⭐⭐⭐)

1. Dans **Settings → Branches**, activez "Require status checks to pass before merging" sur `main`
2. Créez `feature/statistiques` et ajoutez `GET /api/etudiants/stats` → `{ count, moyenne_generale, min, max }`
3. Testez le cas d'une collection vide
4. Vérifiez qu'une PR avec des tests en échec est effectivement bloquée

<details>
<summary>Indice agrégation Mongoose</summary>

```javascript
const stats = await Etudiant.aggregate([{
  $group: {
    _id: null,
    count:            { $sum: 1 },
    moyenne_generale: { $avg: '$moyenne' },
    min:              { $min: '$moyenne' },
    max:              { $max: '$moyenne' }
  }
}]);
```
</details>

---

# 📊 Récapitulatif

## Matchers Jest essentiels

| Matcher | Usage |
|---------|-------|
| `toBe(v)` | Égalité stricte (primitives) |
| `toEqual(obj)` | Égalité profonde (objets/tableaux) |
| `toBeNull()` | Valeur nulle |
| `toHaveLength(n)` | Taille tableau ou string |
| `toContain(x)` | Contient x |
| `toBeCloseTo(n)` | Décimaux approximatifs |
| `toThrow(msg)` | Fonction lève une erreur |
| `.not.` | Inverse n'importe quel matcher |

## Hooks Jest

| Hook | Exécution |
|------|-----------|
| `beforeAll` | Une fois avant tous les tests du fichier |
| `afterAll` | Une fois après tous les tests du fichier |
| `beforeEach` | Avant chaque test |
| `afterEach` | Après chaque test |

## Codes HTTP

| Situation | Code |
|-----------|------|
| Succès GET / PUT / DELETE | `200` |
| Création réussie (POST) | `201` |
| Données invalides | `400` |
| Ressource introuvable | `404` |
| Doublon (unicité) | `409` |
| Erreur serveur | `500` |

## Workflow Git de ce TP

```
git checkout -b feature/xxx     → branche dédiée par fonctionnalité
npm test                        → vérifier avant de committer
git add . && git commit         → committer avec un message clair
git push origin feature/xxx     → pousser
git checkout main && git merge  → fusionner dans main
git push origin main            → synchroniser GitHub
```

---

# 🔧 Dépannage

| Problème | Solution |
|----------|----------|
| `Cannot find module '../app'` | Vérifiez que `app.js` existe à la racine et exporte `module.exports = app` |
| Tests en timeout | Augmentez `testTimeout` à `60000` dans `package.json` |
| Tests qui s'influencent | Vérifiez que `afterEach` appelle `Etudiant.deleteMany({})` |
| `Jest did not exit` | Ajoutez `--forceExit` dans le script test : `"jest --forceExit"` |
| Badge CI absent | Vérifiez le nom exact du fichier `.yml` dans l'URL du badge |

---

# 🎉 Félicitations !

- ✅ Tests manuels avec `console.log` et leurs limites
- ✅ Tests unitaires avec **Jest** (TDD, matchers, coverage)
- ✅ Tests d'intégration avec **Supertest** + **mongodb-memory-server**
- ✅ Réflexe edge cases et validations
- ✅ CI/CD avec **GitHub Actions** (workflow, badge, protection de branche)
- ✅ Workflow Git : **branche → tests → PR → CI → merge**

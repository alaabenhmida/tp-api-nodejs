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
    expect(res.body.data).toHaveLength(0);
  });

  test('retourne tous les étudiants', async () => {
    await Etudiant.create([
      { nom: 'Dupont', prenom: 'Alice', "email": "Dupont.Alice@ecole.tn",
    "filiere": "Informatique",
    "annee": 2,moyenne: 15 },
      { nom: 'Martin', prenom: 'Bob', "email": "Martin.Bob@ecole.tn",
    "filiere": "Informatique",
    "annee": 3,moyenne: 12 },
    ]);
    const res = await request(app).get('/api/etudiants');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

});


describe('POST /api/etudiants', () => {

  test('crée un étudiant et retourne 201', async () => {
    const res = await request(app)
      .post('/api/etudiants')
      .send({ nom: 'Dupont', prenom: 'Alice', "email": "Dupont.Alice@ecole.tn",
    "filiere": "Informatique",
    "annee": 2,moyenne: 15 });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.nom).toBe('Dupont');
    expect(res.body.data._id).toBeDefined();
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
    const etudiant = await Etudiant.create({ nom: 'Dupont', prenom: 'Alice', "email": "Dupont.Alice@ecole.tn",
    "filiere": "Informatique",
    "annee": 2,moyenne: 15 });
    const res = await request(app).get(`/api/etudiants/${etudiant._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.nom).toBe('Dupont');
  });

  test('retourne 404 pour un ID inexistant', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/etudiants/${fakeId}`);
    expect(res.statusCode).toBe(404);
  });

});


describe('PUT /api/etudiants/:id', () => {

  test('met à jour un étudiant', async () => {
    const etudiant = await Etudiant.create({ nom: 'Dupont', prenom: 'Alice', "email": "Dupont.Alice@ecole.tn",
    "filiere": "Informatique",
    "annee": 2,moyenne: 12 });
    const res = await request(app)
      .put(`/api/etudiants/${etudiant._id}`)
      .send({ nom: 'Dupont', prenom: 'Alice', "email": "Dupont.Alice@ecole.tn",
    "filiere": "Informatique",
    "annee": 2,moyenne: 17 });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.moyenne).toBe(17);
    expect(res.body.data.nom).toBe('Dupont'); // les champs non modifiés restent intacts
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
    const etudiant = await Etudiant.create({ nom: 'Dupont', prenom: 'Alice', "email": "Dupont.Alice@ecole.tn",
    "filiere": "Informatique",
    "annee": 2,moyenne: 15 });
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
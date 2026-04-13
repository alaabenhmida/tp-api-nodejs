// Importer mongoose pour se connecter à MongoDB
const mongoose = require('mongoose');

// Fonction asynchrone de connexion à la base de données
const connectDB = async () => {
    try {
        let uri = process.env.MONGODB_URI;

        // Si USE_MEMORY_DB=true ou aucune URI fournie, utiliser MongoDB en mémoire
        if (!uri || process.env.USE_MEMORY_DB === 'true') {
            const { MongoMemoryServer } = require('mongodb-memory-server');
            const mongod = await MongoMemoryServer.create();
            uri = mongod.getUri();
            console.log('⚡ MongoDB en mémoire démarré (mode test)');
        }

        // Tenter la connexion avec l'URI défini
        const conn = await mongoose.connect(uri);
        
        // Si la connexion réussit, afficher un message
        console.log(`✅ MongoDB connecté: ${conn.connection.host}`);
    } catch (error) {
        // Si la connexion échoue, afficher l'erreur et arrêter le programme
        console.error(`❌ Erreur de connexion MongoDB: ${error.message}`);
        process.exit(1);
    }
};

// Exporter la fonction pour l'utiliser ailleurs
module.exports = connectDB;
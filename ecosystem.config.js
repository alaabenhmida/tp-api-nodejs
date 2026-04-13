module.exports = {
  apps: [
    {
      name: "tp-api",
      script: "server.js",
      env: {
        NODE_ENV: "development"
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
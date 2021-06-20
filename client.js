const { Client } = require("pg");

const client = new Client({
    user: "postgres",
    host: "localhost",
    password: "Password",
    port: 5432
});

client.connect();
module.exports = client;
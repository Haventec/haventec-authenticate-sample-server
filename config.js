var config = {};

config.application = {};

config.server = {};
config.mail = {};

config.env = {
    "750b97be-e801-4ad0-acec-110ccb7e0123": {
        env: "local",
        apiKey: "57e5d2eb-c4ab-47e6-9417-822947e48ec8",
        haventecServer: 'http://localhost'
    },
    "85df8ce5-29f3-43ac-b6f9-3a3888121bb9": {
        env: "release",
        apiKey: "297b9973-e625-484f-8e59-4d388e731ac6",
        haventecServer: 'https://anbe-dev-release-1-2.aws.haventec.com'
    },
    "10dd5775-3c70-4332-a9ab-483f6fbb5e2c": {
        env: "production",
        apiKey: "bdac3635-745e-4bbf-a5cf-9ec9873a6f23",
        haventecServer: 'https://api.haventec.com'
    },
    "a450da79-da86-4e93-8fe3-7e1c0e665b11": {
        env: "production2",
        apiKey: "b9bf25aa-bacd-4df6-bac7-db050ecbb378",
        haventecServer: 'https://api.haventec.com'
    },
    "41699311-bf24-48a6-9b64-eafe7c645546": {
        env: "production-branch",
        apiKey: "9eef0b95-2b1c-4a0d-8b44-73a9fe8b3028",
        haventecServer: 'https://anbe-prd-production.prd.internal.haventec.com'
    }
}


config.application.apiKey = '53382e68-6d0b-4c71-ace2-197a8d82698f'; //Sample App
config.application.haventecServer = 'api.haventec.com';

// The host this server is to use, e.g localhost
// config.server.host = (process.env.IP || 'localhost');
config.server.port = (process.env.PORT || 8082);

// The mail server details

module.exports = config;

'use strict';

const Hapi = require('hapi');
const server = new Hapi.Server();

var haventecServerURL = 'https://api.haventec.com/authenticate';

var yourApiKey = process.argv[2];
var yourApplicationId = process.argv[3];
var serverPort = process.argv[4];
var serverHost = process.argv[5];

var globalHeaders = {
    'Content-Type': 'application/json',
    'X-API-Key': yourApiKey,
    'X-Application-ID': yourApplicationId
};

server.connection({ port: serverPort, host: serverHost });

server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
        reply('Haventec Authenticate sample server');
    }
});

server.register({
    register: require('h2o2')
}, function (err) {

    if (err) {
        console.log('Failed to load h2o2');
    }

    server.route({
        method: 'GET',
        path: '/{p*}',
        handler: {
            proxy: {
                mapUri: function (request, callback) {
                    var headers = globalHeaders;
                    var uri = haventecServerURL + request.url.path;
                    callback(null, uri, headers);
                },
                onResponse: function (err, res, request, reply) {
                    reply(res).header('X-Res-Header', 'I\'m a custom response header');
                }
            }
        }
    });

    server.start(function (err) {
        console.log('Haventec Authenticate sample server started at: ' + server.info.uri);
        console.log('This server is NOT intended to be used in a Production environment.');
    });
});
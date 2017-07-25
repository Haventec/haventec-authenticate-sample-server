'use strict';

const Hapi = require('hapi');
const server = new Hapi.Server();
const nodemailer = require('nodemailer');
const Wreck = require('wreck');

//let haventecServerURL = '';
let haventecServerURL = 'https://anbe-dev-release-1-2.aws.haventec.com/authenticate';

let apiKey = process.argv[2];
let serverHost = process.argv[3];
let serverPort = process.argv[4];
let mailServerHost = process.argv[5];
let mailServerPort = process.argv[6];
let mailServerSecure = process.argv[7];
let mailServerUsername = process.argv[8];
let mailServerPassword = process.argv[9];

let globalHeaders = {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey
};

/******************************
 *
 * Mail server config
 *
 ******************************/
let transporter = nodemailer.createTransport({
    host: mailServerHost,
    port: mailServerPort,
    secure: (mailServerSecure === 'true'),
    auth: {
        user: mailServerUsername,
        pass: mailServerPassword
    }
});

let mailOptions = {
    from: '"Haventec" <no-reply@haventec.com.com>',
    to: 'john.kelleher@haventec.com',
    subject: 'Hello',
    text: 'Hello world ?',
    html: '<b>Hello world ?</b>'
};

// transporter.sendMail(mailOptions, (error, info) => {
//     if (error) {
//         return console.log(error);
//     }
//     console.log('Message %s sent: %s', info.messageId, info.response);
// });

/******************************
 *
 * Web server config
 *
 ******************************/
server.connection({ port: serverPort, host: serverHost, routes: { cors: true }  });

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

    // Returns a registration token for a self-service created user
    server.route({
        method: 'POST',
        path: '/self-service/user',
        handler: {
            proxy: {
                passThrough: true,
                mapUri: function (request, callback) {
                    let uri = haventecServerURL + request.url.path;
                    console.info('Called POST /self-service/user');
                    callback(null, uri, globalHeaders);
                },
                onResponse: function (err, res, request, reply) {

                    // Get the payload from the http.IncomingMessage obj
                    Wreck.read(res, null, function (err, payload) {
                        let data = JSON.parse(payload.toString());

                        if(data.status !== undefined){
                            console.log(data.status);
                        }

                        // Add the headers from the upstream
                        reply(payload).headers = res.headers;
                    });
                }
            }
        }
    });

    // Registers the user and returns their new authentication keys and JWT
    server.route({
        method: 'POST',
        path: '/register/user',
        handler: function (request, reply) {
            console.info('Called POST /register/user');

            var  body = {
                "accessToken":{
                    "token":"",
                    "type":""
                },
                "applicationUuid":"",
                "authKey":"",
                "deviceUuid":"",
                "userUuid":"",
                "responseStatus":{
                    "message":"",
                    "code":"",
                    "status":"SUCCESS"
                }
            };

            reply(body);
        }
    });

    // Logs the user in and returns a new set of authentication keys and JWT
    server.route({
        method: 'POST',
        path: '/login',
        handler: function (request, reply) {
            console.info('Called POST /login');

            var  body = {
                "accessToken": {
                    "token": "string",
                    "type": "string"
                },
                "authKey": "string",
                "responseStatus":{
                    "message":"",
                    "code":"",
                    "status":"SUCCESS"
                }
            };

            reply(body);
        }
    });

    // Logs the user out and invalidates their JWT
    server.route({
        method: 'DELETE',
        path: '/logout',
        handler: function (request, reply) {
            console.info('Called DELETE /logout');

            var  body = {
                "responseStatus":{
                    "message":"",
                    "code":"",
                    "status":"SUCCESS"
                }
            };

            reply(body);
        }
    });

    // Calls forgot pin for a given user and returns a reset token
    server.route({
        method: 'POST',
        path: '/forgot-pin',
        handler: function (request, reply) {
            console.info('Called POST /forgot-pin');

            var  body = {
                "resetToken":"",
                "responseStatus":{
                    "message":"",
                    "code":"",
                    "status":"SUCCESS"
                }
            };

            reply(body);
        }
    });

    // Resets the user's PIN and returns their new authentication keys and JWT
    server.route({
        method: 'POST',
        path: '/reset-pin',
        handler: function (request, reply) {
            console.info('Called POST /reset-pin');

            var  body =     {
                "deviceUuid":"",
                "accessToken":{
                    "type":"",
                    "token":""
                },
                "authKey":"",
                "responseStatus":{
                    "message":"",
                    "code":"",
                    "status":"SUCCESS"
                }
            };

            reply(body);
        }
    });

    // server.route({
    //     method: 'GET',
    //     path: '/{p*}',
    //     handler: {
    //         proxy: {
    //             mapUri: function (request, callback) {
    //                 var headers = globalHeaders;
    //                 var uri = haventecServerURL + request.url.path;
    //                 callback(null, uri, headers);
    //             },
    //             onResponse: function (err, res, request, reply) {
    //                 reply(res).header('X-Res-Header', 'I\'m a custom response header');
    //             }
    //         }
    //     }
    // });

    server.start(function (err) {
        console.log('Haventec Authenticate sample server started at: ' + server.info.uri);
        console.log('This server is NOT intended to be used in a Production environment.');
    });
});
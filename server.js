'use strict';

const Hapi = require('hapi');
const server = new Hapi.Server();
const nodemailer = require('nodemailer');
const https = require('https');
const http = require('http');
const config = require('./config');
const validator = require("email-validator");

let globalHeaders = {
    'Content-Type': 'application/json',
    'x-api-key': config.application.apiKey
};

/******************************
 *
 * Mail server config
 *
 ******************************/
let transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure,
    auth: {
        user: config.mail.username,
        pass: config.mail.password
    }
});

/******************************
 *
 * Web server config
 *
 ******************************/

 if ( config.server.host ) {
    server.connection({ host: config.server.host, port: config.server.port, routes: { cors: true }  });
 } else {
    server.connection({ port: config.server.port, routes: { cors: true }  });
 }

server.register(require('inert'), (err) => {
    if (err) {
        throw err;
    }

    server.route({
        method: 'GET',
        path: '/',
        handler: function (request, reply) {
            reply.file('index.html');
        }
    });

    server.route({
        method: 'GET',
        path: '/openid/sjcl.js',
        handler: function (request, reply) {
            reply.file('openid/sjcl.js');
        }
    });

    server.route({
        method: 'GET',
        path: '/openid/login.html',
        handler: function (request, reply) {
            reply.file('openid/login.html');
        }
    });

    server.route({
        method: 'GET',
        path: '/openid/addDevice.html',
        handler: function (request, reply) {
            reply.file('openid/addDevice.html');
        }
    });

    server.route({
        method: 'GET',
        path: '/openid/activateDevice.html',
        handler: function (request, reply) {
            reply.file('openid/activateDevice.html');
        }
    });

// Activate the user and returns their new authentication keys and JWT
    server.route({
        method: 'POST',
        path: '/activate/user',
        handler: function (request, reply) {
            console.info('Called POST /activate/user');
            callHaventecServer('/authenticate/v1-2/authentication/activate/user', 'POST', request.payload, function (result) {
                reply(result);
            });
        }
    });

    // Activate the device and returns their new authentication keys and JWT
    server.route({
        method: 'POST',
        path: '/activate/device',
        handler: function (request, reply) {
            console.info('Called POST /activate/device');
            callHaventecServer('/authenticate/v1-2/authentication/activate/device', 'POST', request.payload, function (result) {
                reply(result);
            });
        }
    });

    // Logs the user in and returns a new set of authentication keys and JWT
    server.route({
        method: 'POST',
        path: '/login',
        handler: function (request, reply) {
            console.info('Called POST /login');
            callHaventecServer('/authenticate/v1-2/authentication/login', 'POST', request.payload, function (result) {
                reply(result);
            });
        }
    });

    // Logs the user out and invalidates their JWT
    server.route({
        method: 'DELETE',
        path: '/logout',
        handler: function (request, reply) {
            console.info('Called DELETE /logout');
            callHaventecServer('/authenticate/v1-2/authentication/logout', 'DELETE', request.payload, function (result) {
                reply(result);
            });
        }
    });

    // Resets the user's PIN and returns their new authentication keys and JWT
    server.route({
        method: 'POST',
        path: '/reset-pin',
        handler: function (request, reply) {
            console.info('Called POST /reset-pin');
            callHaventecServer('/authenticate/v1-2/authentication/reset-pin', 'POST', request.payload, function (result) {
                reply(result);
            });
        }
    });

    // Gets the current user's details
    server.route({
        method: 'GET',
        path: '/user/current',
        handler: function (request, reply) {
            console.info('Called Get /user/current');
            callHaventecServer('/authenticate/v1-2/user/current', 'GET', '', function (result) {
                reply(result);
            }, request);
        }
    });

    // Add a new device to the users account and email the activation code to their email address
    server.route({
        method: 'POST',
        path: '/device',
        handler: function (request, reply) {
            console.info('Called POST /self-service/device');

            callHaventecServer('/authenticate/v1-2/self-service/device', 'POST', request.payload, function (result) {
                if (result.activationToken !== undefined && result.userEmail !== undefined) {
                    console.info('Device Activation Token', result.activationToken);
                    sendEmail(result.userEmail, 'My App - New Device Request', 'Device Activation code: ' + result.activationToken);
                    // We do not want to send the email or activationToken back to the client;
                    result.userEmail = '';
                    result.activationToken = '';
                }

                reply(result);
            });
        }
    });

    // Calls forgot pin for a given user and returns a reset PIN token
    server.route({
        method: 'POST',
        path: '/forgot-pin',
        handler: function (request, reply) {
            console.info('Called POST /forgot-pin');

            callHaventecServer('/authenticate/v1-2/authentication/forgot-pin', 'POST', request.payload, function (result) {
                if (result.resetPinToken !== undefined && result.userEmail !== undefined) {
                    console.info('Reset Token', result.resetPinToken);
                    sendEmail(result.userEmail, 'My App - Reset PIN', 'Reset PIN code: ' + result.resetPinToken);
                    // We do not want to send the email or resetPinToken back to the client;
                    result.userEmail = '';
                    result.resetPinToken = '';
                }

                reply(result);
            });
        }
    });

    // Returns a registration token for a self-service created user
    server.route({
        method: 'POST',
        path: '/self-service/user',
        handler: function (request, reply) {
            console.info('Called POST /self-service/user');
            callHaventecServer('/authenticate/v1-2/self-service/user', 'POST', request.payload, function (result) {
                reply(result);
            });
        }
    });

    // Test email endpoint
    server.route({
        method: 'GET',
        path: '/test-email',
        handler: function (request, reply) {
            console.info('Called POST /test-email');

            let params = request.query;
            let result = 'Test failed: no email or invalid email address was supplied';

            if(config.mail.host === ''){
                result = ('Mail server is not configured. Please see the README file on how to configure your mail server');
            }
            else if (validator.validate(params.email)) {
                sendEmail(params.email, 'My App - Test email', 'Test email was successful');
                result = 'Email sent to ' + params.email + '. Please check your inbox';
            }
            reply(result);
        }
    });

let openidAuthRequestParams = undefined;

// OpenID Authorization URL endpoint
server.route({
    method: 'GET',
    path: '/openid/auth',
    handler: function (request, reply) {
        console.info('Called GET /openid/auth');

        let params = request.query;
        let result = 'Test failed: no email or invalid email address was supplied';
        //    response_type=code
        // &scope=openid%20profile%20email
        // &client_id=s6BhdRkqt3
        // &client_secret=blahblahblah123
        // &state=af0ifjsldkj
        // &redirect_uri=https%3A%2F%2Fclient.example.org%2Fcb
        let response_type = params.response_type;
        let scope = params.scope;
        let client_id = params.client_id;
        let client_secret = params.client_secret;
        let state = params.state;
        let redirect_uri = params.redirect_uri;

        openidAuthRequestParams = params;

        // let queryString = 'response_type=' + response_type + '&scope=' + scpope + '&client_id=' + client_id
        // + '&client_secret=' + client_secret + '&state=' + state + '&redirect_uri=' + redirect_uri;
        //
        // callHaventecServer('/authenticate/v1-2/openid/auth?' + queryString, 'GET', function (result) {
        //     // reply(result);
        //     reply.file('login.html');
        // });

        reply.redirect('login.html?#');
    }
});

// OpenID Authorization URL endpoint
server.route({
    method: 'GET',
    path: '/openid/authcomplete',
    handler: function (request, reply) {
        console.info('Called GET /openid/authcomplete');

        let params = request.query;
        let result = 'Test failed: no email or invalid email address was supplied';
        //    response_type=code
        // &scope=openid%20profile%20email
        // &client_id=s6BhdRkqt3
        // &client_secret=blahblahblah123
        // &state=af0ifjsldkj
        // &redirect_uri=https%3A%2F%2Fclient.example.org%2Fcb

        let code = params.code;
        let response_type = openidAuthRequestParams.response_type;
        let scope = openidAuthRequestParams.scope;
        let client_id = openidAuthRequestParams.client_id;
        let client_secret = openidAuthRequestParams.client_secret;
        let state = openidAuthRequestParams.state;
        let redirect_uri = openidAuthRequestParams.redirect_uri;

        // let queryString = 'response_type=' + response_type + '&scope=' + scpope + '&client_id=' + client_id
        // + '&client_secret=' + client_secret + '&state=' + state + '&redirect_uri=' + redirect_uri;
        //
        // callHaventecServer('/authenticate/v1-2/openid/auth?' + queryString, 'GET', function (result) {
        //     // reply(result);
        //     reply.file('login.html');
        // });

        console.info('Called GET /openid/auth, code=' + code);
        console.info('Called GET /openid/auth, state=' + state);
        console.info('Called GET /openid/auth, redirect_uri=' + redirect_uri);

        reply.redirect(redirect_uri + "?code=" + code + "&state="+ state);
    }
});

// OpenID Token URL endpoint
server.route({
    method: 'POST',
    path: '/openid/token',
    handler: function (request, reply) {
        console.info('Called POST /openid/token');

        // grant_type=authorization_code&code=SplxlOBeZQQYbYS6WxSbIA
        // &redirect_uri=https%3A%2F%2Fclient.example.org%2Fcb

        var payload = request.payload;
        payload.applicationUuid = "afb7e4d9-8c29-4063-b6de-1aa168c0d60c";

        console.log("Called POST /openid/token, params = " + JSON.stringify(request.payload));
        console.log("Called POST /openid/token, payload = " + JSON.stringify(payload));

        callHaventecServer('/authenticate/v1-2/openid/token', 'POST', payload, function (result) {
            console.log("Called POST /openid/token, result = " + JSON.stringify(result))

            reply(result);
        });
    }
});

server.start(function (err) {
        console.log('Haventec Authenticate sample server started at: ' + server.info.uri);
        console.log('This server is NOT intended to be used in a Production environment.');
    });

});

function sendEmail(email, subject, body){
    let mailOptions = {
        from: config.mail.fromAddress,
        to: email,
        subject: subject,
        text: body
    };

    if(config.mail.host === ''){
        return console.log('Mail server is not configured');
    }
    else {
        transporter.sendMail(mailOptions, (error, info) => {
            if (info) {
                return console.log('Mail server info', info);
            }
            if (error) {
                return console.log(error);
            }
        });
    }
}

function callHaventecServer(path, method, payload, callback, request) {
    const postData = JSON.stringify(payload);
    const options = {
        hostname: config.application.haventecServer,
        path: path,
        method: method,
        headers: setHeaders(request)
    };

    const req = http.request(options, (res) => {
        res.setEncoding('utf8');
        res.on('data', (data) => {
            callback(JSON.parse(data));
        });
    });

    req.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });

    // write data to request body
    req.write(postData);
    req.end();
}

function setHeaders(request) {
    if(((((request || {}).raw || {}).req || {}).headers || {}).authorization) {
        let headers = globalHeaders;
        headers['Authorization'] = request.raw.req.headers.authorization;
        return headers;
    }
    return globalHeaders;
}
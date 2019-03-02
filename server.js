'use strict';

const Hapi = require('hapi');
let server = null;
const nodemailer = require('nodemailer');
const http = require('superagent');
require('superagent-proxy')(http);
const config = require('./config');
const validator = require("email-validator");
const _ = require('lodash');

var proxy = process.env.http_proxy || 'http://proxy.aws.haventec.com:8080';

let globalHeaders = {
    'Content-Type': 'application/json'
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
    server = new Hapi.Server({ host: config.server.host, port: config.server.port, routes: { cors: true }  });
 } else {
    server = new Hapi.Server({ port: config.server.port, routes: { cors: true }  });
 }

const start = async () => {

    await server.register(require('inert'));

    server.route({
        method: 'GET',
        path: '/',
        handler: async function (request, reply) {
            return reply.file('index.html');
        }
    });

    server.route({
        method: 'GET',
        path: '/openid/sjcl.js',
        handler: async function (request, reply) {
            return reply.file('openid/sjcl.js');
        }
    });

    server.route({
        method: 'GET',
        path: '/openid/login.html',
        handler: async function (request, h) {
            return h.file('openid/login.html');
        }
    });

    server.route({
        method: 'GET',
        path: '/openid/addDevice.html',
        handler: async function (request, reply) {
            return reply.file('openid/addDevice.html');
        }
    });

    server.route({
        method: 'GET',
        path: '/openid/activateDevice.html',
        handler: async function (request, reply) {
            return reply.file('openid/activateDevice.html');
        }
    });

// Activate the user and returns their new authentication keys and JWT
    server.route({
        method: 'POST',
        path: '/activate/user',
        handler: async function (request, reply) {
            console.info('Called POST /activate/user');
            return callHaventecServer('/authenticate/v1-2/authentication/activate/user', 'POST', request.payload, function (result) {
                return result;
            }, reply);
        }
    });

    // Activate the device and returns their new authentication keys and JWT
    server.route({
        method: 'POST',
        path: '/activate/device',
        handler: async function (request, reply) {
            console.info('Called POST /activate/device');
            return callHaventecServer('/authenticate/v1-2/authentication/activate/device', 'POST', request.payload, function (result) {
                return result;
            }, reply);
        }
    });

    // Logs the user in and returns a new set of authentication keys and JWT
    server.route({
        method: 'POST',
        path: '/login',
        handler: async function (request, reply) {
            console.info('Called POST /login');
            return callHaventecServer('/authenticate/v1-2/authentication/login', 'POST', request.payload, function (result) {
                return result;
            }, reply);
        }
    });

    // Logs the user out and invalidates their JWT
    server.route({
        method: 'DELETE',
        path: '/logout',
        handler: async function (request, reply) {
            console.info('Called DELETE /logout');
            return callHaventecServer('/authenticate/v1-2/authentication/logout', 'DELETE', request.payload, function (result) {
                return result;
            }, reply);
        }
    });

    // Resets the user's PIN and returns their new authentication keys and JWT
    server.route({
        method: 'POST',
        path: '/reset-pin',
        handler: async function (request, reply) {
            console.info('Called POST /reset-pin');
            return callHaventecServer('/authenticate/v1-2/authentication/reset-pin', 'POST', request.payload, function (result) {
                return result;
            }, reply);
        }
    });

    // Gets the current user's details
    server.route({
        method: 'GET',
        path: '/user/current',
        handler: async function (request, reply) {
            console.info('Called Get /user/current');
            return callHaventecServer('/authenticate/v1-2/user/current', 'GET', '', function (result) {
                return result;
            }, reply, request);
        }
    });

    // Gets the current user's devices
    server.route({
        method: 'GET',
        path: '/user/{userUuid}/device',
        handler: async function (request, reply) {
            console.info('\nCalled Get /user/{userUuid}/device');
            return callHaventecServer('/authenticate/v1-2/user/' + request.params.userUuid + '/device', 'GET', '', function (result) {
                return result;
            }, reply, request);
        }
    });

    // Add a new device to the users account and email the activation code to their email address
    server.route({
        method: 'POST',
        path: '/device',
        handler: async function (request, reply) {
            console.info('Called POST /self-service/device with request: '+request);

            return callHaventecServer('/authenticate/v1-2/self-service/device', 'POST', request.payload, function (result) {
                if (result.activationToken !== undefined && result.userEmail !== undefined) {
                    console.info('Device Activation Token', result.activationToken);
                    sendEmail(result.userEmail, 'My App - New Device Request', 'Device Activation code: ' + result.activationToken);
                    // We do not want to send the email or activationToken back to the client;
                    // result.userEmail = '';
                    // result.activationToken = '';
                }

                return result;
            }, reply);
        }
    });

    // Delete a device
    server.route({
        method: 'DELETE',
        path: '/device/{deviceUuid}',
        handler: async function (request, reply) {
            console.info('\nCalled DELETE /device/{deviceUuid}');
            return callHaventecServer('/authenticate/v1-2/device/' + request.params.deviceUuid, 'DELETE', '', function (result) {
                return result;
            }, reply, request);
        }
    });

    // Update a device
    server.route({
        method: 'PATCH',
        path: '/device/{deviceUuid}',
        handler: async function (request, reply) {
            console.info('\nCalled PATCH /device/{deviceUuid}');
            return callHaventecServer('/authenticate/v1-2/device/' + request.params.deviceUuid, 'PATCH', request.payload, function (result) {
                return result;
            }, reply, request);
        }
    });

    // Calls forgot pin for a given user and returns a reset PIN token
    server.route({
        method: 'POST',
        path: '/forgot-pin',
        handler: async function (request, reply) {
            console.info('Called POST /forgot-pin');

            return callHaventecServer('/authenticate/v1-2/authentication/forgot-pin', 'POST', request.payload, function (result) {
                if (result.resetPinToken !== undefined && result.userEmail !== undefined) {
                    console.info('Reset Token', result.resetPinToken);
                    sendEmail(result.userEmail, 'My App - Reset PIN', 'Reset PIN code: ' + result.resetPinToken);
                    // We do not want to send the email or resetPinToken back to the client;
                    // result.userEmail = '';
                    // result.resetPinToken = '';
                }

                return result;
            }, reply);
        }
    });

    // Returns a registration token for a self-service created user
    server.route({
        method: 'POST',
        path: '/self-service/user',
        handler: async function (request, reply) {
            console.info('Called POST /self-service/user');
            return callHaventecServer('/authenticate/v1-2/self-service/user', 'POST', request.payload, function (result) {
                return result;
            }, reply);
        }
    });

    // Test email endpoint
    server.route({
        method: 'GET',
        path: '/test-email',
        handler: async function (request, reply) {
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
            return result;
        }
    });

    let openidAuthRequestParams = undefined;

    // OpenID Authorization URL endpoint
    server.route({
        method: 'GET',
        path: '/openid/auth',
        handler:  (request, h) => {
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
            // return callHaventecServer('/authenticate/v1-2/openid/auth?' + queryString, 'GET', function (result) {
            //     // return result;
            //     return reply.file('login.html');
            // });

            console.log("request.query=" + JSON.stringify(request.query));
            console.log("client_id=" + JSON.stringify(openidAuthRequestParams.client_id));
            return h.redirect('login.html?applicationUuid=' + client_id + '&state=' + state + '&redirect_uri=' + redirect_uri);
        }
    });

    // Logs the user in and returns a new set of authentication keys and JWT
    server.route({
        method: 'POST',
        path: '/openid/login',
        handler: async function (request, reply) {
            console.info('Called POST /login');
            return callHaventecServer('/authenticate/v1-2/authentication/login', 'POST', request.payload, function (result) {
                return result;
            }, reply);
        }
    });



    // OpenID Authorization URL return - After auth, redirects back to the redirect_uri specified in the request
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
            let state = params.state;
            // let response_type = openidAuthRequestParams ? openidAuthRequestParams.response_type : '';
            // let scope = openidAuthRequestParams.scope;
            // let client_id = openidAuthRequestParams.client_id;
            // let client_secret = openidAuthRequestParams.client_secret;
            let redirect_uri = params.redirect_uri;

            // let queryString = 'response_type=' + response_type + '&scope=' + scpope + '&client_id=' + client_id
            // + '&client_secret=' + client_secret + '&state=' + state + '&redirect_uri=' + redirect_uri;
            //
            // return callHaventecServer('/authenticate/v1-2/openid/auth?' + queryString, 'GET', function (result) {
            //     // return result;
            //     return reply.file('login.html');
            // });

            console.info('Called GET /openid/authcomplete, code=' + code);
            console.info('Called GET /openid/authcomplete, state=' + state);
            console.info('Called GET /openid/authcomplete, redirect_uri=' + redirect_uri);

            return reply.redirect(redirect_uri + "?code=" + code + "&state="+ state);

            // return callHaventecServer('/authenticate/v1-2/openid/authcomplete?code=' + code + '&state=' + state + '&redirect_uri=' + redirect_uri, 'GET', '', function (result) {
            //     console.log("Called GET /openid/authcomplete, result = " + JSON.stringify(result))
            //
            //     return result;
            // });
        }
    });

    // OpenID Token URL endpoint
    server.route({
        method: 'POST',
        path: '/openid/token',
        handler: async function (request, reply) {
            console.info('Called POST /openid/token');

            // grant_type=authorization_code&code=SplxlOBeZQQYbYS6WxSbIA
            // &redirect_uri=https%3A%2F%2Fclient.example.org%2Fcb

            var payload = request.payload;
            // payload.applicationUuid = "786fb3c4-d12f-45ee-8bfd-efa99100fe76";

            console.log("Called POST /openid/token, payload = " + JSON.stringify(payload));

            return callHaventecServer('/authenticate/v1-2/openid/token', 'POST', payload, function (result) {
                console.log("Called POST /openid/token, result = " + JSON.stringify(result))

                return result;
            }, reply);
        }
    });

    try {
        await server.start();
    }
    catch (err) {
        console.log(err);
        process.exit(1);
    }

    console.log('Haventec Authenticate sample server started at: ' + server.info.uri);
    console.log('This server is NOT intended to be used in a Production environment.');
};

start();

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
                return console.log("Send mail", error);
            }
        });
    }
}

async function callHaventecServer(path, method, payload, callback, reply, request) {
    let haventecServer = config.application.haventecServer;
    let applicationUuid = 'not set';
    let apiKey = config.application.apiKey;
    let env = 'no set';

    if ( payload.applicationUuid ) {
        applicationUuid = payload.applicationUuid;
        haventecServer = config.env[payload.applicationUuid].haventecServer;
        apiKey = config.env[payload.applicationUuid].apiKey;
        env = config.env[payload.applicationUuid].env;
    }

    console.log("Env = " + env);
    console.log("haventecServer = " + haventecServer);
    console.log("apiKey = " + apiKey);
    console.log("applicationUuid = " + applicationUuid);
    const authenticateUrl = haventecServer + path;

    console.log('Authenticate URL: ', authenticateUrl );

    console.log('callHaventecServer: ' + path + ' ' + method + " with "  + JSON.stringify(payload));

    let response = null;
    if ( env === 'production' ) {
        try {
            response = await http(method, authenticateUrl)
                .send(payload)
                .set(setHeaders(request, apiKey))
                .proxy(proxy);
        } catch ( err ) {
            console.log("ERROR:", err.message);
            return ({responseStatus: {status: "ERROR", message: err.message, code: ""}});
        }
    } else {
        try {
            response = await http(method, authenticateUrl)
                .send(payload)
                .set(setHeaders(request, apiKey));
        } catch ( err ) {
            console.log("ERROR:", err.message);
            return ({responseStatus: {status: "ERROR", message: err.message, code: ""}});
        }
    }

    console.log('returning response');
    console.log(response.text);

    return JSON.parse(response.text);
}

function setHeaders(request, apiKey) {
    if(((((request || {}).raw || {}).req || {}).headers || {}).authorization) {
        let headers = _.clone(globalHeaders);
        if ( apiKey ) {
            headers['x-api-key'] = apiKey;
        }
        headers['Authorization'] = request.raw.req.headers.authorization;

        console.log(headers);
        return headers;
    }

    if ( apiKey ) {
        globalHeaders['x-api-key'] = apiKey;
    }
    console.log(globalHeaders);
    return globalHeaders;
}

// AWS handler and mapping lambda event to Hapi request
exports.handler = (event, context, callback) => {

    let path = '/';

    if(event.path){
        path = event.path;
    }

    if(event.queryStringParameters){
        path = path + '?' + querystring.stringify(event.queryStringParameters);
    }

    const options = {
        method: event.httpMethod,
        url: path,
        payload: event.body,
        headers: event.headers,
        validate: false
    };

    // AWS API gateway may be setup with additional URL paths that the Hapi server does not route
    // This removes those paths so the Hapi server can route to the correct handler
    options.url = options.url.replace(config.aws.removeUrl, '');

    server.inject(options, function(res){
        const response = {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*"
            },
            "body": JSON.stringify(res.result),
            "isBase64Encoded": false
        };

        callback(null, response);
    });
};

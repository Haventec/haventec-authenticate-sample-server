'use strict';

const Hapi = require('hapi');
let server = null;
const nodemailer = require('nodemailer');
const http = require('superagent');
const config = require('./config');
const validator = require("email-validator");
const _ = require('lodash');
const querystring = require('querystring');

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

if(config.aws && config.aws.lambda){
    console.info('Running in AWS Lambda mode');
    server = new Hapi.Server({ routes: { cors: true } });
} else if ( config.server.host ) {
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
            console.info('\nCalled GET /');

            if(config.aws.lambda){
                return reply('Haventec Authenticate Sample Server is running');
            } else {
                return reply.file('index.html');
            }
        }
    });

    // Activate the user and returns their new authentication keys and JWT
    server.route({
        method: 'POST',
        path: '/activate/user',
        handler: async function (request, reply) {
            console.info('\nCalled POST /activate/user');
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
            console.info('\nCalled POST /activate/device');
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
            console.info('\nCalled POST /login');
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
            console.info('\nCalled DELETE /logout');
            return callHaventecServer('/authenticate/v1-2/authentication/logout', 'DELETE', '', function (result) {
                return result;
            }, reply, request);
        }
    });

    // Resets the user's PIN and returns their new authentication keys and JWT
    server.route({
        method: 'POST',
        path: '/reset-pin',
        handler: async function (request, reply) {
            console.info('\nCalled POST /reset-pin');
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
            console.info('\nCalled Get /user/current');
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
            console.info('\nCalled POST /self-service/device');

            return callHaventecServer('/authenticate/v1-2/self-service/device', 'POST', request.payload, function (result) {
                if (result.activationToken !== undefined && result.userEmail !== undefined) {
                    console.info('Device Activation Token', result.activationToken);
                    sendEmail(result.userEmail, 'My App - New Device Request', 'Device Activation code: ' + result.activationToken);
                    // We do not want to send the email or activationToken back to the client;
                    result.userEmail = '';
                    result.activationToken = '';
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
            console.info('\nCalled POST /forgot-pin');

            return callHaventecServer('/authenticate/v1-2/authentication/forgot-pin', 'POST', request.payload, function (result) {
                if (result.resetPinToken !== undefined && result.userEmail !== undefined) {
                    console.info('Reset Token', result.resetPinToken);
                    sendEmail(result.userEmail, 'My App - Reset PIN', 'Reset PIN code: ' + result.resetPinToken);
                    // We do not want to send the email or resetPinToken back to the client;
                    result.userEmail = '';
                    result.resetPinToken = '';
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
            console.info('\nCalled POST /self-service/user');
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

    if(!config.aws || !config.aws.lambda){
        server.start(function (err) {
            console.info('Haventec Authenticate sample server started at: ' + server.info.uri);
            console.info('This server is NOT intended to be used in a Production environment.');
        });
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
        return console.info('Mail server is not configured');
    }
    else {
        transporter.sendMail(mailOptions, (error, info) => {
            if (info) {
                return console.info('Mail server info', info);
            }
            if (error) {
                return console.warn("Send mail", error);
            }
        });
    }
}

async function callHaventecServer(path, method, payload, callback, reply, request) {
    const authenticateUrl = 'https://' + config.application.haventecServer + path;

    console.info('Authenticate URL: ', authenticateUrl );

    try {
        const response = await http(method, authenticateUrl)
            .set(setHeaders(request))
            .send(payload);
        console.log(response);
        return JSON.parse(response.text);
    } catch ( err ) {
        console.log("ERROR:", err.message);
        return ({responseStatus: {status: "ERROR", message: err.message, code: ""}});
    }
}

function setHeaders(request) {
    if(((((request || {}).raw || {}).req || {}).headers || {}).authorization) {
        let headers = _.clone(globalHeaders);
        headers['Authorization'] = request.raw.req.headers.authorization;
        console.info('Sending Authorization Headers');
        return headers;
    }
    console.info('Sending Global Headers');
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

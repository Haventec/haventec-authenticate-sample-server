'use strict';

const Hapi = require('hapi');
const server = new Hapi.Server();
const nodemailer = require('nodemailer');
const https = require('https');
const config = require('./config');
const validator = require("email-validator");

let globalHeaders = {
    'Content-Type': 'application/json',
    'X-API-Key': config.application.apiKey
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

    // Registers the user and returns their new authentication keys and JWT
    server.route({
        method: 'POST',
        path: '/register/user',
        handler: function (request, reply) {
            console.info('Called POST /register/user');
            callHaventecServer('/authenticate/authentication/register/user', 'POST', request.payload, function (result) {
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
            callHaventecServer('/authenticate/authentication/login', 'POST', request.payload, function (result) {
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
            callHaventecServer('/authenticate/authentication/logout', 'DELETE', request.payload, function (result) {
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
            callHaventecServer('/authenticate/authentication/reset-pin', 'POST', request.payload, function (result) {
                reply(result);
            });
        }
    });

    // Calls forgot pin for a given user and returns a reset token
    server.route({
        method: 'POST',
        path: '/forgot-pin',
        handler: function (request, reply) {
            console.info('Called POST /forgot-pin');

            callHaventecServer('/authenticate/authentication/forgot-pin', 'POST', request.payload, function (result) {
                if (result.resetToken !== undefined && result.email !== undefined) {
                    console.info('Reset Token', result.resetToken);
                    sendEmail(result.email, 'My App - Reset pin', 'Reset PIN code: ' + result.resetToken);
                    // We do not want to send the email or resetToken back to the client;
                    result.email = '';
                    result.resetToken = '';
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

            // Add the API key to the POST body
            request.payload.apiKey = config.application.apiKey;

            // Get the email address of the user signing up
            let email = request.payload.email;

            callHaventecServer('/authenticate/self-service/user', 'POST', request.payload, function (result) {
                if (result.registrationToken !== undefined) {
                    console.info('Registration Token', result.registrationToken);
                    sendEmail(email, 'My App - Activate your account', 'Activation code: ' + result.registrationToken);
                    // We do not want to send the registrationToken back to the client;
                    result.registrationToken = '';
                }

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

function callHaventecServer(path, method, payload, callback) {
    const postData = JSON.stringify(payload);
    const options = {
        hostname: config.application.haventecServer,
        path: path,
        method: method,
        headers: globalHeaders
    };

    const req = https.request(options, (res) => {
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
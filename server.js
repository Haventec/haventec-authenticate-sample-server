'use strict';

const Hapi = require('hapi');
const server = new Hapi.Server();
const nodemailer = require('nodemailer');
const https = require('https');

let haventecServerHost = 'api.aws.haventec.com';

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

var fromAddress = '"Haventec" <no-reply@haventec.com.com>';

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

// Registers the user and returns their new authentication keys and JWT
server.route({
    method: 'POST',
    path: '/register/user',
    handler: function (request, reply) {
        console.info('Called POST /register/user');
        callHaventecSever('/authenticate/authentication/register/user', 'POST', request.payload, function(result)  {
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
        callHaventecSever('/authenticate/authentication/login', 'POST', request.payload, function(result)  {
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
        callHaventecSever('/authenticate/authentication/logout', 'POST', request.payload, function(result)  {
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
        callHaventecSever('/authenticate/authentication/logout', 'POST', request.payload, function(result)  {
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

        let email = request.payload.email;

        callHaventecSever('/authenticate/authentication/forgot-pin', 'POST', request.payload, function(result)  {
            let mailOptions = {
                from: fromAddress, to: email, subject: 'My App - Reset pin',
                text: 'Reset PIN code: ' + result.resetPinToken
            };

            if(result.resetPinToken !== undefined){
                sendEmail(mailOptions);
                // We do not want to send the resetPinToken back to the client;
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

        let email = request.payload.email;

        callHaventecSever('/authenticate/self-service/user', 'POST', request.payload, function(result)  {
            let mailOptions = {
                from: fromAddress, to: email, subject: 'My App - Activate your account',
                text: 'Activation code: ' + result.registrationToken
            };

            if(result.registrationToken !== undefined){
                sendEmail(mailOptions);
                // We do not want to send the registrationToken back to the client;
                result.registrationToken = '';
            }

            reply(result);
        });
    }
});

server.start(function (err) {
    console.log('Haventec Authenticate sample server started at: ' + server.info.uri);
    console.log('This server is NOT intended to be used in a Production environment.');
});

function sendEmail(options){
    transporter.sendMail(options, (error, info) => {
        if (error) {
            return console.log(error);
        }
    });
}

function callHaventecSever(path, method, payload, callback) {
    const postData = JSON.stringify(payload);
    const options = {
        hostname: haventecServerHost,
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
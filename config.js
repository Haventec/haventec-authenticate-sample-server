var config = {};

config.application = {};
config.server = {};
config.mail = {};

// This is your Haventec API key that is provided by Haventec Cloud Portal, https://cloudportal.haventec.com
config.application.apiKey = '53382e68-6d0b-4c71-ace2-197a8d82698f';

// The Haventec Authenticate Server domain
config.application.haventecServer = 'api.haventec.com';

// The host this server is to use, e.g localhost
// config.server.host = (process.env.IP || 'localhost');
config.server.port = (process.env.PORT || 3000);

// The mail server details
config.mail.host = 'smtp.gmail.com';
config.mail.port = 587;
config.mail.secure = false;
config.mail.username = 'smtp.relay@haventec.com';
config.mail.password = 'q*Xyr9nh*';
config.mail.fromAddress = '"Haventec" <no-reply@haventec.com>';

module.exports = config;

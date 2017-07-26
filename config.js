var config = {};

config.application = {};
config.server = {};
config.mail = {};

// This is your Haventec API key that is provided by Haventec Cloud Portal, https://cloudportal.haventec.com
config.application.apiKey = 'your-api-key';

// The Haventec Authenticate Sever domain
config.application.haventecSever = 'https://anbe-dev.aws.haventec.com';

// The host this server is to use, e.g localhost
config.server.host = 'localhost';
config.server.port = (process.env.PORT || 5000);

// The mail server details
config.mail.host = 'smtp.example.com';
config.mail.port = 456;
config.mail.secure = false;
config.mail.username = 'username@example.com';
config.mail.password = 'password';
config.mail.fromAddress = '"Name" <no-reply@example.com>';

module.exports = config;

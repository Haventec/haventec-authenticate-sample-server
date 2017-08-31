# Haventec Authenticate sample server

This is a sample server to demonstrate how to communicate with the Haventec Authenticate server.
This server is **NOT** intended to be used in a Production environment.

## Getting Started

Download the sample server from [GitHub Haventec](https://github.com/Haventec/haventec-authenticate-sample-server)

### Prerequisites

Install [NodeJS](https://nodejs.org)

Install [NPM](https://www.npmjs.com) 

### Installing

Install the dependencies
```
npm install
```

### Configure the server

Create a config file (rename the template file)
```
mv config.js.template config.js
```

Edit the config.js file
```
vi config.js
```

### Configure the mail server

This Sample server includes a mail module to send activation and reset tokens to your users

You can run this sample server without the mail module

Leave the mail configurations blank if you do not want to send emails
```
config.mail.host = ''
```

The activation and reset tokens will be outputted to the server console (not recommended for Production)

#### Testing your mail server

Call the test email endpoint
```
 http://localhost:8080/test-email?email=name@example.com
```

### Running

Start the server
```
npm start 
```

#### Testing your server

Go to
```
http://localhost:8080/
```

## Built With

* [Hapi JS](https://hapijs.com/) - The web server used
* [Nodemailler](https://nodemailer.com/about/) - The node email module

## Authors

* [Haventec](http://www.haventec.com/)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
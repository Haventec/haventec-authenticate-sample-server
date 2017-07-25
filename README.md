# Haventec Authenticate sample server

This is a sample server to demonstrate how to communicate with the Haventec Authenticate server.
This server is **NOT** intended to be used in a Production environment.

## Getting Started

### Prerequisites

Install [NodeJS](https://nodejs.org)

Install [NPM](https://www.npmjs.com) 

### Installing

Install the dependencies
```
npm install
```

### Running

Start the server
```
npm start apiKey host port mailServerHost mailServerPort mailServerSecure mailServerUsername mailServerPassword
```

Example
```
npm start 1-2-3-4 localhost 3000 smtp.example.com 456 true username@example.com password

```
Parameters:

* apiKey - This is your Haventec API key that is provided by [Haventec Cloud Portal](https://cloudportal.haventec.com)
* port - The port this server is to use, e.g 3000
* host - The host this server is to use, e.g localhost
* mailServerHost
* mailServerPort
* mailServerSecure - true for port 465, false for port 587
* mailServerUsername
* mailServerPassword

## Built With

* [Hapi JS](https://hapijs.com/) - The web server used
* [Nodemailler](https://nodemailer.com/about/) - The node email module

## Authors

* [Haventec](http://www.haventec.com/)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
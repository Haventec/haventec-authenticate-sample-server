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
npm start apiKey applicationId port host
```

Parameters:

apiKey - This is your Haventec API key that is provided by [Haventec Cloud Portal](https://cloudportal.haventec.com)

applicationId - This is your Haventec Application ID that is provided by [Haventec Cloud Portal](https://cloudportal.haventec.com)

port - The port this server is to use, e.g 3000

host - The host this server is to use, e.g localhost

## Built With

* [Hapi JS](https://hapijs.com/) - The web server used
* [h2o2](https://github.com/hapijs/h2o2) - The proxy middleware used

## Authors

* [Haventec](http://www.haventec.com/)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
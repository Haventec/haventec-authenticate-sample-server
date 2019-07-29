# Haventec Authenticate sample server

This is a sample server to demonstrate how to communicate with the Haventec Authenticate server.
This server is **NOT** intended to be used in a Production environment.

## Getting Started

Download the sample server from [GitHub Haventec](https://github.com/Haventec/haventec-authenticate-sample-server)

### Prerequisites

Install [NodeJS](https://nodejs.org)

Install [NPM](https://www.npmjs.com) 

### Installing

Install the dependencies within the root folder
```
npm install
```

### Configure the server

Create the config file 'config.js' based on 'config.js.template'

Linux / Mac:
```
cp config.js.template config.js
```

Windows: 
```
rem config.js.template config.js
```


Edit the file config.js to add the API Key of your application. 
Your API key is available in <a href="https://console-demo.haventec.com/" target="_blank">Haventec Console</a>
 
Linux / Mac:
```
vi config.js
```

Windows:
```
config.js
```

This is the API Key parameter at the 'config.js':
``` 
config.application.apiKey = 'xxxx-xxxx-xxxx-xxxx-xxxx';
```

### Configure the mail server (Optional)

This is optional, if you do not configure your mail server the activation and reset codes will also be outputted to the server console (not recommended for Production)
 
This Sample server includes a mail module to send activation and reset codes to your users

You can run this sample server without the mail module

Leave the mail configurations blank if you do not want to send emails
```
config.mail.host = ''
```

If you wish to use the mail functionality and do not have an existing mail server, you can create one for free: https://support.google.com/a/answer/176600?hl=en

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


## Running on AWS Lambda

In the config file set:

```
config.aws.lambda = true;
```

Zip up the following files

```
zip -r htss.zip node_modules index.js config.js
```

Upload the htss.zip to your AWS Lambda function


## Testing on AWS Lambda

Set the Lambda test event to

```
{
  "path": "/"
}
```

You should see a 200 response and no errors

To test your email set the Lambda test event to
```
{
  "path": "/test-email?email=your.email@example.com"
}
```

## Built With

* [Hapi JS](https://hapijs.com/) - The web server used
* [Nodemailler](https://nodemailer.com/about/) - The node email module

## Authors

* [Haventec](http://www.haventec.com/)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
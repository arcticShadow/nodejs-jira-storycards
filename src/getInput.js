var Input = {};

var Q = require("q");
var EventEmitter = require('events').EventEmitter;
var util = require('util');

util.inherits(Input, EventEmitter);

// Get a password from the console, printing stars while the user types
Input.getPassword = function(callback, prompt) {
  var current = this;
  var passwordReceivedCallback = function(data){
    current.emit('passwordCollected',data);
    if(typeof callback == 'function'){
      callback(data);
    }
  }
  getInput(passwordReceivedCallback, prompt, true);
};
Input.getInput = function(callback, prompt) {
  var current = this;
  var inputReceivedCallback = function(data){
    current.emit('inputCollected',data);
    if(typeof callback == 'function'){
      callback(data);
    }
  }
  getInput(inputReceivedCallback, prompt, false);

};

getInput = function(callback, prompt, obfuscate) {
  //var stdin = process.openStdin();
    //, tty = require('tty')

  if (callback === undefined) {
      callback = prompt;
      prompt = undefined;
  }
  if (prompt === undefined) {
      prompt = 'Password: ';
  }
  if (prompt) {
      process.stdout.write(prompt);
  }

  obfuscate = obfuscate || false;

  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.setRawMode(true);
  password = '';
  process.stdin.removeAllListeners('data');
  process.stdin.on('data', function (char) {
    char = char + ""

    switch (char) {
    case "\n": case "\r": case "\u0004":
      // They've finished typing their password
      process.stdin.setRawMode(false);
      process.stdout.write("\n");
      process.stdin.pause();
      callback(password);

      //process.exit()
      break
    case "\u0003":
      // Ctrl C
      console.log('Cancelled')
      process.exit()
      break
    default:
      // More characters
      if(obfuscate){
        process.stdout.write('*');
      } else {
        process.stdout.write(char);
      }
      password += char
      break
    }
  });
}

 Input.qGetInput = function(options) {
  var deferred = Q.defer();
  if(!options || options.prompt ==undefined|| options.obfuscate == undefined){
    err = new Error("No options in request. Options must contian 'obfuscate' and 'prompt'");
    deferred.reject(err);
  }

  getInput(function(value){
    deferred.resolve(value);
  }, options.prompt, options.obfuscate)

  return deferred.promise;

}

module.exports = Input;
/*jshint node: true */
'use strict';

/*
* qRequest - converting a request into a promise
*/
module.exports = function (options) {

    var Q = require('Q'),
        request = require('request');

	var deferred = Q.defer();
    if(!options){
    	var err = new Error('No options in request');
    	deferred.reject(err);
    }

    request(options, function (err, res, body) {
        if (err) {
            deferred.reject(new Error(err));
        } else if (res.statusCode !== 200) {
            var error = new Error('Unexpected status code: ' + res.statusCode);
            deferred.reject(error);
        }
        deferred.resolve(JSON.parse(body));

    });
	return deferred.promise;
};
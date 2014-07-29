
var request = require('request');
var _ = require('underscore');
var Q = require("q");
var PDFDocument = require('pdfkit');
var fs = require('fs');
var nconf = require('nconf');

// Setup NConf]
nconf.argv().env().file({ file: 'config.json' })

var log  = function(data){
	console.log(data);
};


var i = require('./src/getInput');

var Input = new i.Input();

var user = nconf.get('user'),
	pass = nconf.get('password'),
	jql = nconf.get('jql');


var getUserPromise = function(){

	if(user) {
		return user;
	} else {
		return Input.qGetInput({
			obfuscate: false,
			prompt: 'Jira User: '
		});
	}
}
var getPasswordPromise = function(){

	if(pass) {
		return pass;
	} else {
		return Input.qGetInput({
			obfuscate: true,
			prompt: 'Jira Password: '
		});
	}
}
var getJQLPromise = function(){

	if(jql) {
		return jql;
	} else {
		return Input.qGetInput({
			obfuscate: false,
			prompt: 'JQL: '
		});
	}
}

//Start Promises

Q(getUserPromise())
.then(function(u){
	user = u;
	return getPasswordPromise();
}).then(function(p){
	pass = p;
	return getJQLPromise();
}).then(function(j){
	jql = j;
	getJiraCards();
});




var jiraURL = 'http://jira.orion.internal/';

// field name of epic
var epicField;
//issue list
var issues;

//NA Cards
//size: [	 12.7 / 2.54 * 72, // 2.54 to convert cm to inch
				//		 7.6 / 2.54* 72 ], // *72 for pdf pixels as per documentation
var sizeArray = [	21 / 2.54 * 72, 	// 2.54 to convert cm to inch
			 		14.8 / 2.54* 72 ];	// *72 for pdf pixels as per documentation
function getJiraCards(){

	var requestArgs = {
		'method': 'GET',
	};

	requestArgs.auth= {
      'user': user,
      'pass': pass,
      'sendImmediately': true
  	};

    var uri = jiraURL + 'rest/api/2/';

	qRequest( _.extend({'url': uri + 'field'}, requestArgs) )
	.then(function(data){
		epicField = _.findWhere(data,{'name':'Epic Link'}).id;
		pointsField = _.findWhere(data,{'name':'Story Points'}).id;

		return qRequest(_.extend({
			'url': uri + 'search?jql='
	            	+ jql
			   + '&fields=id,key,issuetype,summary,project' + epicField + ',' + pointsField + ',description'
		}, requestArgs));
	})
	.then(function(data){
		issues = data.issues;
		var pdfDoc = new PDFDocument({

				size: sizeArray,
				margin: 10
			});
		pdfDoc.pipe( fs.createWriteStream('cards.pdf') );


 		_.each(issues, function(issue, index, list){

			// organise points or placeholder
			var points = issue.fields[pointsField]?(issue.fields[pointsField] + " points"):"No Points Assigned";

			//pdfDoc.text("Key: " + issue.key );
			pdfDoc.fontSize(20);
			pdfDoc.text(issue.fields.summary,{
				width: 17 / 2.54 * 72
			});
			pdfDoc.fontSize(16);
			pdfDoc.text(
				"(" + issue.fields.issuetype.name +") " +
				//"" + issue.key + " | " +
				points);
			pdfDoc.moveDown();
			pdfDoc.fontSize(14);
			pdfDoc.text((issue.fields.description||"").replace(new RegExp("\r",'g'),""));

			pdfDoc.fontSize(20);
			pdfDoc.text(issue.key, 10, 10, {align:'right'});
			//console.log(issue.fields);

			// add new page if required
			if(index != list.length - 1)
			pdfDoc.addPage({
				size: sizeArray,
				margin: 10
			});
		});
		pdfDoc.end();
	})
	.done();

}







function qRequest(options) {
	var deferred = Q.defer();
    if(!options){
    	err = new Error("No options in request");
    	deferred.reject(err);
    }

    request(options, function (err, res, body) {
        if (err) {
            deferred.reject(new Error(err));
        } else if (res.statusCode !== 200) {
            err = new Error("Unexpected status code: " + res.statusCode);
            deferred.reject(err);
        }
        deferred.resolve(JSON.parse(body));

    });
	return deferred.promise;

}


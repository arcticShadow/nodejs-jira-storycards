
var request = require('request');
var _ = require('underscore');
var Q = require("q");
var PDFDocument = require('pdfkit');
var fs = require('fs');

var log  = function(data){
	console.log(data);
};


var i = require('./src/getInput');

var Input = new i.Input();

var user, pass;

Input.on('inputCollected',function(u){
	user = u;
	Input.getPassword(null, 'Jira Passowrd for ' + user + ': ');
});
Input.on('passwordCollected',function(p){
	pass = p;
	// List Jira Projects
	
	//list issues
	listJiraIssues();
});

// Kick Things off.
Input.getInput(null, 'Jira User: ');


var jiraURL = 'https://netactive.atlassian.net/';
requestArgs = {
	'method': 'GET',
};
// field name of epic
var epicField;
//issue list
var issues;

//listJiraIssues();


function listJiraIssues(){

	
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
                       + 'sprint%20%3D%205%20and%20status%20in(%20ready%2C%20"To%20Do"%2C"Work%20In%20Progress"%2C%20Open%20)%20and%20issuetype%20%3D%20story'
	            	   + '&fields=id,key,issuetype,summary,project' + epicField + ',' + pointsField + ',description'
		}, requestArgs));
	})
	.then(function(data){
		issues = data.issues;
		var pdfDoc = new PDFDocument({
				size: [	 12.7 / 2.54 * 72, // 2.54 to convert cm to inch
						 7.6 / 2.54* 72 ], // *72 for pdf pixels as per documentation
				margin: 10
			});
		pdfDoc.pipe( fs.createWriteStream('cards.pdf') );
		
		
 		_.each(issues, function(issue, index, list){
			
			// organise points or placeholder
			var points = issue.fields[pointsField]?(issue.fields[pointsField] + " points"):"No Points Assigned";

			//pdfDoc.text("Key: " + issue.key );
			pdfDoc.fontSize(16);
			pdfDoc.text(issue.fields.summary);
			pdfDoc.fontSize(8);
			pdfDoc.text(
				"(" + issue.fields.issuetype.name +") " +
				//"" + issue.key + " | " +
				points);
			pdfDoc.moveDown();
			pdfDoc.text((issue.fields.description||"").replace(new RegExp("\r",'g'),""));
			
			pdfDoc.fontSize(16);
			pdfDoc.text(issue.key, 10, 10, {align:'right'});
			//console.log(issue.fields);

			// add new page if required
			if(index != list.length - 1)
			pdfDoc.addPage({
				size: [	 12.7 / 2.54 * 72, // 2.54 to convert cm to inch
						 7.6 / 2.54* 72 ], // *72 for pdf pixels as per documentation
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


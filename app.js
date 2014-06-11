
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

var user, pass, jql;

Input.once('inputCollected',function(u){
	user = u;
	Input.getPassword(null, 'Jira Passowrd for ' + user + ': ');
});
Input.once('passwordCollected',function(p){
	pass = p;
	// List Jira Projects
	
        Input.once('inputCollected',function(j){
 		jql = j;
		//list issues
		listJiraIssues();
        });
	Input.getInput(null, 'Jira JQL: ');
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
                       //+ 'key%3DWU-30%20or%20key%20%3D%20WU-33%20or%20key%20%3D%20WU-38%20or%20key%20%3D%20WU-39'
	            	+ jql
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


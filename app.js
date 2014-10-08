/*jshint node: true */
'use strict';
var request = require('request'),
	_ = require('underscore'),
	Q = require('q'),
	PDFDocument = require('pdfkit'),
	fs = require('fs'),
	nconf = require('nconf'),
	I = require('./src/getInput'),
	qRequest = require('./src/qRequest'),
	colors = require('colors');

// Setup NConf
nconf.argv().env().file({ file: 'config.json' });

nconf.defaults({
	'jiraAPIPath': 'rest/api/2/'
});



//var Input = new i.Input();

var user = nconf.get('user'),
	pass = nconf.get('password'),
	jql = nconf.get('jql');

var getUserPromise = function(){

	if(user) {
		return user;
	} else {
		return I.qGetInput({
			obfuscate: false,
			prompt: 'Jira User: '
		});
	}
};

var getPasswordPromise = function(){
	if(pass) {
		return pass;
	} else {
		return I.qGetInput({
			obfuscate: true,
			prompt: 'Jira Password: '
		});
	}
};

var getJQLPromise = function(){

	if(jql) {
		return jql;
	} else {
		return I.qGetInput({
			obfuscate: false,
			prompt: 'JQL: '
		});
	}
};

var sizeArray = [	21 / 2.54 * 72, 	// 2.54 to convert cm to inch
			 		14.8 / 2.54* 72 ];	// *72 for pdf pixels as per documentation








function getJiraCardsPromise(){

	var requestArgs = {
		'method': 'GET',
		'auth': {
	    	'user': user,
			'pass': pass,
      		'sendImmediately': true
      	}
  	};

	var fields = {};

    var uri = nconf.get('jiraBaseURL') + nconf.get('jiraAPIPath');

	var jiraPromise = qRequest( _.extend({'url': uri + 'field'}, requestArgs) );

	jiraPromise.then(function(data){
		_.each(data, function(field) {
			fields[field.id] = field.name;
		});

		return qRequest(_.extend({
			'url': uri + 'search?jql=' + jql
		}, requestArgs));
	})
	.then(function(returnList){
		var issues = returnList.issues;

		var pdfDoc = new PDFDocument({
			size: sizeArray,
			margin: 10
		});



		pdfDoc.pipe( fs.createWriteStream('cards.pdf') );

 		_.each(issues, function(issue, index, list){

 			_.each(issue.fields, function(field, key){
 				issue.fields[fields[key]] = field;
 			});

 			// need to convert local image to remote image
 			//pdfDoc.image(issue.fields.issuetype.iconUrl, 0, 0);

 			// Print Parent Key
 			if(issue.fields.parent !== undefined ){
 				pdfDoc
 					.rotate(270, {origin: [0,0]})
 					.text('Parent: ' + issue.fields.parent.key, -200,10,{width:200});
 				pdfDoc.rotate(90, {origin: [0,0]}).moveTo(10, 10);
 				pdfDoc.text(" ",50,10);
 				pdfDoc.moveUp();

			}
			// organise points or placeholder
			var points = issue.fields['Backlog Estimate'] ? (issue.fields['Backlog Estimate'] + ' points') : 'No Points Assigned';


			pdfDoc.fontSize(20);
			pdfDoc.text(issue.fields.summary,{
				width: 15 / 2.54 * 72
			});
			pdfDoc.fontSize(10);
			pdfDoc.text(
				'(' + issue.fields.issuetype.name +') ' +
				points);
			pdfDoc.text('Status: ' + issue.fields.status.name);
			//pdfDoc.text("  Resoultion: " + issue.fields.resoultion);

			pdfDoc.moveDown();
			pdfDoc.fontSize(14);
			pdfDoc.text((issue.fields.description||'').replace(new RegExp('\r','g'),''));

			pdfDoc.fontSize(20);
			pdfDoc.text(issue.key, 10, 10, {align:'right'});

			// add new page if required
			if(index != list.length - 1) {
				pdfDoc.addPage({
					size: sizeArray,
					margin: 10
				});
			}
		});
		pdfDoc.end();

	}).catch(function(error){
		console.log("Shit Happened".red.bold);
		console.log("=============".red.bold);
		console.log(error);
	});

	return jiraPromise;

}

//Start Promise's
new Q(getUserPromise())
.then(function(u){
	user = u;
	return getPasswordPromise();
}).then(function(p){
	pass = p;
	return getJQLPromise();
}).then(function(j){
	jql = j;
	return getJiraCardsPromise();
}).catch(function (error) {
    console.log(error);
})
.done();


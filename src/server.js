var express = require('express');
var app = express();
var mysql = require('mysql');
var bodyParser = require('body-parser');
var validator = require('aadhaar-validator');
var SHA256 = require('crypto-js/sha256');
var today = new Date();
var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
var time = today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
var dateTime = date + ' ' + time;
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

class Block {
	constructor(index, timestamp, data, previoushash = '') {
		this.index = index;
		this.timestamp = timestamp;
		this.data = data;
		this.previoushash = previoushash;
		this.hash = this.calculateHash();
	}

	calculateHash() {
		return SHA256(this.index + this.timestamp + this.previoushash + JSON.stringify(this.data)).toString();
	}
}

class BlockChain {
	constructor() {
		this.chain = [ this.createGenesisBlock() ];
	}
	createGenesisBlock() {
		return new Block(0, this.dateTime, 'Genesis Block', '0');
	}
	getLatestBlock() {
		return this.chain[this.chain.length - 1];
	}
	addBlock(newBlock) {
		newBlock.previoushash = this.getLatestBlock().hash;
		newBlock.hash = newBlock.calculateHash();
		this.chain.push(newBlock);
	}
}

let savejeecoin = new BlockChain();

var mysqlConnection = mysql.createConnection({
	host: 'ticketing.cpvubvpsiihe.us-east-1.rds.amazonaws.com',
	user: 'admin',
	password: 'vishalvinod',
	database: 'ticketing'
});

mysqlConnection.connect((err) => {
	if (!err) console.log('Connection succeeded.');
	else console.log('Unsuccessful \n Error : ' + JSON.stringify(err, undefined, 2));
});

app.post('/error', function(req, res) {
	res.writeHead(200, { 'content-type': 'text/html' });
	res.write(
		'<!DOCTYPE html> <head></head>  <body>  <h1>           Please Enter a Valid Amount For Recharge</h1></body>'
	);
});

app.post('/entry', function(req, res) {
	res.writeHead(200, { 'content-type': 'text/html' });
	var aadhar = req.body.aadharno;
	var amount = req.body.amount;
	var re = 'uid="(.*?)"';
	var found = aadhar.match(re);
	var json = '';
	var here1;
	var here2;
	var check = validator.isValidNumber(found[1]);
	// var check = validator.isValidNumber(aadhar);
	if (check) {
		console.log('Valid Number ' + found[1]);

		var here = mysqlConnection.query(
			'select count(*) as count from wallet where aadhar_no = ?',
			[ found[1] ],
			function(err, rows, fields) {
				//if (err) throw err;

				var string = JSON.stringify(rows);

				json = JSON.parse(string);
				here1 = json[0].count;
				if (1 == here1) {
					mysqlConnection.query('select balance from wallet where aadhar_no = ?', [ found[1] ], function(
						err,
						rows,
						fields
					) {
						var string = JSON.stringify(rows);
						json = JSON.parse(string);
						here2 = json[0].balance;
						var convert = +here2 + +amount;
						console.log('>> Balance ' + convert);
						var temp = found[1] + ' added  ' + amount;
						savejeecoin.addBlock(new Block(found[1], dateTime, { temp }));
						mysqlConnection.query('update wallet set balance = ? where aadhar_no = ?', [
							convert,
							found[1]
						]);

						res.write(
							'<!DOCTYPE html> <head></head>  <body>  <h1>            Hello, ' +
								found[1] +
								'</h1> <br><h1>Your Wallet Balance is Rs.' +
								convert +
								'</h1></body>'
						);
					});

					console.log('Existing user');
				} else {
					console.log(here1);
					mysqlConnection.query('insert into wallet(aadhar_no,balance) values(?,?)', [ found[1], amount ]);
					console.log(found[1], amount);
					var temp = found[1] + ' added ' + amount;
					savejeecoin.addBlock(new Block(found[1], dateTime, { temp }));
					res.write(
						'<!DOCTYPE html> <head></head>  <body>  <h1>            Hello, ' +
							found[1] +
							'</h1> <br><h1>Your Wallet Balance is Rs.' +
							amount +
							'</h1></body>'
					);
					console.log('New User');
				}
			}
		);

		console.log(JSON.stringify(savejeecoin, null, 4));
		//savejeecoin.addBlock(new Block(found[1], dateTime, { amount: 10 }));
	} else {
		// console.log("Invalid AADHAR no. " + found[1]);
		console.log('Invalid AADHAR no. ' + aadhar);
	}
	// res.write("Submitted Succesfully");
});
app.listen(8002);

'use strict';

/* Magic Mirror
 * Module: MMM-RNV
 *
 * By Stefan Krause http://yawns.de
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
var request = require('request');
var moment = require('moment');
var xmlp = require('fast-xml-parser');

module.exports = NodeHelper.create({

	start: function() {
		this.started = false;
		this.config = null;
		this.stationNames = {};
	},

	getData: function() {
		var self = this;
		
		self.getStations();
		
		var currentDate = moment().format('D.MM.YYYY  H:m:s');
		var thisTime = new Date().getTime();
		var stationIDs = this.config.stationIDs.split(",");
		
		for(var i = 0; i < stationIDs.length; i++) {
			var myUrl = this.config.apiBase + this.config.requestURL + '?hafasID=' + stationIDs[i] + '&time=' + encodeURIComponent(currentDate) + '&transportFilter=alle' + '&jQuery=1' + '&callback=giveMyData';
			
			request({
				url: myUrl,
				method: 'GET'
			}, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					function giveMyData(json) {
						return json;
					}
					
					body = eval(body);
					body.stationID = this.req.path.split("hafasID=")[1].split("&")[0];
					body.stationName = self.getStationFromId(body.stationID);
					
					self.sendSocketNotification("DATA", body);
				}
			});
		}

		setTimeout(function() { self.getData(); }, this.config.refreshInterval);
	},

	socketNotificationReceived: function(notification, payload) {
		var self = this;
		if (notification === 'CONFIG' && self.started == false) {
			self.config = payload;
			self.sendSocketNotification("STARTED", true);
			self.getData();
			self.started = true;
		}
	},
	
	getStations: function() {
		var self = this;
		request({
			url: "https://opendata.rnv-online.de/sites/default/files/Haltestellen_16.xml",
			method: 'GET'
		}, function(error, response, body) {
			let parsedData = xmlp.parse(body, {ignoreAttributes: false});
			for(var i = 0; i < parsedData.stations.station.length; i++) {
				let station = parsedData.stations.station[i];
				self.stationNames[station['@_id']] = station['@_name'];
			}
		});
	},
	
	getStationFromId: function(id) {
		return this.stationNames[id];
	}
});

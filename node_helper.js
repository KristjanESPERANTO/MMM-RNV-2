'use strict';

/* Magic Mirror
 * Module: MMM-RNV
 *
 * By Stefan Krause http://yawns.de
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
var axios = require('axios');

module.exports = NodeHelper.create({
	start: function() {
		this.started = false;
		this.config = null;
		this.stationNames = {};
	},

	getData: function() {
		var self = this;
		
		var stationIDs = this.config.stationIDs.split(",");
		
		for(var i = 0; i < stationIDs.length; i++) {
			let stationID;
			if(stationIDs[i].match(new RegExp(/^\d+$/))) {
				stationID = "de:08222:" + stationIDs[i];
			} else {
				stationID = stationIDs[i];
			}
			var myUrl = this.config.apiBase + this.config.requestURL + '?coordOutputFormat=EPSG:4326&depType=stopEvents&includeCompleteStopSeq=1&limit=' + this.config.departuresCount + '&locationServerActive=1&mode=direct&outputFormat=json&type_dm=any&useOnlyStops=1&useRealtime=1&name_dm=' + stationID;
			
			axios.get(myUrl).then(response => {
				if (response.status == 200) {
					self.sendSocketNotification("DATA", response.data);
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
	}
});

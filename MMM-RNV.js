/* global Module */

/* Magic Mirror
 * Module: MMM-RNV
 *
 * By Stefan Krause http://yawns.de
 * MIT Licensed.
 */

Module.register('MMM-RNV',{
	
	defaults: {
		apiKey: "",
		units: config.units,
		animationSpeed: 1000,
		refreshInterval: 1000 * 60, //refresh every minute
		updateInterval: 1000 * 3600, //update every hour
		timeFormat: config.timeFormat,
		lang: config.language,

		initialLoadDelay: 0, // 0 seconds delay
		departuresCount: 10,
		retryDelay: 2500,
		apiBase: 'https://rnv.tafmobile.de/easygo2/rest',
		requestURL: '/regions/rnv/modules/stationmonitor/element',
		stationIDs: '',
		
		iconTable: {
			"KOM": "fa fa-bus",
			"STRAB": "fa fa-subway"
		},
	},
	
	// Define required scripts.
	getScripts: function() {
		return ["moment.js", "font-awesome.css"];
	},
	
	getStyles: function() {
		return ['MMM-RNV.css'];
	},

	start: function() {
		Log.info('Starting module: ' + this.name);
		this.loaded = false;
		this.sendSocketNotification('CONFIG', this.config);
	},

	getDom: function() {
		var wrapper = document.createElement("div");

		if (this.config.stationIDs === "") {
			wrapper.innerHTML = "No RNV <i>stationIDs</i> set in config file.";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		if (!this.loaded) {
			wrapper.innerHTML = this.translate('LOADING');
			wrapper.className = "dimmed light small";
			return wrapper;
		}
		
		var stationIDs = this.config.stationIDs.split(",");
		for(var j = 0; j < stationIDs.length; j++) {
			if(j > 0) {
				wrapper.appendChild(document.createElement("br"));
			}
			
			var stationID = stationIDs[j];
			
			var stationHeader = document.createElement("header");
			stationHeader.className = "module-header";
			stationHeader.innerHTML = this.stationName[stationID];
			wrapper.appendChild(stationHeader);
			
			if (!this.departures[stationID] || !this.departures[stationID].length) {
				wrapper.insertAdjacentHTML('beforeend', '<span class="dimmed light small">No data</span><br />');
				continue;
			}
		
			var table = document.createElement("table");
			table.id = "rnvtable-" + stationID;
			table.className = "small thin light";
			
			var row = document.createElement("tr");

			var timeHeader = document.createElement("th");
			timeHeader.innerHTML = "Abfahrt";
			timeHeader.className = "rnvheader";
			row.appendChild(timeHeader);
			var lineHeader = document.createElement("th");
			lineHeader.innerHTML = "Linie";
			lineHeader.className = "rnvheader";
			lineHeader.colSpan = 2;
			row.appendChild(lineHeader);
			var destinationHeader = document.createElement("th");
			destinationHeader.innerHTML = "Fahrtrichtung";
			destinationHeader.className = "rnvheader";
			row.appendChild(destinationHeader);		
			table.appendChild(row);
			
			for (var i = 0; i < this.departures[stationID].length && i < this.config.departuresCount; i++) {
				var currentDeparture = this.departures[stationID][i];
				var row = document.createElement("tr");
				table.appendChild(row);
				
				var cellDeparture = document.createElement("td");
				cellDeparture.innerHTML = currentDeparture.time;
				cellDeparture.className = "timeinfo";
				if (currentDeparture.delay > 0) {
					var spanDelay = document.createElement("span");
					spanDelay.innerHTML = ' +' + currentDeparture.delay;
					spanDelay.className = "small delay";
					cellDeparture.appendChild(spanDelay);
				}
				row.appendChild(cellDeparture);

				var cellTransport = document.createElement("td");
				cellTransport.className = "timeinfo";
				var symbolTransportation = document.createElement("span");
				symbolTransportation.className = this.config.iconTable[currentDeparture.transportation];
				cellTransport.appendChild(symbolTransportation);
				row.appendChild(cellTransport);
				
				var cellLine = document.createElement("td");
				cellLine.innerHTML = currentDeparture.lineLabel;
				cellLine.className = "lineinfo";
				row.appendChild(cellLine);
				
				var cellDirection = document.createElement("td");
				cellDirection.innerHTML = currentDeparture.direction;
				cellDirection.className = "destinationinfo";
				row.appendChild(cellDirection);			
			}
			wrapper.appendChild(table);
				
			if (this.ticker[stationID]) {
				var marqueeTicker = document.createElement("marquee");
				marqueeTicker.innerHTML = this.ticker[stationID];
				marqueeTicker.className = "small thin light";
				marqueeTicker.width = document.getElementsByClassName("module MMM-RNV MMM-RNV")[0].offsetWidth;
				wrapper.appendChild(marqueeTicker);
			}
		}

		return wrapper;
	},

	processDepartures: function(data) {
		var stationID = data.stationID;
		
		if (!data.listOfDepartures) {
			return;
		}
		
		if(!this.departures) {
			this.departures = {};
		}
		this.departures[stationID] = [];
		if(!this.ticker) {
			this.ticker = {};
		}
		this.ticker[stationID] = data.ticker;
		if(!this.stationName) {
			this.stationName = {};
		}
		this.stationName[stationID] = data.stationName;
		
		for (var i in data.listOfDepartures) {
			var t = data.listOfDepartures[i];
			if ((t.time).indexOf(' ') > 0) { // time contains a date because it is not today
				t.time = (t.time).substring((t.time).indexOf(' ')+1, (t.time).length);
			}
			this.departures[stationID].push({
				time: (t.time).substring(0,5),
				delay: (((t.time).indexOf('+') > 0) ? (t.time).substring(6,(t.time).length) : 0),
				lineLabel: t.lineLabel,
				direction: t.direction,
				status: t.status,
				statusNote: t.statusNote,
				transportation: t.transportation,
			});
				
		}
		
		return;
	},
	
 	socketNotificationReceived: function(notification, payload) {
    		if (notification === "STARTED") {
				this.updateDom();
			}
			else if (notification === "DATA") {
				this.loaded = true;
				this.processDepartures(payload);
				this.updateDom();
    		}
	} 	

});

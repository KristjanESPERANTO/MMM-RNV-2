/* global Module */

/* Magic Mirror
 * Module: MMM-RNV
 *
 * By Stefan Krause http://yawns.de
 * MIT Licensed.
 */

Module.register('MMM-RNV', {
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
		apiBase: 'https://vrn.de/mngvrn/',
		requestURL: 'XML_DM_REQUEST',
		stationIDs: '',
		
		iconTable: {
			"KOM": "fa fa-bus",
			"STRAB": "fa fa-subway",
			"Bus": "fa fa-bus",
			"Straßenbahn": "fa fa-subway",
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
		
		let self = this;
		var stationCounter = 0;
		Object.keys(this.departures).sort().forEach(stationID => {
			if(stationCounter++ > 0) {
				wrapper.appendChild(document.createElement("br"));
			}
			
			var stationHeader = document.createElement("header");
			stationHeader.className = "module-header";
			stationHeader.innerHTML = self.stationName[stationID];
			wrapper.appendChild(stationHeader);
			
			if (!self.departures[stationID] || !self.departures[stationID].length) {
				wrapper.insertAdjacentHTML('beforeend', '<span class="dimmed light small">No data</span><br />');
				return;
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
			
			for (var i = 0; i < self.departures[stationID].length && i < self.config.departuresCount; i++) {
				var currentDeparture = self.departures[stationID][i];
				var row = document.createElement("tr");
				table.appendChild(row);
				
				let myTime = { ... currentDeparture.time };
				myTime.month -= 1; // js counts months from 0
				let myMoment = moment(myTime);

				var cellDeparture = document.createElement("td");
				if(myMoment.isSame(new Date(), 'day')) {
					cellDeparture.innerHTML = myMoment.format('LT');
				} else {
					cellDeparture.innerHTML = myMoment.calendar();
				}
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
				symbolTransportation.className = self.config.iconTable[currentDeparture.transportation];
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
				
			if (self.ticker[stationID]) {
				var marqueeTicker = document.createElement("marquee");
				marqueeTicker.innerHTML = self.ticker[stationID];
				marqueeTicker.className = "small thin light";
				marqueeTicker.width = document.getElementsByClassName("module MMM-RNV MMM-RNV")[0].offsetWidth;
				wrapper.appendChild(marqueeTicker);
			}
		});

		return wrapper;
	},

	processDepartures: function(data) {
		var stationID = data.dm.input.input;
		
		if (!data.departureList) {
			return;
		}
		
		if(!this.departures) {
			this.departures = {};
		}
		this.departures[stationID] = [];
		if(!this.ticker) {
			this.ticker = {};
		}
		this.ticker[stationID] = data.dm.points.point.infos || '';
		if(!this.stationName) {
			this.stationName = {};
		}
		this.stationName[stationID] = data.dm.points.point.name;
		
		for (var i in data.departureList) {
			var t = data.departureList[i];
			var statusNote;
			if(!!t.lineInfos && t.lineInfos.length > 0) {
				statusNote = t.lineInfos.pop();
			}
			
			this.departures[stationID].push({
				time: t.dateTime,
				delay: t.servingLine.delay,
				lineLabel: t.servingLine.symbol,
				direction: t.servingLine.direction,
				countdown: t.countdown,
				statusNote: statusNote,
				transportation: t.servingLine.name,
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

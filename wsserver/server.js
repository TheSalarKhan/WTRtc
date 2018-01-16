var WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({host:'0.0.0.0',port: 7999});

function getTheOtherClient(clients, client) {
	for(var i=0;i<clients.length;i++) {
		if(clients[i] != client)
			return clients[i];
	}
	return null;
}

var chat = {
	clients: new Array(),
	
	run: function(){
		wss.on('connection', function(ws) {
			console.log('Got conection!!');
			try {
				if(chat.clients.length < 2) {
					chat.clients.push(ws);
				}
				ws.on('message', function(message) {
					console.log('received: %s', message);
					theOtherClient = getTheOtherClient(chat.clients, ws);
					if(theOtherClient != null) {
						theOtherClient.send(message);
					}
				});
				ws.on('close', function() {
					chat.removeClient(ws);
					ws.close();
				});
			
				ws.on('error', function(err) {
					console.log("Received an error: ");
					console.log(err);
					ws.close();
				});
			} catch(error) {
				console.log("There was an error");
			}
		});
	
	},
	
	removeClient: function(ws){
		for(i = 0; i < chat.clients.length; i++){
			if(chat.clients[i] === ws){
				chat.clients.splice(i,1);
				console.log('remove client');
			}
		}
	}
}

chat.run();


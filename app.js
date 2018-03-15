const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);


app.get("/", (req, res) => {
	res.sendFile(__dirname + "/public/index.html");
});

app.use(express.static('public'));

var users = [];

io.on('connection', (socket) => {
	socket.on('new user', (name, color) => {
		io.emit('chat message', {
			username: name,
			message: 'has connected',
			color: color
		});
		socket.username = name;
		socket.color = color;
		users.push(name);
		io.emit('online user', {
			users: users, 
			color: color,
			connected: true
		});
	});

	socket.on('disconnect', () => {
		io.emit('chat message', {
			username: socket.username,
			message: 'has disconnected',
			color: socket.color
		});
		users.splice(users.indexOf(socket.username), 1);
		socket.broadcast.emit('online user', {
			users: [socket.username],
			color: socket.color,
			connected: false
		});
	});

	socket.on('chat message', (msg) => {
		socket.broadcast.emit('chat message', {
			username: socket.username,
			message: msg,
			color: socket.color
		});
	});

	// when the client emits 'typing', we broadcast it to others
	socket.on('typing', function () {
		socket.broadcast.emit('typing', {
			username: socket.username,
			color: socket.color
		});
	});

	// when the client emits 'stop typing', we broadcast it to others
	socket.on('stop typing', function () {
		socket.broadcast.emit('stop typing', {
			username: socket.username,
			color: socket.color
		});
	});
});

http.listen(3000, () => {
	console.log(`listening on *:3000`);
});

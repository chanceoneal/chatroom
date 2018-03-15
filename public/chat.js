$(() => {
	const TYPING_TIMER = 500; // milliseconds
	var names = [
		"Doc", "Grumpy", "Happy", "Sleepy", "Dopey", "Bashful", "Sneezy", "Bobby", "Gambino", "Dwight", "Egbert", "Eustace", "Cora", "Teddy", "Ursala"
	];
	// Red, Green, Orange, Brown, Pink, Purple
	var colors = ["#db0000", "#00bd4f", "#f7882f", "#4b3434", "#f222ff", "#8c1eff"];
	var socket = io(),
		$window = $(window),
		$messages = $('#messageArea'),
		$mInput = $('#m'),
		$onlineUsers = $('#userContainer'),
		connected = false,
		typing = false,
		totalUsers = 0,
		lastTypingTime, username, timer, userColor;

	swal({
		title: 'What is your name?',
		input: 'text',
		inputPlaceholder: 'Enter your name or nickname',
		showCancelButton: false,
		allowOutsideClick: false,
		inputValidator: function (value) {
			return new Promise(function (resolve, reject) {
				if (value) {
					resolve();
				} else {
					reject('You need to write something!');
				}
			});
		}
	}).then(function (name) {
		username = name;
		userColor = colors[Math.floor(Math.random() * colors.length)];
		connected = true;
		socket.emit('new user', username, userColor);
	}, function (dismiss) {
		username = names[Math.floor(Math.random() * names.length)];
		userColor = colors[Math.floor(Math.random() * colors.length)];
		connected = true;
		socket.emit('new user', username, userColor);
	});

	$window.keydown((event) => {
		if (!(event.ctrlKey || event.metaKey || event.altKey) && connected) {
			$mInput.focus();
		}

		if (event.which === 13) {
			sendMessage();
			socket.emit('stop typing');
			typing = false;
		}
	});

	$mInput.on('input', function () {
		updateTyping();
	});

	function sendMessage() {
		var message = $mInput.val();

		if (message) {
			$mInput.val('');
			addMessage({
				username: username,
				message: message,
				color: userColor
			});
			socket.emit('chat message', message, userColor);
		}
	}

	function addMessage(data) {
		var $typingMessages = getTypingMessages(data);
		// options = options || {};
		if ($typingMessages.length !== 0) {
			// options.fade = false;
			$typingMessages.remove();
		}

		var $usernameDiv = $('<span class="username"/>')
			.text(data.username)
			.css('color', data.color);
		var $messageBodyDiv = $('<span class="messageBody">')
			.text(data.message);

		var typingClass = data.typing ? 'typing' : '';
		var $messageDiv = $('<li class="message"/>')
			.data('username', data.username)
			.addClass(typingClass)
			.append($usernameDiv, $messageBodyDiv);

		$messages.append($messageDiv);
		$messages.scrollTop($messages[0].scrollHeight);
	}

	// Gets the 'X is typing' messages of a user
	function getTypingMessages(data) {
		return $('.typing.message').filter(index => {
			return $(this).data('username') === data.username;
		});
	}

	// Adds the visual chat typing message
	function addChatTyping(data) {
		data.typing = true;
		data.message = 'is typing';
		addMessage(data);
	}

	function removeChatTyping(data) {
		getTypingMessages(data).fadeOut(function () {
			$(this).remove();
		});
	}

	socket.on('chat message', (data) => {
		addMessage(data);
	});

	// Updates the typing event
	function updateTyping() {
		if (connected) {
			if (!typing) {
				typing = true;
				socket.emit('typing');
			}
			lastTypingTime = (new Date()).getTime();

			setTimeout(function () {
				var typingTimer = (new Date()).getTime();
				var timeDiff = typingTimer - lastTypingTime;
				if (timeDiff >= TYPING_TIMER && typing) {
					socket.emit('stop typing');
					typing = false;
				}
			}, TYPING_TIMER);
		}
	}

	// Whenever the server emits 'typing', show the typing message
	socket.on('typing', function (data) {
		addChatTyping(data);
	});

	// Whenever the server emits 'stop typing', kill the typing message
	socket.on('stop typing', function (data) {
		removeChatTyping(data);
	});

	socket.on('online user', function (data) {
		if (data.connected) {
			totalUsers++;
			var users = jQuery.grep(data.users, (dataUsername, index) => {
				return dataUsername !== username;
			});

			users.forEach(dataUsername => {
				console.log(getOfflineUser(dataUsername));
				var $usernameItem = $('<a class="dropdown-item onlineUser" href="#"></a>');
				if (dataUsername === username) {
					$usernameItem.text(`${username} (You)`).data('username', username).css('color', data.color);
				} else {
					$usernameItem.text(dataUsername).data('username', dataUsername).css('color', data.color);
				}
				$onlineUsers.append($usernameItem);

			});
		} else {
			console.log("Disconnecting...");
			getOfflineUser(data.users[0]).fadeOut(() => {
				$(this).remove();
			});
		}
	});

	function getOfflineUser(username) {
		return $('.dropdown-item').filter(index => {
			return $(this).data('username') === username;
		});
	}
});
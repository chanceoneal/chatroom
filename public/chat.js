$(() => {
	const TYPING_TIMER = 500; // milliseconds
	var names = [
		"Doc", "Grumpy", "Happy", "Sleepy", "Dopey", "Bashful", "Sneezy", "Bobby", "Gambino",
		"Dwight", "Egbert", "Eustace", "Cora", "Teddy", "Ursala"
	];
	var colors = [
		"#39362E", "#C57819", "#DC9028", "#A6C3D7", "#6B8395", "#131011", "#673249", "#DC153F",
		"#F694B3", "#DD399E", "#6D5837", "#9D794D", "#B18C5F", "#C2A68B", "#77748A", "#1A1C1A",
		"#737A1D", "#4A5D4E", "#BEB8B5", "#85896D", "#84651B", "#DD620A", "#E09938", "#C8AE9B",
		"#7C9060", "#5F5054", "#442825", "#B13E34", "#C3C7D5", "#A5A759", "#675956", "#373037",
		"#4C9ABD", "#AFBABE", "#7B6D70", "#301F21", "#675855", "#4A373D", "#B2C4CB", "#65798E",
		"#3A7F17", "#5FBE32", "#53C602", "#94D941", "#EC6D49", "#DB0000", "#00BD4F", "#F7882F",
		"#4B3434", "#F222FF", "#8C1EFF"
	];

	var socket = io(),
		$window = $(window),
		$messages = $('#messageArea'),
		$mInput = $('#m'),
		$onlineUsers = $('#userContainer'),
		connected = false,
		typing = false,
		totalUsers = 0,
		id, lastTypingTime, username, timer, userColor;

	/*************************************************************/

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
		join(name);
	}, function (dismiss) {
		join();
	});

	function join(name) {
		username = name ? name : names[Math.floor(Math.random() * names.length)];
		userColor = colors[Math.floor(Math.random() * colors.length)];
		connected = true;
		$('#yourUsername').text(`${username} (You)`).css('color', userColor);
		socket.emit('new user', username, userColor);
	}

	socket.on('request id', (data) => {
		id = data.id;
		$('#yourUsername').attr('user-id', id);
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
		return $('.typing.message').filter(function(i) {
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

	// Adds and removes online users from the "Who's online?" dialog
	// Also attaches event handlers to buttons to deal with DM's
	socket.on('online user', function (data) {
		if (connected) {
			if (data.connected) {
				// Removes self from array of users
				var users = jQuery.grep(data.users, (user, index) => {
					return user.id !== id;
				});

				users.forEach(user => {
					// Searches the buttons for an attribute matching "user-id" of the current user
					// If it doesn't exist, add the user to the list of online users
					if ($(`button[user-id*="${user.id}"]`).text() === "") {
						var $usernameItem = $('<button class="dropdown-item online-user"></button>');
						$usernameItem.text(user.name).attr('user-id', user.id).css('color', user.color).on('click', directMessage);
						$onlineUsers.append($usernameItem);
					}
				});
			} else {
				removeOfflineUser(data.user).fadeOut(() => {
					$(this).remove();
				});
			}
		}
		$('#numOnline').text(`(${data.onlineUsers})`);
	});

	// Change to filter via attr
	function removeOfflineUser(removeUserID) {
		return $('.dropdown-item').filter(function(i) {
			return $(this).attr('user-id') === removeUserID;
		});
	}

	function directMessage() {
		var message = $mInput.val();
		if (message) {
			var recipient = {
				username: $(this).text(),
				id: $(this).attr('user-id'),
				color: $(this).css('color')
			};
			var data = {
				recipient: recipient,
				from: username,
				fromColor: userColor,
				message: message
			};
			$mInput.val('');
			socket.emit('direct message', data);
			addDirectMessage(data);
		}
	}

	socket.on('direct message', (data) => {
		addDirectMessage(data);
	});

	function addDirectMessage(data) {
		var $typingMessages = getTypingMessages({username: data.from});
		if ($typingMessages.length !== 0) {
			$typingMessages.remove();
		}

		var $fromUsernameDiv = $('<span class="username"></span>')
			.text(data.from)
			.css('color', data.fromColor);
		var $toUsernameDiv = $('<span class="username"></span>')
			.text(data.recipient.username)
			.css('color', data.recipient.color);
		var $messageBodyDiv = $('<span class="messageBody"></span>')
			.text(data.message);

		var $messageDiv = $('<li class="message"/>')
			.data('username', data.from)
			.css('background-color', 'rgba(0,0,0,.05)')
			.append($fromUsernameDiv, "to ", $toUsernameDiv, $messageBodyDiv);

		$messages.append($messageDiv);
		$messages.scrollTop($messages[0].scrollHeight);
	}

	/************************ jQuery Plugins ************************/
	// $.fn.pressEnter = function(fnc) {
	// 	return this.each(function() {
	// 		$(this).keypress(function(event) {
	// 			var keycode = (event.keyCode ? event.keyCode : event.which);
	// 			if (keycode === '13') {
	// 				fnc.call(this, event);
	// 			}
	// 		});
	// 	});
	// }
});
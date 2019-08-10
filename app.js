const spawn = require('child_process').spawn;
const inquirer = require('inquirer');
const fs = require('fs');

var pjson = require('./package.json');
var config = require("./config.json");

inquirer.registerPrompt('list-input', require('inquirer-list-input'));

var questions = [
  {
    type: 'confirm',
    name: 'useCustomConfig',
    message: 'Do you want to create a new configuration ? ',
    default: true,
    when: function (answers) {
      return config.account.username != "" && config.account.password != "";
    }
  },
  {
    type: 'confirm',
    name: 'createConfig',
    message: 'Do you want to create a new configuration ? ',
    default: true,
    when: function (answers) {
      return !(config.account.username != "" && config.account.password != "");
    }
  },
  {
    type: 'input',
    name: 'username',
    message: 'Twitter Account Username : ',
	default: (config.account.username != "") ? config.account.username : "",
    when: function (answers) {
      return answers.createConfig || answers.useCustomConfig;
    },
    validate: function (value) {
      var valid = !(value == "");
      return valid || 'Please enter a username';
    },
  },
  {
    type: 'password',
    name: 'password',
    message: 'Twitter Account Password : ',
	default: (config.account.password != "") ? config.account.password : "",
    when: function (answers) {
      return answers.createConfig || answers.useCustomConfig;
    },
    validate: function (value) {
      var valid = !(value == "");
      return valid || 'Please enter a password';
    },
  },
  {
    type: 'number',
    name: 'limitTweet',
    message: 'Tweet limit per launch (10 is an optimal value) : ',
    default: config.limits.tweet_limit,
    when: function (answers) {
      return answers.createConfig || answers.useCustomConfig;
    },
    validate: function (value) {
      var valid = !isNaN(parseInt(value));
      return valid || 'Please enter a number';
    },
  },
  {
    type: 'number',
    name: 'limitRetweet',
    message: 'Retweet limit per launch (10 is an optimal value) : ',
    default: config.limits.retweet_limit,
    when: function (answers) {
      return answers.createConfig || answers.useCustomConfig;
    },
    validate: function (value) {
      var valid = !isNaN(parseInt(value));
      return valid || 'Please enter a number';
    },
  },
  {
    type: 'number',
    name: 'limitReply',
    message: 'Reply limit per launch (10 is an optimal value) : ',
    default: config.limits.reply_limit,
    when: function (answers) {
      return answers.createConfig || answers.useCustomConfig;
    },
    validate: function (value) {
      var valid = !isNaN(parseInt(value));
      return valid || 'Please enter a number';
    },
  },
  {
    type: 'confirm',
    name: 'headlessMode',
    message: 'Do you want to use the headless mode ? ',
    default: false,
    when: function (answers) {
      return answers.createConfig || answers.useCustomConfig;
    }
  },
  {
    type: 'confirm',
    name: 'noSandboxMode',
    message: 'Do you want to use the no sandbox mode (type no if you don\'t what it means for) ? ',
    default: false,
    when: function (answers) {
      return answers.createConfig || answers.useCustomConfig;
    }
  },
  {
    type: 'number',
    name: 'forceCloseBrowserAfter',
    message: 'Delay before closing browser (in milliseconds, default to 180000s = 3 minutes) : ',
    default: config.bot.forceCloseBrowserAfter,
    when: function (answers) {
      return answers.createConfig || answers.useCustomConfig;
    },
    validate: function (value) {
      var valid = !isNaN(parseInt(value));
      return valid || 'Please enter a number';
    },
  },
  {
    type: 'number',
    name: 'afterProcessDelay',
    message: 'Delay between two executions of action (in milliseconds, default to 5000ms = 5 seconds) : ',
    default: config.bot.afterProcessDelay,
    when: function (answers) {
      return answers.createConfig || answers.useCustomConfig;
    },
    validate: function (value) {
      var valid = !isNaN(parseInt(value));
      return valid || 'Please enter a number';
    },
  },
  {
    type: 'number',
    name: 'maxTimeout',
    message: 'Timeout for the execution of an action (in milliseconds, default to 30000ms = 30 seconds) : ',
    default: config.bot.maxTimeout,
    when: function (answers) {
      return answers.createConfig || answers.useCustomConfig;
    },
    validate: function (value) {
      var valid = !isNaN(parseInt(value));
      return valid || 'Please enter a number';
    },
  },
  {
    type: 'number',
    name: 'intervalExecution',
    message: 'Delay between executions of bot (in milliseconds, default to 480000ms = 8 minutes) : ',
    default: config.bot.intervalExecution,
    when: function (answers) {
      return answers.createConfig || answers.useCustomConfig;
    },
    validate: function (value) {
      var valid = !isNaN(parseInt(value));
      return valid || 'Please enter a number';
    },
  },
  {
    type: 'list',
    name: 'mode',
    message: 'Which mode do you want to activate ?',
    choices: ['tweet', 'retweet', 'reply'],
    when: function (answers) {
      return answers.createConfig || answers.useCustomConfig;
    },
    filter: function (val) {
      return val.toLowerCase();
    }
  },
  {
    type: 'input',
    name: 'replyUrl',
    message: 'Please specify the link of the thread : ',
	default: (config.modes.reply.thread != "") ? config.modes.reply.thread : "",
    when: function (answers) {
      return (answers.createConfig || answers.useCustomConfig) && answers.mode == "reply";
    },
    validate: function (value) {
      var valid = !(value == "");
      return valid || 'Please enter a valid url';
    },
  },
  {
    type: 'input',
    name: 'searchKeyword',
    message: 'Please specify a keyword to monitor : ',
    defaut: "#MTVHottest BLACKPINK",
	default: (config.bot.search.keyword != "") ? config.bot.search.keyword : "",
    when: function (answers) {
      return (answers.createConfig || answers.useCustomConfig) && answers.mode == "retweet";
    },
    validate: function (value) {
      var valid = !(value == "");
      return valid || 'Please enter a keyword';
    },
  },
  {
    type: 'confirm',
    name: 'changeTwitterKeys',
    message: 'Do you want to edit the keys of your twitter app ? ',
    default: false,
    when: function (answers) {
      return (answers.createConfig || answers.useCustomConfig) && config.twitter.consumer_key != ""  && (answers.mode == "retweet");
    }
  },
  {
    type: 'input',
    name: 'consumerKey',
    message: 'Twitter App Consumer Key : ',
	default: (config.twitter.consumer_key != "") ? config.twitter.consumer_key : null,
    when: function (answers) {
      return ((answers.createConfig || answers.useCustomConfig) && (config.twitter.consumer_key == "" || answers.changeTwitterKeys))  && (answers.mode == "retweet");
    },
    validate: function (value) {
      var valid = !(value == "");
      return valid || 'Please enter a key';
    },
  },
  {
    type: 'input',
    name: 'consumerSecret',
    message: 'Twitter App Consumer Secret : ',
	default: (config.twitter.consumer_secret != "") ? config.twitter.consumer_secret : null,
    when: function (answers) {
      return ((answers.createConfig || answers.useCustomConfig) && (config.twitter.consumer_secret == "" || answers.changeTwitterKeys)) && (answers.mode == "retweet");
    },
    validate: function (value) {
      var valid = !(value == "");
      return valid || 'Please enter a key';
    },
  },
  {
    type: 'input',
    name: 'accessTokenKey',
    message: 'Twitter App Access Token Key : ',
	default: (config.twitter.access_token_key != "") ? config.twitter.access_token_key : null,
    when: function (answers) {
      return ((answers.createConfig || answers.useCustomConfig) && (config.twitter.access_token_key == "" || answers.changeTwitterKeys)) && (answers.mode == "retweet");
    },
    validate: function (value) {
      var valid = !(value == "");
      return valid || 'Please enter a key';
    },
  },
  {
    type: 'input',
    name: 'accessTokenSecret',
    message: 'Twitter App Access Secret Key : ',
	default: (config.twitter.access_token_secret != "") ? config.twitter.access_token_secret : null,
    when: function (answers) {
      return ((answers.createConfig || answers.useCustomConfig) && (config.twitter.access_token_secret == "" || answers.changeTwitterKeys)) && (answers.mode == "retweet");
    },
    validate: function (value) {
      var valid = !(value == "");
      return valid || 'Please enter a key';
    },
  }
];

inquirer.prompt(questions).then(answers => {
  if (answers.useCustomConfig || answers.createConfig) {
    var tmp = config;
    tmp.account.username = answers.username.trim();
    tmp.account.password = answers.password.trim();

    tmp.limits.reply_limit = answers.limitReply;
    tmp.limits.retweet_limit = answers.limitRetweet;
    tmp.limits.tweet_limit = answers.limitTweet;

    tmp.bot.headless = answers.headlessMode;
    tmp.bot.use_no_sandbox_param = answers.noSandboxMode;
    tmp.bot.forceCloseBrowserAfter = answers.forceCloseBrowserAfter;
    tmp.bot.maxTimeout = answers.maxTimeout;
    tmp.bot.afterProcessDelay = answers.afterProcessDelay;
	
	if(answers.mode == "retweet"){
		tmp.bot.search.keyword = answers.searchKeyword.trim();
	}else{
		tmp.bot.search.keyword = "";
	}
	
    tmp.bot.intervalExecution = answers.intervalExecution;

	if(((answers.createConfig && answers.changeTwitterKeys) || answers.changeTwitterKeys || answers.useCustomConfig) && (answers.mode == "retweet")){
		tmp.twitter.consumer_key = answers.consumerKey.trim();
		tmp.twitter.consumer_secret = answers.consumerSecret.trim();
		tmp.twitter.access_token_key = answers.accessTokenKey.trim();
		tmp.twitter.access_token_secret = answers.accessTokenSecret.trim();
	}

	tmp.modes.reply.thread = "";

    if (answers.mode == "tweet") {
		tmp.modes.tweet.active = true;
		tmp.modes.reply.active = false;
		tmp.modes.retweet.active = false;
    } else if (answers.mode == "reply") {
      tmp.modes.reply.active = true;
      tmp.modes.tweet.active = false;
      tmp.modes.retweet.active = false;
      tmp.modes.reply.thread = answers.replyUrl;
    } else if (answers.mode == "retweet") {
      tmp.modes.retweet.active = true;
      tmp.modes.reply.active = false;
      tmp.modes.tweet.active = false;
    } else {
      tmp.modes.reply.active = false;
      tmp.modes.retweet.active = false;
      tmp.modes.tweet.active = false;
      console.log("invalid specified mode");
      return;
    }

    config = tmp;

    fs.writeFileSync('config.json', JSON.stringify(tmp, null, 2));

    console.log("config updated !");
  } else if(config.account.username == "" && config.account.password == "" && !answers.createConfig) {
	console.log("bye");
	process.exit();
	return;
  }else if(!answers.createConfig){
	console.log("configuration not updated");
  }

  //fs.writeFileSync('tmp_number', "1");

  start();
});

function launch(socket) {
  console.log("executing bot");
  var bot = spawn('node', ['bot.js']);

  bot.stdout.on('data', function (data) {
    var output = data.toString();
    process.stdout.write('stdout: ' + output.replace("[+] ", ""));

    if (output.trim().startsWith("[+]")) {
      socket.emit("use", config.account.username);
    }
  });

  bot.stderr.on('data', function (data) {
    console.log('stderr: ' + data.toString());
  });

  bot.on('exit', function (code) {
    if(code.toString()){
      console.log('stdout: task finished');
    }else{
      console.log('child process exited with code ' + code.toString());
    }
  });
}

function start() {
  const socket = require('socket.io-client')('https://stats.bp-vote-legends.eu');

  socket.on('connect', function () {
    console.log("Now connected to bp-vote-legends.eu");
    socket.emit("start", config.account.username);
	socket.emit("version", pjson.version);
	launch(socket);
  });
  
  socket.on('alert', function(message){
	  console.log("ALERT :: " + message);
  })

	setInterval(function () {
    launch(socket);
  }, config.bot.intervalExecution);
}

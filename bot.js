const puppeteer = require('puppeteer');
const Twitter = require('twitter');
const randomWords = require('random-words');
const Queue = require('better-queue');
const config = require('./config.json');
const converter = require('number-to-words');
const quote = require('inspirational-quotes');
const util = require('./util.js');
const fs = require('fs')

var client = new Twitter(config.twitter);

function msg(username, format) {
	var str = format.replace("{USERNAME}", username);
	
	if(str.indexOf("{NUMBER_TO_WORDS}") != -1){
		var contents = fs.readFileSync('tmp_number', 'utf8');
		var freeNumber = parseInt(contents);
		str = format.replace("{NUMBER_TO_WORDS}", converter.toWords(freeNumber));
		freeNumber++;
		fs.writeFileSync('tmp_number', (freeNumber) + "");
	}
	
	if(str.indexOf("{RANDOM_QUOTE}") != -1){
		str = format.replace("{RANDOM_QUOTE}", quote.getRandomQuote());
	}
	
	var regex = /({RANDOM_WORD\|\s*([0-9]+)})/gm;
	var regex_match = format.match(regex);

	try {
		if (regex_match.length > 0) {
			regex_match.forEach(function (param) {
				var cleaned_param = param.replace("{", "").replace("}", "");
				var tmp = cleaned_param.split("|");
				var count = (tmp.length == 0) ? 1 : tmp[1];

				str = str.replace(param, randomWords({
					exactly: 1, wordsPerString: parseInt(count), formatter: (word, index) => {
						return index === 0 ? word.slice(0, 1).toUpperCase().concat(word.slice(1)) : word;
					}
				}));
			});
		}
	}catch(e){}

	return str;
}

async function post_tweet(page, user, format) {
	var tmp = msg(user, format);

	if (tmp.length < 280) {
		await page.keyboard.press('n');
		try {
			await page.waitForSelector("[data-testid=\"tweetTextarea_0\"]")
		} catch (e) {
			console.log("An error occurred. Perhaps, you have reached the limit or you have a problem in your internet connection.");
			page.close();
			process.exit(1);
			return;
		}
		await page.keyboard.type(tmp);

		await page.keyboard.down('Control');
		await page.keyboard.press('Enter');
		await page.keyboard.up('Control');

		await page.waitFor(1000);

		try {
			await page.waitForSelector("[data-testid=\"tweetTextarea_0\"]", { timeout: 2000, hidden: true });
		} catch (e) {
			console.log("An error occurred. Perhaps, you have reached the limit or you have a problem in your internet connection.");
			page.close();
			process.exit(1);
			return;
		}
	} else {
		await page.waitFor(2000);
	}
}

async function reply_post(page) {
	var tmp = msg("", config.formats.reply_tweet_format);
	
	if (tmp.length < 280) {
		await page.evaluate(() => {
			document.querySelectorAll("article")[0].querySelectorAll("article > div")[document.querySelectorAll("article")[0].querySelectorAll("article > div").length - 1].querySelectorAll("article > div > div > div")[0].click();
		});
	
		await page.waitForSelector("[data-testid=\"tweetTextarea_0\"]");

		await page.keyboard.type(tmp);

		await page.keyboard.down('Control');
		await page.keyboard.press('Enter');
		await page.keyboard.up('Control');

		await page.waitFor(1000);

		try {
			await page.waitForSelector("[data-testid=\"tweetTextarea_0\"]", { timeout: 2000, hidden: true });
		} catch (e) {
			console.log("An error occurred. Perhaps, you have reached the limit or you have a problem in your internet connection.");
			page.close();
			process.exit(1);
			return;
		}
	}else {
		await page.waitFor(2000);
	}
}

var q = new Queue(async function (input, cb) {
	var date = new Date()

	if (input.page.isClosed()) {
		console.log("Page closed, shutting down");
		process.exit();
		return;
	}

	if (input.type == "simple") {
		await post_tweet(input.page, "", config.formats.tweet_format);
		console.log("[+] " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + " posted new tweet");
	} else if (input.type == "retweet") {
		await post_tweet(input.page, input.user.screen_name, config.formats.retweet_format);
		console.log("[+] " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + " posted new retweet");
	} else if (input.type == "reply") {
		await reply_post(input.page);
		console.log("[+] " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + " posted new reply");
	}

	cb(null, true);
}, { maxTimeout: config.bot.maxTimeout, afterProcessDelay: config.bot.afterProcessDelay });

function tweet(page) {
	for (var i = 0; i < config.limits.tweet_limit; i++) {
		var tweet = {};
		tweet.type = "simple";
		tweet.page = page;
		q.push(tweet);
	}
}

function retweet(page) {
	var i = 0;
	client.get(config.bot.search.api_path, { q: config.bot.search.keyword }, function (error, tweets, response) {
		
		if(error){
			console.log("An error occurred. Please verify your twitter app keys");
			console.log(error);
			page.close();
			process.exit(1);
			return;
		}
			
		tweets.statuses.forEach(function (tweet) {
			if (i < config.limits.retweet_limit) {
				if (!config.blacklist.includes(tweet.user.screen_name.toLowerCase())) {
					tweet.page = page;
					tweet.type = "retweet";
					q.push(tweet);
				}
				i++;
			}
		});
	});
}

async function reply(page, url) {
	try {
		await page.goto(url, {
			waitUntil: 'networkidle2'
		});
	} catch (e) {
		console.log("Unable to load url : " + url + ". Please verify the url or/and your internet connection.");
		page.close();
		process.exit(1);
		return;
	}

	await page.waitForSelector("a[data-testid=\"AppTabBar_Home_Link\"]");

	for (var i = 0; i < config.limits.reply_limit; i++) {
		var tweet = {};
		tweet.type = "reply";
		tweet.page = page;
		q.push(tweet);
	}
}

async function launch(mode) {
	var browserConfig = {
		headless: config.bot.headless
	};

	if (config.bot.use_no_sandbox_param) {
		browserConfig.args = ['--no-sandbox'];
	}

	const browser = await puppeteer.launch(browserConfig);
	const page = await browser.newPage()

	try {
		await page.goto("https://mobile.twitter.com/login", {
			waitUntil: 'networkidle2'
		});
	} catch (e) {
		console.log("Please verify your internet connection.");
		page.close();
		browser.close();
		process.exit(1);
		return;
	}

	console.log("connecting");

	await page.waitForSelector("[name='session[username_or_email]']");
	await page.click("[name='session[username_or_email]']");
	await page.type("[name='session[username_or_email]']", config.account.username);
	await page.keyboard.down("Tab");
	await page.keyboard.type(config.account.password);

	await page.click("div[data-testid=\"LoginForm_Login_Button\"]");

	try {
		await page.waitForSelector("a[data-testid=\"AppTabBar_Home_Link\"]", {timeout: 10000 });
	} catch (e) {
		console.log("An error occurred in the connection process. Perhaps, you have entered a bad password/username or your account is restricted.");
		page.close();
		browser.close();
		process.exit(1);
		return;
	}

	console.log("connected");
	console.log("active mode : " + mode);
	
	if (mode == "retweet") {
		retweet(page);
	} else if (mode == "tweet") {
		tweet(page);
	} else {
		reply(page, config.modes.reply.thread);
	}

	setTimeout(function () {
		browser.close();
		process.exit();
	}, config.bot.forceCloseBrowserAfter);

	q.on('drain', function () {
		browser.close();
		process.exit();
	});
}

function start() {
	var active_mode = "";

	if (config.modes.retweet.active) {
		active_mode = "retweet";
	}

	if (config.modes.tweet.active && active_mode != "") {
		console.log("You have activated multiple modes. Please only select one");
		return;
	} else if (config.modes.tweet.active) {
		active_mode = "tweet";
	}

	if (config.modes.reply.active && active_mode != "") {
		console.log("You have activated multiple modes. Please only select one");
		return;
	} else if (config.modes.reply.active) {
		if (config.modes.reply.thread != "") {
			active_mode = "reply";
		} else {
			console.log("Please specify a thread link");
			return;
		}
	}

	if (active_mode == "") {
		console.log("Please activate a mode");
		return;
	}

	launch(active_mode);
}

start();


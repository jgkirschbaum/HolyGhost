//TODO
// handle step timeouts and/or errors better
// complete documentation
// take screenshot when?
// make screenshots configurable
// implement http errors
// check when timeouts occur
// implement total time even on timeout
// make screenshots configurable

/*
 * Initialize default objects
 */
var config = {
    resultPath : '/tmp',
    testName : 'unset',
    errorLevel : 2,
    har :  true,
    casper : {
        viewportSize: {
            width : 1024,
            height : 768
            },
        pageSettings: {
            loadImages :  true,
            loadPlugins : false
            },
        logLevel : 'error',
        verbose : true,
        stepTimeout : 10000,
        timeout : 30000,
        failFast : true
        }
    };

/*
 * Initialize base variables
 */
var stepCount = 0;
var stepsFailed = 0;
var testsFailed = 0;
var stepName = '';
var testStartTime = new Date().toISOString();
var t1;
var t2;
var t;

var nagiosrc = {
    0 : 'OK',
    1 : 'WARNING',
    2 : 'CRITICAL',
    3 : 'UNKNOWN'
    };

var message = '';
var perfdata = '|';



var casper = require('casper').create({
    colorizerType : 'Dummy',
    viewportSize: {
        width: config.casper.viewportSize.width,
        height: config.casper.viewportSize.height
    },
    pageSettings: {
        loadImages:  config.casper.pageSettings.loadImages,
        loadPlugins: config.casper.pageSettings.loadPlugins
    },
    logLevel: config.casper.logLevel,
    verbose: config.casper.verbose,
    stepTimeout: config.casper.stepTimeout,
    timeout: config.casper.timeout,
    failFast: config.casper.failFast,
    //TODO
    //onWaitTimeout: function() {
    //},
    onStepTimeout: function() {
        // Format step names
        //TODO stepCount++;
        stepsFailed++;
        if (stepName === '') {
            stepName = 'step'+stepCount;
        } else {
            // safely replace whitespace characters
            stepName  = stepName.replace(/\s+/g, '_');
            }
        // Format output
        casper.echo('Step ('+stepName+') exceeded timeout of '+config.casper.stepTimeout+'msec');
        // Add perfdata
	    t2 = new Date().getTime();
	    t = t2 - t1;
        perfdata += '\''+stepName+'\'='+t+'msec ';
        // Take screenshot
       	var now = new Date().toISOString();
        casper.capture(config.resultPath+'/'+config.testName+'/'+testStartTime+'/screenshot__'+stepName+'_'+now+'.png');
        // Save Har TODO
        var content = JSON.stringify(createHar(pg.address, 'title', pg.startTime, pg.resources), undefined, 4);
        var now = new Date().toISOString();
        fs.write(config.resultPath+'/'+config.testName+'/'+testStartTime+'/'+now+'.har', content, 'w');
        // Exit
        var rc = config.errorLevel;
        message += nagiosrc[rc]+': Timeout in step '+stepName+', failed '+stepsFailed+' steps';
        casper.echo(message+perfdata);
        this.exit(rc);
    },
    //TODO
    //onTimeout: function() {
    //}
});
/*
 * Include helper libraries
 */
var fs = require('fs');

/*
 * Format date as ISO string
 */
Date.prototype.toISOString = function () {
    function pad(n) { return n < 10 ? '0' + n : n; }
    function ms(n) { return n < 10 ? '00'+ n : n < 100 ? '0' + n : n }
    return this.getFullYear() + '-' +
        pad(this.getMonth() + 1) + '-' +
        pad(this.getDate()) + 'T' +
        pad(this.getHours()) + ':' +
        pad(this.getMinutes()) + ':' +
        pad(this.getSeconds()) + '.' +
        ms(this.getMilliseconds()) + 'Z';
}




/*
 * Start casper, load test case and parse local config options
 */
var testConfig;

casper.start();

// Load test case file
var testFile = casper.cli.options['test'];
if(/^\/.*$/.test(testFile)) {
    require(testFile);
} else {
    require('./'+testFile);
}

// Parse casper config options
for(var key in testConfig['casper']) {
    casper.options[key] = testConfig['casper'][key];
}
// Parse other config options
for(var key in testConfig) {
    config[key] = testConfig[key];
}



/*
 * HAR creation
 */
if (config.har) {
    function createHar(address, title, startTime, resources)
    {
        var entries = [];
    
        resources.forEach(function (resource) {
            var request = resource.request,
                startReply = resource.startReply,
                endReply = resource.endReply;
    
            if (!request || !startReply || !endReply) {
                return;
            }
    
            entries.push({
                startedDateTime: request.time.toISOString(),
                time: endReply.time - request.time,
                request: {
                    method: request.method,
                    url: request.url,
                    httpVersion: "HTTP/1.1",
                    cookies: [],
                    headers: request.headers,
                    queryString: [],
                    headersSize: -1,
                    bodySize: -1
                },
                response: {
                    status: endReply.status,
                    statusText: endReply.statusText,
                    httpVersion: "HTTP/1.1",
                    cookies: [],
                    headers: endReply.headers,
                    redirectURL: "",
                    headersSize: -1,
                    bodySize: startReply.bodySize,
                    content: {
                        size: startReply.bodySize,
                        mimeType: endReply.contentType
                    }
                },
                cache: {},
                timings: {
                    blocked: 0,
                    dns: -1,
                    connect: -1,
                    send: 0,
                    wait: startReply.time - request.time,
                    receive: endReply.time - startReply.time,
                    ssl: -1
                }
            });
        });

    return {
        log: {
            version: '1.2',
            creator: {
                name: "CasperJS",
                version: phantom.version.major + '.' + phantom.version.minor +
                    '.' + phantom.version.patch
            },
            pages: [{
                startedDateTime: startTime.toISOString(),
                id: address,
                title: title,
                pageTimings: {}
            }],
            entries: entries
        }
    };
}

	var pg = new WebPage()
	pg.resources = [];

    casper.on('load.started', function (res) {
        pg.startTime = new Date();
        }); 

    //TODO
    //casper.on('load.finished', function (status) {
    //    var content = JSON.stringify(createHar(pg.address, 'title', pg.startTime, pg.resources), undefined, 4);
    //   	var now = new Date().toISOString();
    //   	fs.write(config.resultPath+'/'+config.testName+'/'+testStartTime+'/'+now+'.har', content, 'w');
    // 	});
	casper.on('page.initialized', function (page) {
	    // INFO this is the first url after about:blank
	  	pg.address = page.url;
	    });

	casper.on('resource.requested', function (req, request) {
        //TODO make configurable, save patch
	   	if(req.url.indexOf("push.dab-bank") > -1) {
            request.abort();
            }
	    }); 
	
	casper.on('resource.requested', function (req, request) {
	   	pg.resources[req.id] = { 
	   	    request: req,
	   	    startReply: null,
	   	    endReply: null
			};
	    }); 
	
	casper.on('resource.received', function(res) {
		if (res.stage === 'start') {
			pg.resources[res.id].startReply = res;
		    }   
		if (res.stage === 'end') {
		    pg.resources[res.id].endReply = res;
		    }
	    });
	}


casper.on('step.start', function(stepResult) {
    // Format step names
    stepCount++;
    if (stepName === '') {
        stepName = 'step'+stepCount;
    } else {
        // safely replace whitespace characters
        stepName  = stepName.replace(/\s+/g, '_');
        }
    });

/*
 * Format step output and take screenshot
 */
casper.on('step.complete', function(stepResult) {
    if (this.test.getFailures().length > testsFailed) {
        var stepMessage = 'failed';
        stepsFailed++;
        testsFailed = this.test.getFailures().length;
    } else {
        var stepMessage = 'passed';
    }
   
    var now = new Date().toISOString();
    // Format output
    casper.echo('Step ('+stepName+') '+stepMessage+', took '+t+'msec');
    // Add perfdata
    perfdata += '\''+stepName+'\'='+t+'msec ';
    // Take screenshot
    casper.capture(config.resultPath+'/'+config.testName+'/'+testStartTime+'/screenshot__'+stepName+'_'+now+'.png');
    // Reset stepName
    stepName = '';
    });



/*
 * Timer functions
 */
casper.on('load.started', function() {
	t1 = new Date().getTime();
    });
casper.on('load.finished', function() {
	t2 = new Date().getTime();
	t = t2 - t1;
    });



/*
 * EVENT TESTS
// I do not understand, when step.start is emitted... so do nothing too complicated here...
casper.on('step.start', function(step) {
    casper.echo('_____STEP.STARTED');
    });
casper.on('page.created', function (WebPage) {
    casper.echo('_____CREATED');
    //?? NOT CALLED
    });
casper.on('starting', function() {
    casper.echo('_____STARTING');
    //?? NOT CALLED
    });
casper.on('started', function() {
    casper.echo('_____STARTED');
    //?? NOT CALLED
    });
casper.on('exit', function (status) {
    casper.echo('_____EXIT');
    //??
    });
casper.on('die', function (message, status) {
    casper.echo('_____DIE');
    //??
    });
casper.on('run.start', function () {
    casper.echo('_____RUN.START');
    //?? NOT CALLED
    });
casper.on('run.complete', function () {
    casper.echo('_____RUN.COMPLETE');
    //??
    });
casper.on('url.changed', function (url) {
    casper.echo('_____URL.CHANGED'+url);
    //??
    });
casper.on('wait.start', function() {
    casper.echo('_____WAIT.START');
    //??
    });
casper.on('wait.done', function() {
    casper.echo('_____WAIT.DONE');
    //??
    });
casper.on('load.started', function() {
    casper.echo('_____LOAD.STARTED');
    });
casper.on('load.failed', function(object) {
    casper.echo('_____LOAD.FAILED');
    //??
    });
casper.on('load.finished', function() {
    casper.echo('_____LOAD.FINISHED');
    });
casper.on('error', function(msg, backtrace) {
    casper.echo('_____ERROR');
    });
casper.on('step.created', function() {
    casper.echo('_____STEP.CREATED');
    });
 */



/*
 * Run and finish
 */
casper.run(function() {
    var content = JSON.stringify(createHar(pg.address, 'title', pg.startTime, pg.resources), undefined, 4);
    var now = new Date().toISOString();
    fs.write(config.resultPath+'/'+config.testName+'/'+testStartTime+'/'+now+'.har', content, 'w');
    if (stepsFailed > 0) {
        var rc = config.errorLevel;
        message += nagiosrc[rc]+': failed '+stepsFailed+' steps.';
    } else {
        var rc = 0;
        message += nagiosrc[rc]+': passed all steps';
        }
    casper.echo(message+perfdata);
    this.exit(rc);
	});

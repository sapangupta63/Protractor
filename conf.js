exports.config = {
 // seleniumAddress: 'http://localhost:4444/wd/hub',
  directConnect: true,
// Capabilities to be passed to the webdriver instance.
capabilities: {
    'browserName': 'chrome'
},
// Framework to use. Jasmine is recommended.
framework: 'jasmine2',
specs: ['Teamsitecreation.js'],

suites: {
  smoke: ['./basic/*.js'],
  functional: ['./functional/*.js'],
  all: ['./*/*.js'],
  selected: ['./functional/Matchers.js','./basic/FistTest.js'],
  },


// Options to be passed to Jasmine.
jasmineNodeOpts: {
defaultTimeoutInterval: 80000
}
};
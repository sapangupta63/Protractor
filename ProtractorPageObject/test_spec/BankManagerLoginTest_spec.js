var basepage=require('../pages/BasePage.js');
var OR=require('../json/OR.json');
var addcustomerpage=require('../pages/AddCustomerPage.js');    
const { ExpectedConditions, browser } = require('protractor');

describe("Bank Manager Login Test",function(){
browser.ignoreSynchronization=true;
var homepage=require('../pages/HomePage.js')    
it("Login as Bank Manager",function(){
basepage.navigateToURL(OR.testsiteurl);
var title=basepage.getTitle();
expect(title).toBe("Protractor practice website - Banking App");
browser.sleep(2000);
//browser.get("http://www.way2automation.com/angularjs-protractor/banking/#/login");
homepage.loginAsBankManager();
})

})
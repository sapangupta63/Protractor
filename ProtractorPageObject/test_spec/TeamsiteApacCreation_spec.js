var basepage=require('../pages/BasePage.js');
var TS=require('../json/Teamsite.json');
var teamsiteGlobalPage=require('../pages/TeamsiteGlobalPage.js');
var random=require('../util/randomnumber');
const PublicReportingAPI = require('@reportportal/agent-js-jasmine/lib/publicReportingAPI');

describe("Creating Teamsite APAC",function(){
var WelcomePage=require('../pages/WelcomePage.js')    
it("Teamsite APAC Creation", async  function(){
browser.ignoreSynchronization=true;
teamsiteGlobalPage.navigationtoURL();
var title=basepage.getTitle();
expect(title).toBe("Home - Team Sites");
var primaryowner=teamsiteGlobalPage.userName();
var TSName="Automation";
var ranno=random.randomno();
var TSName=TSName+ranno;
await WelcomePage.nextButton().language(TS.locators.languagepage.testdata.lang,TS.locators.languagepage.testdata.grp,primaryowner,TS.locators.languagepage.testdata.bkowner).regiondropdown(TS.locators.languagepage.testdata.apacrgn).tscreation(TSName.toString());
})

})
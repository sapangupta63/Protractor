var TS=require('../json/Teamsite.json');
var SelectWrapper = require('../util/select-wrapper.js');
const { element } = require('protractor');
var langug=new SelectWrapper(by.css(TS.locators.languagepage.lnguagedropdown));
var group=new SelectWrapper(by.css(TS.locators.languagepage.gropdropdown));

var TeamsiteGlobalPage=require('../pages/TeamsiteGlobalPage.js');    

var language=function()
{

this.language=function(lang,grp,pmown,bkowner)
{
    langug.selectByText(lang);
    group.selectByText(grp);
    //pmown =TeamsiteGlobalPage.userName();
  
    element(by.css(TS.locators.languagepage.pmowner)).sendKeys(pmown);

    element(by.css(TS.locators.languagepage.bkowner)).sendKeys(bkowner);
    element(by.css(TS.locators.languagepage.chkbtn)).click();
    element(by.css(TS.locators.languagepage.lnguagenextbtn)).click();
    return require('./RegionPage.js');

}


}

module.exports=new language();
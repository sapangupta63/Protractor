var TS=require('../json/Teamsite.json');
var select=require('../util/select-wrapper.js');
const { element } = require('protractor');
var region=new select(by.css(TS.locators.languagepage.regiondropdown));
var regionpage = function()
{
    
this.regiondropdown=function(rgn)
{
    region.selectByText(rgn);
    element(by.css(TS.locators.languagepage.rgnchkbtn)).click();
    element(by.css(TS.locators.languagepage.rgnnxtbtn)).click();
    return require('./Teamsitepagecreation.js');

}


}

module.exports=new regionpage();
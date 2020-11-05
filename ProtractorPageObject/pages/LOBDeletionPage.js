const { element, browser } = require('protractor');
var lob=require('../json/LOB.json');
const { ProtractorExpectedConditions, ExpectedConditions } = require('protractor');

const { protractor } = require('protractor/built/ptor');
var EC=ExpectedConditions;
var button=$('span.ms-siteactions-normal');
var isclickable=EC.elementToBeClickable(button);

var button1=$('a#mp1_0_7_Anchor.ms-core-menu-link');
var isclickable1=EC.elementToBeClickable(button1);

var button2=$('#DeltaPlaceHolderMain');
var isclickable2=EC.visibilityOf(button2);

var LOBDeletion = function()

{
   this.lobsetting=async function()
   {
     browser.wait(isclickable,80000);
     await button.click(); 
     //  element(by.css(lob.locators.LOBDeletion.LOBSetting)).click();
     browser.wait(isclickable1,80000);
     await button1.click(); 
    //   element(by.css(lob.locators.LOBDeletion.LOBSitesetting)).click();
    await  element(by.linkText(lob.locators.LOBDeletion.DeleteLOBName)).click();
     await  element(by.xpath(lob.locators.LOBDeletion.DeleteLOBBtn)).click();

   },

   this.lobmessage=async function()
   {
    browser.sleep(3000);
    browser.wait(isclickable2,80000);
    await button2.getText().then(function(text){
        console.log(text);
        browser.sleep(3000);
    })
   }


}

module.exports=new LOBDeletion();
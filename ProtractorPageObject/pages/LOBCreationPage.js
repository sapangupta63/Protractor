const { element, browser, Key } = require('protractor');
const { ProtractorExpectedConditions, ExpectedConditions } = require('protractor');

const { protractor } = require('protractor/built/ptor');
var lob=require('../json/LOB.json');
var SelectWrapper = require('../util/select-wrapper.js');
var myselect=new SelectWrapper(by.css(lob.locators.LOBCreationpage.LOBValue));

var EC=ExpectedConditions;
var button=$('#ctl00_PlaceHolderMain_ButtonSection_RptControls_BtnSubmit');
var isclickable=EC.elementToBeClickable(button);

var button1=$('#ctl00_PlaceHolderMain_lnkSite');
var isclickable1=EC.elementToBeClickable(button1);

var button2=$('div#ctl00_PlaceHolderMain_ctl02_PickerOwnerGroupMembers_upLevelDiv.ms-inputuserfield.ms-inputBox');
var isclickable2=EC.elementToBeClickable(button2);

var basepage=require('../pages/BasePage.js');

var LOBCreationpage=function()
{


    this.navigationtoLOB=async function(url)
    {
      if(url==null)
      {
        // protractor .\conf.js --parameters.url.ua[argument 1= protractor, argument 2= conf.js, argument3= --parameters]
        //Below code will run if 3rd parameter in command line is not null
        if(process.argv[3]!=null)
        {
        var urlString=process.argv[3].substring(13); //it will give you url.qa or url.ua
        console.log("get the argument as:: ", urlString);
        if(urlString == "url.qa")
        {
          url="qa";
        }
        else if(urlString == "url.ua")
        {
          url="ua";
        }
        else if(urlString == "url.prod")
        {
          url="prod";
        }
        }
      }
  
  
      switch(url)
      {
        case "qa":
            browser.sleep(2000);
            await   browser.get("http://sites-qa.mercer.com/SitePages/Home.aspx");
          break;
        case "ua":
            browser.sleep(2000);

            await    browser.get("http://sites-ua.mercer.com/SitePages/Home.aspx");
          break;
  
        case "prod":
            browser.sleep(2000);

            await  browser.get("http://sites.mercer.com/SitePages/Home.aspx");
          break;
  
          default:
            browser.sleep(3000);

            browser.get("http://sites-ua.mercer.com/SitePages/Home.aspx");
            break;
  
  
      }
  
  
  
    },
  

    this.loblisthvc=function(url)
    {
      if(url==null)
      {
        // protractor .\conf.js --parameters.url.ua[argument 1= protractor, argument 2= conf.js, argument3= --parameters]
        //Below code will run if 3rd parameter in command line is not null
        if(process.argv[3]!=null)
        {
        var urlString=process.argv[3].substring(13); //it will give you url.qa or url.ua
        console.log("get the argument as:: ", urlString);
        if(urlString == "url.qa")
        {
          url="qa";
        }
        else if(urlString == "url.ua")
        {
          url="ua";
        }
        else if(urlString == "url.prod")
        {
          url="prod";
        }
        }
      }
  
  
      switch(url)
      {
        case "qa":
          browser.get("http://content-qa.mercer.com/Lists/LOB/AllItems.aspx");
          break;
        case "ua":
          browser.get("http://content-ua.mercer.com/Lists/LOB/AllItems.aspx");
          break;
  
        case "prod":
          browser.get("http://content.mercer.com/Lists/LOB/AllItems.aspx");
          break;
  
          default:
            browser.get("http://content-qa.mercer.com/Lists/LOB/AllItems.aspx");
            break;
  
  
      }
  
  
  
    },
    
  this.lobhover=async function()
  {
    await  browser.actions().mouseMove(element(by.css(lob.locators.LOBCreationpage.LOBHover))).perform();
    await  browser.actions().click(element(by.css(lob.locators.LOBCreationpage.LOBHover))).perform();
    var button1=$(`a[title='EH+B Global']`);
    var isSelectable=EC.visibilityOf(button1);
    browser.wait(isSelectable,80000);
    await element(by.xpath(lob.locators.LOBCreationpage.LOBLink)).click();
    browser.sleep(3000);
    await element(by.css(lob.locators.LOBCreationpage.LOBFirstcell)).click();
    browser.sleep(3000);
    await element(by.css(lob.locators.LOBCreationpage.LOBRibbon)).click();

 },

 this.lobdelete=async function()
 {
    var button4=element(by.xpath(`//span[contains(text(),'Delete Item')]`));
    var isClickable3=EC.visibilityOf(button4);
    browser.wait(isClickable3,80000);

    await element(by.xpath(lob.locators.LOBCreationpage.LOBDelete)).click();
    browser.sleep(4000);

    //await basepage.getAlert();
    // browser.switchTo().alert().then(function(alert){
    //     alert.accept();
    // });
    // browser.sleep(4000);

 },

this.lobcreation=async function()
{
  
await element(by.linkText(lob.locators.LOBCreationpage.LOBlinktext)).click();
},

this.lobTitle=async function(title)
{
    await element(by.css(lob.locators.LOBCreationpage.LOBTitle)).sendKeys(title);
},

this.lobURL=async function(url)
{
    await  element(by.css(lob.locators.LOBCreationpage.LOBURL)).sendKeys(url);
},
this.lobtemplate=async function()
{
    await element(by.linkText(lob.locators.LOBCreationpage.LOBTemplate)).click();

},
this.lobv2=async function(url)
{   browser.sleep(4000);
    await  element(by.css(lob.locators.LOBCreationpage.LOBV2)).click();
},
this.lobcreate=async function()
{
    await element(by.css(lob.locators.LOBCreationpage.LOBCreate)).click();
},

this.lobgroup=async function(owner)
{
    browser.wait(isclickable2,80000);
    await button2.sendKeys(Key.chord(Key.CONTROL,'a'));
    await button2.sendKeys(Key.DELETE);
    await button2.sendKeys(owner);
    

},
this.lobsubmit=async function()
{
    
    browser.wait(isclickable,80000);
    await button.click();
   // await element(by.css(lob.locators.LOBCreationpage.LOBSubmit)).click();
},

this.lobselect=async function(lob)
{
    //browser.wait(isselectable,80000);
    var button1=$('#ctl00_PlaceHolderMain_ddlSiteTypeValue');
    var isSelectable=EC.visibilityOf(button1);
    browser.wait(isSelectable,80000);
    await myselect.selectByText(lob);
},
this.lobupdate=async function()
{
    await element(by.css(lob.locators.LOBCreationpage.LOBUpdate)).click();
},

this.NEWLOB=async function()
{
    browser.wait(isclickable1,80000);
    await button1.click();
    browser.sleep(3000);
    return require('./LOBDeletionPage.js');

   // await element(by.css(lob.locators.LOBCreationpage.NEWLOB)).click();
}


}
module.exports=new LOBCreationpage();
var TS=require('../json/Teamsite.json');
const { element, browser } = require('protractor');
require('dotenv').config();

var TeamsiteGlobalPage= function()
{

this.userName = function()
{
  
//return element(by.css(TS.locators.languagepage.usrName));
var newtext1;
var firstName;
var secondName;
var pm;

return element(by.css(TS.locators.languagepage.usrName)).getText().then(function(text){
    newtext1 = text.toLowerCase();
   firstName=newtext1.split(",")[1];
   secondName=newtext1.split(",")[0];
   console.log(firstName+"-"+secondName);
   pm=firstName+"-"+secondName;
   return pm;
 })


  },

  this.navigationtoURL=function(url)
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
        browser.get("http://teamsites-qa.mercer.com/default.aspx");
        break;
      case "ua":
        browser.get("http://teamsites-ua.mercer.com/default.aspx");
        break;

      case "prod":
        browser.get("http://teamsites.mercer.com/default.aspx");
        break;

        default:
          browser.get("http://teamsites-ua.mercer.com/default.aspx");
          break;


    }



  }




};


module.exports=new TeamsiteGlobalPage();

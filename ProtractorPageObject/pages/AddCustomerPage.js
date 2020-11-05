const { element, browser } = require("protractor");
var OR=require('../json/OR.json');

var AddCustomerPage=function()
{
  this.addCustomer= function()
  {
   // element(by.buttonText('Add Customer')).click();
    element(by.buttonText(OR.locators.addCustomerdetailspage.addCustomerbtn)).click();
    browser.sleep(2000);
    
    return this;
  }

this.addCustomerInfo=function(fName,lName,postCode)
{
  //  element(by.model('fName')).sendKeys(fName);
  element(by.model(OR.locators.addCustomerdetailspage.fName)).sendKeys(fName);
  browser.sleep(2000);

 //   element(by.model('lName')).sendKeys(lName);
 element(by.model(OR.locators.addCustomerdetailspage.lName)).sendKeys(lName);
 browser.sleep(2000);

 //   element(by.model('postCd')).sendKeys(postCode);
 element(by.model(OR.locators.addCustomerdetailspage.postCd)).sendKeys(postCode);
 browser.sleep(2000);

   // element(by.css('.btn.btn-default')).click();
   element(by.css(OR.locators.addCustomerdetailspage.addCustomer)).click();
    var alert=browser.switchTo().alert();
    alert.getText().then(function(text){
        console.log("Message : "+text);
    })
    alert.accept();
  browser.sleep(2000);
  return this;
}



var selectWrapper=require('../util/select-wrapper.js');
var myselect=new selectWrapper(by.id('userSelect'));
var myselect1=new selectWrapper(by.id('currency'));

this.openAccount=function()
{
    element(by.buttonText('Open Account')).click();
    browser.sleep(2000);
    return this;
}

this.openAccountInfo=function(customer,currency)
{
    
    myselect.selectByText(customer);
    browser.sleep(2000);

    myselect1.selectByText(currency);
    browser.sleep(2000);

    element(by.buttonText('Process')).click();
    browser.sleep(2000);

    var alert=browser.switchTo().alert();
    alert.getText().then(function(text){
        console.log("Message : "+text);
    })
    alert.accept();
  browser.sleep(2000);
  return this;
}

this.validateCustomers=function()
{
    element(by.buttonText('Customers')).click();
    browser.sleep(2000);

    element(by.model('searchCustomer')).sendKeys("Kamal");
    browser.sleep(2000);

    var firstName=element(by.repeater('cust in Customers').row(0).column('cust.fName'));
    firstName.getText().then(function(text){

        console.log(text);
    })
    expect(firstName.getText()).toEqual("Kamal");
  browser.sleep(2000);
  return this;

}

}

module.exports=new AddCustomerPage();




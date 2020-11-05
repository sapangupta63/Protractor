var selectWrapper=require('../../select-wrapper.js')
var myselect=new selectWrapper(by.id('userSelect'));
var myselect1=new selectWrapper(by.id('currency'));

describe("Automating Bank Login Functionality",function(){

it("Login to Bank Account",function(){

browser.get("http://www.way2automation.com/angularjs-protractor/banking/#/login");
element(by.buttonText('Bank Manager Login')).click();




})

it("Validate Add Customer",function(){
    element(by.buttonText('Add Customer')).click();
    element(by.model('fName')).sendKeys("Kamal");
    element(by.model('lName')).sendKeys("Hasan");
    element(by.model('postCd')).sendKeys("110090");
    element(by.css('.btn.btn-default')).click();
    var alert=browser.switchTo().alert();
    alert.getText().then(function(text){
        console.log("Message : "+text);
    })
    alert.accept();
  browser.sleep(2000);
})

it("open account",function(){

    element(by.buttonText('Open Account')).click();
    myselect.selectByText("Kamal Hasan");
    myselect1.selectByText("Dollar");
    element(by.buttonText('Process')).click();
    var alert=browser.switchTo().alert();
    alert.getText().then(function(text){
        console.log("Message : "+text);
    })
    alert.accept();
  browser.sleep(2000);

})

it("validate customers",function(){

    element(by.buttonText('Customers')).click();
    element(by.model('searchCustomer')).sendKeys("Kamal");
    var firstName=element(by.repeater('cust in Customers').row(0).column('cust.fName'));
    firstName.getText().then(function(text){

        console.log(text);
    })
    expect(firstName.getText()).toEqual("Kamal");
  browser.sleep(8000);

})


    


})
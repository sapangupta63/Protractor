var selectWrapper=require('../../select-wrapper.js')
var myselect=new selectWrapper(by.id('userSelect'));
describe("Automating Customer Login Functionality",function(){

it("Login to Customer Account",function(){

browser.get("http://www.way2automation.com/angularjs-protractor/banking/#/login");
element(by.buttonText('Customer Login')).click();
myselect.selectByText('Harry Potter');
element(by.buttonText('Login')).click();


})


it("Deposit to Customer Account",function(){

   
    element(by.buttonText('Deposit')).click();
  
    element(by.model('amount')).sendKeys("1000");
    element(by.css('.btn.btn-default')).click();
    element(by.binding('message')).getText().then(function(text){
    console.log(text);


    })
    expect(element(by.binding('message')).getText()).toEqual("Deposit Successful");
    
    })
    


})
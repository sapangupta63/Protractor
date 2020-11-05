describe("Handling dropdown functionality",function(){
it("handling dropdown functionality",function(){
    browser.ignoreSynchronization=true;
browser.get("http://www.way2automation.com/angularjs-protractor/banking/#/login");
element(by.buttonText("Customer Login")).click();
var expected_title=browser.getTitle();
expected_title.then(function(text){

console.log(text);
expect(expected_title).toContain("Protractor practice");

element.all(by.css("#userSelect option")).then(function(items){
console.log(items.length);
for(var i=0;i<items.length;i++)
{
    items[i].getText().then(function(text){
    console.log(text);

    });
}

for(var i=0;i<items.length;i++)
{
    items[i].getAttribute('value').then(function(text){
    console.log(text);

    });
}

element(by.model("custId")).element(by.css("[value='2']")).click();
element(by.buttonText("Login")).click();
element(by.binding("user")).getText().then(function(){
console.log(text);


});

});

});


});




});
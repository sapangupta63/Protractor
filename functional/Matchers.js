describe("Matching functionality",function(){
var title;
beforeEach(function(){
browser.get("http://www.way2automation.com/angularjs-protractor/calc/");
title=browser.getTitle();
});

it("validating exact title",function(){
title.then(function(text){
console.log(text);
expect(title).toEqual("Protractor practice website - Calculator");
});
});

it("validating title should not match",function(){
title.then(function(text){
    console.log(text);
    expect(title).not.toEqual("Protractornew practice website - Calculator");

});
});

it("validating partial title match",function(){
    title.then(function(text){
        console.log(text);
        expect(title).toMatch("Protractor");
});
});
});